import { Module } from '@nestjs/common';
import { TokenService } from './token.service';
import { TokenController } from './token.controller';
import { SolanaService } from '../solana/solana.service';
import { CoinGeckoService } from '../../services/coingecko/coingecko.service';
import { MetaplexService } from '../metaplex/metaplex.service';
import { SolanaModule } from '../solana/solana.module';
import { MetaplexModule } from '../metaplex/metaplex.module';

@Module({
  imports: [SolanaModule, MetaplexModule],
  controllers: [TokenController],
  providers: [TokenService, SolanaService, CoinGeckoService, MetaplexService],
})
export class TokenModule {}
