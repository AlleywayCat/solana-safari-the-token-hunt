import { Injectable, Logger, Inject } from '@nestjs/common';
import { PublicKey } from '@solana/web3.js';
import { Metaplex, NftWithToken, Metadata } from '@metaplex-foundation/js';
import { SolanaRpcError } from '../solana/errors/solana-error';
import { METAPLEX_INSTANCE } from '../../shared/constants/constants';
import { TokenMetadata } from './interfaces/token-metadata.interface';

@Injectable()
export class MetaplexService {
  private readonly logger = new Logger(MetaplexService.name);

  constructor(@Inject(METAPLEX_INSTANCE) private readonly metaplex: Metaplex) {}

  async getTokenMetadata(mints: string[]): Promise<TokenMetadata[]> {
    const startTime = Date.now();
    this.logger.log(`Starting to fetch metadata for ${mints.length} mints`);

    try {
      const metadatas = await this.metaplex
        .nfts()
        .findAllByMintList({ mints: mints.map((mint) => new PublicKey(mint)) });

      const tokensWithMetadata = (
        await Promise.all(
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
        )
      ).filter((token) => token !== null);

      this.logger.log(
        `Successfully fetched metadata for ${tokensWithMetadata.length} mints in ${Date.now() - startTime} ms`,
      );

      return tokensWithMetadata;
    } catch (error) {
      this.logger.error(
        `Failed to fetch metadata for mints: ${mints.join(', ')}`,
        error.stack,
      );
      throw new SolanaRpcError(error.message, mints.join(', '));
    }
  }
}
