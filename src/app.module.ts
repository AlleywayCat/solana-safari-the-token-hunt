import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from './config/config.module';
import { TokenModule } from './modules/token/token.module';
import { SolanaModule } from './modules/solana/solana.module';
import { MetaplexModule } from './modules/metaplex/metaplex.module';
import { CoinGeckoModule } from './modules/coingecko/coingecko.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    CacheModule.register({
      ttl: 60,
      max: 100,
      isGlobal: true,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL'),
          limit: config.get<number>('THROTTLE_LIMIT'),
        },
      ],
    }),
    ConfigModule,
    TokenModule,
    SolanaModule,
    MetaplexModule,
    CoinGeckoModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
