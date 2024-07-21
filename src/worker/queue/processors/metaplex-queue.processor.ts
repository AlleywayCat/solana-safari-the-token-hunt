import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { WorkerHostProcessor } from './worker-host.processor';
import { MetaplexService } from '../../../app/modules/metaplex/metaplex.service';
import { TokenMetadata } from '../../../app/modules/metaplex/interfaces/token-metadata.interface';

@Processor('metaplexQueue')
@Injectable()
export class MetaplexQueueProcessor extends WorkerHostProcessor {
  protected readonly logger = new Logger(MetaplexQueueProcessor.name);

  constructor(private readonly metaplexService: MetaplexService) {
    super();
  }

  async process(job: Job<{ mints: string[] }>): Promise<TokenMetadata[]> {
    const { mints } = job.data;

    if (!Array.isArray(mints) || mints.length === 0) {
      const errorMessage = `Job ${job.id} does not have valid mints`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    this.logger.log(`Processing job ${job.id} of type ${job.name}...`);

    try {
      let result: TokenMetadata[];

      switch (job.name) {
        case 'process-metadata':
          result = await this.metaplexService.retryFetchMetadataBatch(mints);
          break;
        default:
          throw new Error(`Unknown job name: ${job.name}`);
      }

      this.logger.log(`Job ${job.id} completed successfully.`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to process job ${job.id}: ${error.message}`);
      throw error;
    }
  }
}
