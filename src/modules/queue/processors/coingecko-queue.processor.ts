import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { CoinGeckoService } from '../../coingecko/coingecko.service';
import { Logger } from '@nestjs/common';

@Processor('coingeckoQueue')
export class CoinGeckoQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(CoinGeckoQueueProcessor.name);

  constructor(private readonly coingeckoService: CoinGeckoService) {
    super();
  }

  async process(job: Job<{ tokenIds: string[] }>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}...`);
    const { tokenIds } = job.data;
    if (!tokenIds || !Array.isArray(tokenIds)) {
      this.logger.error(`Job ${job.id} does not have valid tokenIds`);
      throw new Error(`Job ${job.id} does not have valid tokenIds`);
    }
    this.logger.debug(`Processing tokenIds: ${JSON.stringify(tokenIds)}`);
    try {
      return await this.coingeckoService.fetchPrices(tokenIds);
    } catch (error) {
      this.logger.error(`Failed to process job ${job.id}: ${error.message}`);
      throw error;
    }
  }
}
