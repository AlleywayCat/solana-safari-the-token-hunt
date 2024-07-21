import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  Metaplex,
  NftWithToken,
  Metadata,
  chunk,
} from '@metaplex-foundation/js';
import { PublicKey } from '@solana/web3.js';
import { METAPLEX_INSTANCE } from '../../shared/constants/constants';
import { TokenMetadata } from './interfaces/token-metadata.interface';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import { SolanaRpcError } from '../solana/errors/solana-error';

@Injectable()
export class MetaplexService {
  private readonly logger = new Logger(MetaplexService.name);
  private readonly BATCH_SIZE = 50;
  private readonly CACHE_TTL = 3600; // Cache TTL in seconds (e.g., 1 hour)
  private readonly queueEvents: QueueEvents;

  constructor(
    @Inject(METAPLEX_INSTANCE) private readonly metaplex: Metaplex,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectQueue('metaplexQueue') private readonly metadataQueue: Queue,
  ) {
    this.queueEvents = new QueueEvents('metaplexQueue');
  }

  async getTokenMetadata(mints: string[]): Promise<TokenMetadata[]> {
    const startTime = Date.now();
    this.logger.log(`Starting to fetch metadata for ${mints.length} mints`);

    try {
      const mintBatches = chunk(mints, this.BATCH_SIZE);

      const tokensWithMetadata = await Promise.all(
        mintBatches.map((batch) => this.getMetadataForBatch(batch)),
      );

      const flattenedTokens = tokensWithMetadata.flat();

      this.logger.log(
        `Successfully fetched metadata for ${flattenedTokens.length} mints in ${Date.now() - startTime} ms`,
      );

      return flattenedTokens;
    } catch (error) {
      this.logger.error(
        `Failed to fetch metadata for mints: ${mints.join(', ')}`,
        error.stack,
      );
      throw new SolanaRpcError(error.message, mints.join(', '));
    }
  }

  private async getMetadataForBatch(mints: string[]): Promise<TokenMetadata[]> {
    const cachedMetadata: TokenMetadata[] = [];
    const uncachedMints: string[] = [];

    await Promise.all(
      mints.map(async (mint) => {
        const cachedData = await this.cacheManager.get<TokenMetadata>(mint);
        if (cachedData) {
          cachedMetadata.push(cachedData);
        } else {
          uncachedMints.push(mint);
        }
      }),
    );

    if (uncachedMints.length > 0) {
      const freshMetadata = await this.processUncachedMints(uncachedMints);
      await this.cacheMetadata(freshMetadata);
      cachedMetadata.push(...freshMetadata);
    }

    return cachedMetadata;
  }

  private async processUncachedMints(
    mints: string[],
  ): Promise<TokenMetadata[]> {
    try {
      const job = await this.metadataQueue.add('process-metadata', { mints });
      const freshMetadata = await job.waitUntilFinished(this.queueEvents);
      return freshMetadata;
    } catch (error) {
      this.logger.error(
        `Failed to process metadata for mints: ${mints.join(', ')}`,
        error.stack,
      );
      throw error;
    }
  }

  private async cacheMetadata(metadata: TokenMetadata[]): Promise<void> {
    await Promise.all(
      metadata.map((token) =>
        this.cacheManager.set(token.mint, token, this.CACHE_TTL),
      ),
    );
  }

  async retryFetchMetadataBatch(
    mints: string[],
    retries = 3,
  ): Promise<TokenMetadata[]> {
    try {
      return await this.fetchMetadataBatch(mints);
    } catch (error) {
      if (retries > 0) {
        this.logger.warn(
          `Retrying fetchMetadataBatch for mints: ${mints.join(', ')}. Retries left: ${retries - 1}`,
        );
        return this.retryFetchMetadataBatch(mints, retries - 1);
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
    try {
      const metadatas = await this.metaplex
        .nfts()
        .findAllByMintList({ mints: mints.map((mint) => new PublicKey(mint)) });

      const tokensWithMetadata = await Promise.all(
        metadatas.map(async (metadata) => {
          if (metadata?.model === 'metadata') {
            const tokenWithMetadata = (await this.metaplex
              .nfts()
              .load({ metadata })) as NftWithToken | Metadata;

            return {
              mint: tokenWithMetadata.address.toBase58(),
              name:
                tokenWithMetadata?.json?.name ?? tokenWithMetadata.name ?? '',
              symbol:
                tokenWithMetadata?.json?.symbol ??
                tokenWithMetadata.symbol ??
                '',
              image: tokenWithMetadata?.json?.image ?? null,
            };
          }
          return null;
        }),
      );

      return tokensWithMetadata.filter((token) => token !== null);
    } catch (error) {
      this.logger.error(
        `Failed to fetch metadata for batch: ${mints.join(', ')}`,
        error.stack,
      );
      throw error;
    }
  }
}
