import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { TokenModule } from './modules/token/token.module';
import { SolanaModule } from './modules/solana/solana.module';

@Module({
  imports: [ConfigModule, TokenModule, SolanaModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
