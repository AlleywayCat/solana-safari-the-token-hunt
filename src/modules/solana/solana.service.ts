import { Injectable, Logger, Inject } from '@nestjs/common';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { SolBalanceDto } from './dto/sol-balance.dto';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { ParsedTokenAccount } from './interfaces/parsed-token-account.interface';
import { SolanaRpcError, SolanaParseError } from './errors/solana-error';
import { SOLANA_CONNECTION } from '../../shared/constants/constants';
import { MetaplexService } from '../metaplex/metaplex.service';

@Injectable()
export class SolanaService {
  private readonly logger = new Logger(SolanaService.name);
  private readonly tokenProgramId: PublicKey;

  constructor(
    @Inject(SOLANA_CONNECTION) private readonly connection: Connection,
    private readonly metaplexService: MetaplexService,
  ) {
    this.tokenProgramId = TOKEN_PROGRAM_ID;
  }

  async getSolBalance(publicKey: string): Promise<SolBalanceDto> {
    const startTime = Date.now();
    this.logger.log(`Fetching SOL balance for ${publicKey}`);

    try {
      const pubKey = new PublicKey(publicKey);
      const balance = await this.connection.getBalance(pubKey);
      const solBalance = balance / LAMPORTS_PER_SOL; // Convert lamports to SOL

      this.logger.log(
        `Fetched SOL balance for ${publicKey}: ${solBalance} SOL (Time taken: ${Date.now() - startTime} ms)`,
      );

      return {
        publicKey,
        balance: solBalance,
      };
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
    mintAddress?: string,
  ): Promise<ParsedTokenAccount[]> {
    const startTime = Date.now();
    this.logger.log(`Fetching token accounts for ${publicKey}`);

    try {
      const pubKey = new PublicKey(publicKey);
      const filter: { programId: PublicKey; mint?: PublicKey } = {
        programId: this.tokenProgramId,
      };

      if (mintAddress) {
        filter.mint = new PublicKey(mintAddress);
      }

      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        pubKey,
        filter,
      );

      const parsedAccounts = tokenAccounts.value.map((account) =>
        this.parseTokenAccount(account.account.data.parsed.info),
      );

      this.logger.log(
        `Fetched ${parsedAccounts.length} token accounts for ${publicKey} (Time taken: ${Date.now() - startTime} ms)`,
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

  async getTokensWithMetadata(publicKey: string): Promise<any> {
    const tokenAccounts = await this.getTokenAccountsByOwner(publicKey);

    const mintAddresses = tokenAccounts.map((token) => token.mintAddress);
    const tokenMetadata =
      await this.metaplexService.getTokenMetadata(mintAddresses);

    const tokens = tokenAccounts.map((token) => {
      const metadata = tokenMetadata.find(
        (meta) => meta.mint === token.mintAddress,
      );

      return {
        mintAddress: token.mintAddress,
        balance: token.amount,
        decimals: token.decimals,
        ...metadata,
      };
    });

    const totalValue = tokens.reduce(
      (acc, token) => acc + parseFloat(token.balance),
      0,
    );

    return {
      tokens,
      totalValue: totalValue,
    };
  }

  private parseTokenAccount(info: any): ParsedTokenAccount {
    try {
      return {
        mintAddress: info.mint,
        amount: info.tokenAmount.amount,
        decimals: info.tokenAmount.decimals,
      };
    } catch (error) {
      this.logger.error(`Failed to parse token account info`, error.stack);
      throw new SolanaParseError(error.message, info.mint);
    }
  }
}
