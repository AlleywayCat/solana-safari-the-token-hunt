// metaplex.processor.ts
import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { WorkerHostProcessor } from './worker-host.processor';
import { MetaplexService } from '../../metaplex/metaplex.service';
import { TokenMetadata } from '../../metaplex/interfaces/token-metadata.interface';

@Processor('metaplexQueue')
@Injectable()
export class MetaplexQueueProcessor extends WorkerHostProcessor {
  constructor(private readonly metaplexService: MetaplexService) {
    super();
  }

  async process(job: Job<{ mints: string[] }>): Promise<TokenMetadata[]> {
    const { mints } = job.data;
    try {
      switch (job.name) {
        case 'process-metadata':
          return await this.metaplexService.retryFetchMetadataBatch(mints);
        default:
          throw new Error(`Unknown job name: ${job.name}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process job ${job.name}: ${error.message}`);
      throw error;
    }
  }
}
