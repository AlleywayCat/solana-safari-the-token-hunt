import { Injectable, Logger } from '@nestjs/common';
import { SolanaService } from '../solana/solana.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import { TokenResponseDto } from './dto/token-response.dto';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly metaplexQueueEvents: QueueEvents;
  private readonly coingeckoQueueEvents: QueueEvents;

  constructor(
    private readonly solanaService: SolanaService,
    @InjectQueue('metaplexQueue') private readonly metaplexQueue: Queue,
    @InjectQueue('coingeckoQueue') private readonly coingeckoQueue: Queue,
  ) {
    this.metaplexQueueEvents = new QueueEvents('metaplexQueue');
    this.coingeckoQueueEvents = new QueueEvents('coingeckoQueue');
  }

  async getTokens(publicKey: string): Promise<TokenResponseDto> {
    const [balanceResult, tokenAccountsResult] = await Promise.all([
      this.solanaService.getSolBalance(publicKey),
      this.solanaService.getTokenAccountsByOwner(publicKey),
    ]);

    const job = await this.metaplexQueue.add('process-metadata', {
      mints: tokenAccountsResult.map((account) => account.mintAddress),
    });

    const tokenMetadata = await job.waitUntilFinished(this.metaplexQueueEvents);

    const tokenSymbols = tokenMetadata
      .map((metadata) => metadata.symbol.toLowerCase())
      .filter((symbol) => symbol); // Filter out empty or invalid symbols

    if (tokenSymbols.length === 0) {
      return {
        tokens: [],
        totalValue: '0.00',
      };
    }

    const priceJob = await this.coingeckoQueue.add('fetch-prices', {
      tokenIds: tokenSymbols,
    });

    const tokenPrices = await priceJob.waitUntilFinished(
      this.coingeckoQueueEvents,
    );

    const tokens = tokenMetadata.map((metadata) => {
      const symbolLowerCase = metadata.symbol.toLowerCase();
      const price = tokenPrices[symbolLowerCase]?.usd || 0;

      if (price === 0) {
        this.logger.warn(
          `Price for ${metadata.symbol} not found or is 0. This might be due to missing mapping or unsupported token.`,
        );
      }

      const account = tokenAccountsResult.find(
        (account) => account.mintAddress === metadata.mint,
      );

      const adjustedBalance =
        parseFloat(account.amount) / Math.pow(10, account.decimals);

      return {
        mintAddress: metadata.mint,
        name: metadata.name,
        symbol: metadata.symbol,
        imageUrl: metadata.image,
        decimals: account.decimals,
        balance: adjustedBalance.toFixed(account.decimals),
        price,
      };
    });

    const totalValue = tokens.reduce(
      (acc, token) => acc + parseFloat(token.balance) * token.price,
      0,
    );

    return {
      tokens,
      totalValue: totalValue.toFixed(2),
    };
  }
}
