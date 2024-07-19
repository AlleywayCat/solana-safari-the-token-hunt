import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SolanaService } from './solana.service';
import { Connection } from '@solana/web3.js';
import {
  SOLANA_CONNECTION,
  SOLANA_RPC_URL,
} from '../../shared/constants/constants';

@Module({
  imports: [ConfigModule],
  providers: [
    SolanaService,
    {
      provide: SOLANA_CONNECTION,
      useFactory: async (configService: ConfigService) => {
        return new Connection(configService.get<string>(SOLANA_RPC_URL));
      },
      inject: [ConfigService],
    },
  ],
  exports: [SolanaService, SOLANA_CONNECTION],
})
export class SolanaModule {}
