import { Injectable, Logger, Inject } from '@nestjs/common';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SolanaRpcError } from './errors/solana-error';
import { SOLANA_CONNECTION } from '../../shared/constants/constants';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { ParsedTokenAccount } from './interfaces/parsed-token-account.interface';

@Injectable()
export class SolanaService {
  private readonly logger = new Logger(SolanaService.name);
  private readonly CACHE_TTL = 3600; // Cache TTL in seconds (e.g., 1 hour)

  constructor(
    @Inject(SOLANA_CONNECTION) private readonly connection: Connection,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getSolBalance(publicKey: string): Promise<number> {
    const cacheKey = `solBalance-${publicKey}`;
    const cachedBalance = await this.cacheManager.get<number>(cacheKey);
    if (cachedBalance) {
      this.logger.log(`Cache hit for SOL balance of ${publicKey}`);
      return cachedBalance;
    }

    try {
      const pubKey = new PublicKey(publicKey);
      const balance = await this.connection.getBalance(pubKey);
      const solBalance = balance / LAMPORTS_PER_SOL; // Convert lamports to SOL

      await this.cacheManager.set(cacheKey, solBalance, this.CACHE_TTL);

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

  async getTokenAccountsByOwner(
    publicKey: string,
  ): Promise<ParsedTokenAccount[]> {
    const cacheKey = `tokenAccounts-${publicKey}`;
    const cachedAccounts =
      await this.cacheManager.get<ParsedTokenAccount[]>(cacheKey);
    if (cachedAccounts) {
      this.logger.log(`Cache hit for token accounts of ${publicKey}`);
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

      const parsedAccounts = tokenAccounts.value.map((account) => ({
        mintAddress: account.account.data.parsed.info.mint,
        amount: account.account.data.parsed.info.tokenAmount.amount,
        decimals: account.account.data.parsed.info.tokenAmount.decimals,
      }));

      await this.cacheManager.set(cacheKey, parsedAccounts, this.CACHE_TTL);

      this.logger.log(
        `Fetched ${parsedAccounts.length} token accounts for ${publicKey}`,
      );
      return parsedAccounts;
    } catch (error) {
      this.logger.error(
        `Failed to get token accounts for ${publicKey}`,
        error.stack,
      );
      throw new SolanaRpcError(error.message, publicKey);
    }
  }
}
