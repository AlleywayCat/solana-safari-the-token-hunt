// queue.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MetaplexQueueProcessor } from './processors/metaplex-queue.processor';
import { CoinGeckoQueueProcessor } from './processors/coingecko-queue.processor';
import { MetaplexModule } from '../metaplex/metaplex.module';
import { CoinGeckoModule } from '../coingecko/coingecko.module';

@Module({
  imports: [
    ConfigModule,
    MetaplexModule,
    CoinGeckoModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('QUEUE_HOST') || 'localhost',
          port: configService.get('QUEUE_PORT') || 6379,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      {
        name: 'metaplexQueue',
      },
      {
        name: 'coingeckoQueue',
      },
    ),
  ],
  providers: [MetaplexQueueProcessor, CoinGeckoQueueProcessor],
  exports: [BullModule],
})
export class QueueModule {}
