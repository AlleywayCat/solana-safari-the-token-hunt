import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { TokenModule } from './token/token.module';

@Module({
  imports: [ConfigModule, TokenModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
