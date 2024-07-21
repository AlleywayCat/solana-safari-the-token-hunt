import { Module, forwardRef } from '@nestjs/common';
import { MetaplexService } from './metaplex.service';
import { SolanaModule } from '../solana/solana.module';
import { BullModule } from '@nestjs/bullmq';
import {
  METAPLEX_INSTANCE,
  SOLANA_CONNECTION,
} from '../../shared/constants/constants';
import { Metaplex } from '@metaplex-foundation/js';
import { Connection } from '@solana/web3.js';
import { MetaplexQueueProcessor } from '../../../worker/queue/processors/metaplex-queue.processor';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    forwardRef(() => SolanaModule),
    BullModule.registerQueue({
      name: 'metaplexQueue',
    }),
    CacheModule,
  ],
  providers: [
    MetaplexService,
    {
      provide: METAPLEX_INSTANCE,
      useFactory: async (connection: Connection): Promise<Metaplex> => {
        return new Metaplex(connection);
      },
      inject: [SOLANA_CONNECTION],
    },
    MetaplexQueueProcessor,
  ],
  exports: [MetaplexService, METAPLEX_INSTANCE],
})
export class MetaplexModule {}
