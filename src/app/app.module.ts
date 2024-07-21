import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { TokenModule } from './modules/token/token.module';
import { SolanaModule } from './modules/solana/solana.module';
import { MetaplexModule } from './modules/metaplex/metaplex.module';
import { CoinGeckoModule } from './modules/coingecko/coingecko.module';
import { CacheModule } from '@nestjs/cache-manager';
import { QueueModule } from '../worker/queue/queue.module';

@Module({
  imports: [
    CacheModule.register({ ttl: 60, max: 100, isGlobal: true }),
    ConfigModule,
    TokenModule,
    SolanaModule,
    MetaplexModule,
    CoinGeckoModule,
    QueueModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
