import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CoinGeckoService } from './coingecko.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [CoinGeckoService],
  exports: [CoinGeckoService],
})
export class CoinGeckoModule {}
