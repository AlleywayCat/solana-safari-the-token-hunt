import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { CoinGeckoService } from '../../../app/modules/coingecko/coingecko.service';
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

    if (!Array.isArray(tokenIds) || tokenIds.length === 0) {
      const errorMessage = `Job ${job.id} does not have valid tokenIds`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    this.logger.debug(`Processing tokenIds: ${JSON.stringify(tokenIds)}`);

    try {
      const prices = await this.coingeckoService.fetchPrices(tokenIds);
      this.logger.log(`Job ${job.id} completed successfully.`);
      return prices;
    } catch (error) {
      this.logger.error(
        `Failed to process job ${job.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
