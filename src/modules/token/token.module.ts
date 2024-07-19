import { Module } from '@nestjs/common';
import { TokenService } from './token.service';
import { TokenController } from './token.controller';
import { SolanaService } from '../solana/solana.service';
import { CoinGeckoService } from '../coingecko/coingecko.service';
import { MetaplexService } from '../metaplex/metaplex.service';
import { SolanaModule } from '../solana/solana.module';
import { MetaplexModule } from '../metaplex/metaplex.module';
import { CoinGeckoModule } from '../coingecko/coingecko.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [SolanaModule, MetaplexModule, CoinGeckoModule, HttpModule],
  controllers: [TokenController],
  providers: [TokenService, SolanaService, CoinGeckoService, MetaplexService],
})
export class TokenModule {}
