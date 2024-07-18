import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { SolBalanceDto } from './dto/sol-balance.dto';

@Injectable()
export class SolanaService {
  private readonly logger = new Logger(SolanaService.name);
  private readonly connection: Connection;

  constructor(private configService: ConfigService) {
    this.connection = new Connection(
      this.configService.get<string>('SOLANA_RPC_URL'),
    );
  }

  async getSolBalance(publicKey: string): Promise<SolBalanceDto> {
    try {
      const pubKey = new PublicKey(publicKey);
      const balance = await this.connection.getBalance(pubKey);

      return {
        publicKey,
        balance: balance / LAMPORTS_PER_SOL, // Convert lamports to SOL
      };
    } catch (error) {
      this.logger.error(
        `Failed to get SOL balance for ${publicKey}`,
        error.stack,
      );
      throw error;
    }
  }
}
