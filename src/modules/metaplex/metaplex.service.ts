import { Injectable, Logger, Inject } from '@nestjs/common';
import { Metaplex, Metadata, Nft, Sft, chunk } from '@metaplex-foundation/js';
import { PublicKey } from '@solana/web3.js';
import { METAPLEX_INSTANCE } from '../../shared/constants/constants';
import { TokenMetadata } from './interfaces/token-metadata.interface';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class MetaplexService {
  private readonly logger = new Logger(MetaplexService.name);
  private readonly BATCH_SIZE = 10;
  private readonly CACHE_TTL = 3600;
  private readonly MAX_REQUESTS = 200;
  private readonly TOKEN_BUCKET_INTERVAL = 60000;
  private readonly MAX_RETRIES = 3;

  private tokens = this.MAX_REQUESTS;
  private lastRefill = Date.now();

  constructor(
    @Inject(METAPLEX_INSTANCE) private readonly metaplex: Metaplex,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getTokenMetadata(mints: string[]): Promise<TokenMetadata[]> {
    this.logger.log(`Starting to fetch metadata for ${mints.length} mints`);

    const start = Date.now();
    try {
      const mintBatches = chunk(mints, this.BATCH_SIZE);
      const tokensWithMetadata = await this.processInParallel(mintBatches);

      const flattenedTokens = tokensWithMetadata.flat();
      this.logger.log(
        `Successfully fetched metadata for ${flattenedTokens.length} mints in ${Date.now() - start} ms`,
      );

      return flattenedTokens;
    } catch (error) {
      this.logger.error(
        `Failed to fetch metadata for mints: ${mints.join(', ')}`,
        error.stack,
      );
      throw new Error(
        `Failed to fetch metadata for mints: ${mints.join(', ')}`,
      );
    }
  }

  private async processInParallel(
    batches: string[][],
  ): Promise<TokenMetadata[][]> {
    const result: TokenMetadata[][] = await Promise.all(
      batches.map(async (batch) => {
        await this.consumeToken();
        return this.getMetadataForBatch(batch);
      }),
    );
    return result;
  }

  private async getMetadataForBatch(mints: string[]): Promise<TokenMetadata[]> {
    const cachedMetadata = await this.getCachedMetadata(mints);
    const uncachedMints = mints.filter((mint, idx) => !cachedMetadata[idx]);

    if (uncachedMints.length > 0) {
      const freshMetadata =
        await this.fetchMetadataBatchWithRetries(uncachedMints);
      await this.cacheMetadata(freshMetadata);
      uncachedMints.forEach(
        (mint, idx) =>
          (cachedMetadata[mints.indexOf(mint)] = freshMetadata[idx]),
      );
    }

    return cachedMetadata.filter(
      (metadata) => metadata !== undefined,
    ) as TokenMetadata[];
  }

  private async getCachedMetadata(
    mints: string[],
  ): Promise<(TokenMetadata | undefined)[]> {
    return await Promise.all(
      mints.map((mint) => this.cacheManager.get<TokenMetadata>(mint)),
    );
  }

  private async cacheMetadata(metadata: TokenMetadata[]): Promise<void> {
    await Promise.all(
      metadata.map((token) =>
        this.cacheManager.set(token.mint, token, this.CACHE_TTL),
      ),
    );
  }

  private async fetchMetadataBatchWithRetries(
    mints: string[],
    retries = this.MAX_RETRIES,
  ): Promise<TokenMetadata[]> {
    try {
      return await this.fetchMetadataBatch(mints);
    } catch (error) {
      if (retries > 0) {
        const retryAfter = error.response?.headers?.get('Retry-After');
        const delayTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 500;
        this.logger.warn(
          `Retrying fetch for mints: ${mints.join(', ')} - Retries left: ${retries}`,
        );
        await this.delay(delayTime);
        return this.fetchMetadataBatchWithRetries(mints, retries - 1);
      } else {
        this.logger.error(
          `Failed to fetch metadata after retries for mints: ${mints.join(', ')}`,
          error.stack,
        );
        throw error;
      }
    }
  }

  private async fetchMetadataBatch(mints: string[]): Promise<TokenMetadata[]> {
    const publicKeyMints = mints.map((mint) => new PublicKey(mint));
    const metadatas = await this.metaplex
      .nfts()
      .findAllByMintList({ mints: publicKeyMints });

    if (!metadatas.length) {
      this.logger.warn('No metadata entries fetched. Verify mint addresses.');
    }

    return await this.loadAdditionalMetadata(metadatas);
  }

  private async loadAdditionalMetadata(
    metadatas: (Metadata | Nft | Sft | null)[],
  ): Promise<TokenMetadata[]> {
    return (
      await Promise.all(
        metadatas.map((meta) => this.loadMetadataWithRetries(meta)),
      )
    ).filter(Boolean) as TokenMetadata[];
  }

  private async loadMetadataWithRetries(
    meta: Metadata | Nft | Sft | null,
    retries = this.MAX_RETRIES,
  ): Promise<TokenMetadata | null> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await this.loadMetadata(meta);
      } catch (error) {
        if (attempt < retries) {
          this.logger.warn(
            `Retrying load for metadata: ${meta?.address.toBase58()} - Attempt ${attempt}`,
          );
          await this.delay(500);
        } else {
          this.logger.error(
            `Failed to load metadata after retries: ${meta?.address.toBase58()}`,
            error.stack,
          );
          return null;
        }
      }
    }
    return null;
  }

  private async loadMetadata(
    meta: Metadata | Nft | Sft | null,
  ): Promise<TokenMetadata | null> {
    if (!meta) return null;

    try {
      if (meta.model === 'metadata') {
        const tokenWithMetadata = await this.metaplex
          .nfts()
          .load({ metadata: meta });
        return {
          mint: tokenWithMetadata.address.toBase58(),
          name: tokenWithMetadata.json?.name ?? tokenWithMetadata.name ?? '',
          symbol:
            tokenWithMetadata.json?.symbol ?? tokenWithMetadata.symbol ?? '',
          image: tokenWithMetadata.json?.image ?? null,
        };
      } else if (meta.model === 'nft' || meta.model === 'sft') {
        return {
          mint: meta.address.toBase58(),
          name: meta.name,
          symbol: meta.symbol,
          image: meta.json?.image ?? null,
        };
      }
      return null;
    } catch (loadError) {
      this.logger.error(
        `Failed to load additional data for metadata: ${meta?.address.toBase58()}`,
        loadError.stack,
      );
      throw loadError; // Re-throw the error to be caught by retry logic
    }
  }

  private async consumeToken() {
    while (this.tokens <= 0) {
      this.refillTokens();
      await this.delay(this.calculateDelay());
    }
    this.tokens -= 1;
  }

  private refillTokens() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed > this.TOKEN_BUCKET_INTERVAL) {
      this.tokens = this.MAX_REQUESTS;
      this.lastRefill = now;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private calculateDelay(): number {
    return Math.max(
      0,
      Math.ceil(this.TOKEN_BUCKET_INTERVAL / this.MAX_REQUESTS),
    );
  }
}
