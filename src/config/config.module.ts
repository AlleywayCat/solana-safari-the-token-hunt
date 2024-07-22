import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validationSchema } from './schemas/validation.schema';

@Module({
  imports: [
    NestConfigModule.forRoot({
      validationSchema,
      isGlobal: true,
    }),
  ],
})
export class ConfigModule {}
