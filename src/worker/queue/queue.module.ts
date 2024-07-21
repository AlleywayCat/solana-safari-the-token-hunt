import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MetaplexQueueProcessor } from './processors/metaplex-queue.processor';
import { CoinGeckoQueueProcessor } from './processors/coingecko-queue.processor';
import { MetaplexModule } from '../../app/modules/metaplex/metaplex.module';
import { CoinGeckoModule } from '../../app/modules/coingecko/coingecko.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    ConfigModule,
    MetaplexModule,
    CoinGeckoModule,
    CacheModule.register({
      isGlobal: true,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST') || 'localhost',
          port: configService.get('REDIS_PORT') || 6379,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'metaplexQueue',
    }),
    BullModule.registerQueue({
      name: 'coingeckoQueue',
    }),
  ],
  providers: [MetaplexQueueProcessor, CoinGeckoQueueProcessor],
})
export class QueueModule {}
