import { Module, forwardRef } from '@nestjs/common';
import { MetaplexService } from './metaplex.service';
import { SolanaModule } from '../solana/solana.module';
import {
  METAPLEX_INSTANCE,
  SOLANA_CONNECTION,
} from '../../shared/constants/constants';
import { Metaplex } from '@metaplex-foundation/js';
import { Connection } from '@solana/web3.js';

@Module({
  imports: [forwardRef(() => SolanaModule)],
  providers: [
    MetaplexService,
    {
      provide: METAPLEX_INSTANCE,
      useFactory: async (connection: Connection): Promise<Metaplex> => {
        return new Metaplex(connection, { cluster: 'mainnet-beta' });
      },
      inject: [SOLANA_CONNECTION],
    },
  ],
  exports: [MetaplexService, METAPLEX_INSTANCE],
})
export class MetaplexModule {}
