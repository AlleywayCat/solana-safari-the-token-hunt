import { NestFactory } from '@nestjs/core';
import { QueueModule } from './queue/queue.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(QueueModule);
  await app.init();
  console.log('Worker is running');
}
bootstrap();
