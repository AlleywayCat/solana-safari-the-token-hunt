import { Module } from '@nestjs/common';
import { TokenService } from './token.service';
import { TokenController } from './token.controller';
import { SolanaModule } from '../solana/solana.module';
import { MetaplexModule } from '../metaplex/metaplex.module';
import { CoinGeckoModule } from '../coingecko/coingecko.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [SolanaModule, MetaplexModule, CoinGeckoModule, HttpModule],
  controllers: [TokenController],
  providers: [TokenService],
})
export class TokenModule {}
