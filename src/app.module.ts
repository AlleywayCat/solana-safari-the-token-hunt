import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { TokenModule } from './modules/token/token.module';
import { SolanaModule } from './modules/solana/solana.module';
import { MetaplexModule } from './modules/metaplex/metaplex.module';

@Module({
  imports: [ConfigModule, TokenModule, SolanaModule, MetaplexModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
