import { Injectable, Logger, Inject } from '@nestjs/common';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SOLANA_CONNECTION } from '../../shared/constants/constants';
import { ParsedTokenAccount } from './interfaces/parsed-token-account.interface';
import { SolanaRpcError } from './errors/solana-error';

@Injectable()
export class SolanaService {
  private readonly logger = new Logger(SolanaService.name);
  private readonly CACHE_TTL = 3600; // Cache TTL in seconds (e.g., 1 hour)

  constructor(
    @Inject(SOLANA_CONNECTION) private readonly connection: Connection,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getSolBalance(publicKey: string): Promise<number> {
    try {
      const pubKey = new PublicKey(publicKey);
      const balance = await this.connection.getBalance(pubKey, 'confirmed');
      const solBalance = balance / LAMPORTS_PER_SOL; // Convert lamports to SOL

      this.logger.log(
        `Fetched SOL balance for ${publicKey}: ${solBalance} SOL`,
      );
      return solBalance;
    } catch (error) {
      this.logger.error(
        `Failed to get SOL balance for ${publicKey}`,
        error.stack,
      );
      throw new SolanaRpcError(error.message, publicKey);
    }
  }

  private async getCachedData<T>(cacheKey: string): Promise<T | null> {
    try {
      const cachedData = await this.cacheManager.get<T>(cacheKey);
      if (cachedData) {
        this.logger.log(`Cache hit for ${cacheKey}`);
        return cachedData;
      }
    } catch (error) {
      this.logger.warn(`Failed to get cache for ${cacheKey}: ${error.message}`);
    }
    return null;
  }

  private async setCachedData<T>(cacheKey: string, data: T): Promise<void> {
    try {
      await this.cacheManager.set(cacheKey, data, this.CACHE_TTL);
      this.logger.log(`Cache set for ${cacheKey}`);
    } catch (error) {
      this.logger.warn(`Failed to set cache for ${cacheKey}: ${error.message}`);
    }
  }

  async getTokenAccountsByOwner(
    publicKey: string,
  ): Promise<ParsedTokenAccount[]> {
    const cacheKey = `tokenAccounts-${publicKey}`;
    const cachedAccounts =
      await this.getCachedData<ParsedTokenAccount[]>(cacheKey);
    if (cachedAccounts !== null) {
      return cachedAccounts;
    }

    try {
      const pubKey = new PublicKey(publicKey);
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        pubKey,
        {
          programId: TOKEN_PROGRAM_ID,
        },
      );

      const parsedAccounts = tokenAccounts.value.map((account) => {
        const info = account.account.data.parsed.info;
        return {
          mintAddress: info.mint,
          amount: info.tokenAmount.amount,
          decimals: info.tokenAmount.decimals,
        };
      });

      await this.setCachedData(cacheKey, parsedAccounts);

      this.logger.log(
        `Fetched ${parsedAccounts.length} token accounts for ${publicKey}`,
      );
      return parsedAccounts;
    } catch (error) {
      this.logger.error(
        `Failed to get token accounts for ${publicKey}: ${error.message}`,
      );
      throw new SolanaRpcError(error.message, publicKey);
    }
  }
}
