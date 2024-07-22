import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CoinGeckoResponse } from './interfaces/coingecko-response.interface';

@Injectable()
export class CoinGeckoService {
  private readonly logger = new Logger(CoinGeckoService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly priceEndpoint: string;
  private readonly coinsListEndpoint: string;
  private readonly cacheTTL = 3600; // Cache TTL in seconds (1 hour)
  private readonly MAX_REQUESTS = 500; // Maximum requests per minute
  private readonly TOKEN_BUCKET_INTERVAL = 60000; // 1 minute interval
  private readonly MAX_RETRIES = 3; // Maximum retries for failed requests
  private readonly BATCH_SIZE = 50; // Number of tokens to request in each batch

  private tokens = this.MAX_REQUESTS; // Initial tokens
  private lastRefill = Date.now();
  private retryAfter = 0; // Retry-After delay in milliseconds
  private symbolToIdMap: { [symbol: string]: string } = {};

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.apiUrl = this.configService.get<string>('COINGECKO_API_URL');
    this.apiKey = this.configService.get<string>('COINGECKO_API_KEY');
    this.priceEndpoint = this.configService.get<string>(
      'COINGECKO_PRICE_ENDPOINT',
    );
    this.coinsListEndpoint = this.configService.get<string>(
      'COINGECKO_COINS_LIST_ENDPOINT',
    );
  }

  async getTokenPrices(symbols: string[]): Promise<CoinGeckoResponse> {
    try {
      const cacheKey = `token_prices_${symbols.join('_')}`;
      const cachedPrices =
        await this.cacheManager.get<CoinGeckoResponse>(cacheKey);

      if (cachedPrices) {
        return cachedPrices;
      }

      if (Object.keys(this.symbolToIdMap).length === 0) {
        await this.fetchAndCreateSymbolToIdMap();
      }

      const tokenIds = symbols
        .map((symbol) => this.symbolToIdMap[symbol.toLowerCase()])
        .filter((id) => id !== undefined);

      if (tokenIds.length === 0) {
        this.logger.warn(
          'No valid CoinGecko IDs found for the provided symbols',
        );
        return {};
      }

      const tokenPrices = await this.fetchPricesInBatches(tokenIds);

      if (!tokenPrices) {
        throw new Error('Invalid tokenIds data');
      }

      await this.cacheManager.set(cacheKey, tokenPrices, this.cacheTTL);

      return tokenPrices;
    } catch (error) {
      this.logger.error(
        'Failed to fetch token prices from CoinGecko',
        error.stack,
      );
      throw error;
    }
  }

  private async fetchAndCreateSymbolToIdMap(): Promise<void> {
    const cacheKey = 'symbol_to_id_map';
    const cachedMap = await this.cacheManager.get<{ [symbol: string]: string }>(
      cacheKey,
    );

    if (cachedMap) {
      this.symbolToIdMap = cachedMap;
      return;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}${this.coinsListEndpoint}`, {
          headers: {
            'x-cg-pro-api-key': this.apiKey,
          },
        }),
      );

      const coinList = response.data;

      this.symbolToIdMap = coinList.reduce((acc, coin) => {
        acc[coin.symbol.toLowerCase()] = coin.id;
        return acc;
      }, {});

      await this.cacheManager.set(cacheKey, this.symbolToIdMap, this.cacheTTL);
    } catch (error) {
      this.logger.error(
        'Failed to fetch coin list from CoinGecko',
        error.stack,
      );
      throw error;
    }
  }

  private async fetchPricesInBatches(
    ids: string[],
  ): Promise<CoinGeckoResponse> {
    const batchedIds = this.chunkArray(ids, this.BATCH_SIZE);
    const results = await Promise.all(
      batchedIds.map((batch) => this.fetchPricesWithRetries(batch)),
    );
    return Object.assign({}, ...results);
  }

  private async fetchPricesWithRetries(
    ids: string[],
    retries = this.MAX_RETRIES,
  ): Promise<CoinGeckoResponse> {
    try {
      return await this.fetchPrices(ids);
    } catch (error) {
      if (retries > 0) {
        const retryAfterHeader = error.response?.headers?.get('Retry-After');
        if (retryAfterHeader) {
          this.retryAfter = parseInt(retryAfterHeader, 10) * 1000;
          this.logger.warn(
            `Received Retry-After header: waiting for ${this.retryAfter} ms`,
          );
          await this.delay(this.retryAfter);
        }

        this.logger.warn(
          `Retrying fetch for ids: ${ids.join(', ')} - Retries left: ${retries}`,
        );
        await this.delay(500); // Adding a delay before retry
        return this.fetchPricesWithRetries(ids, retries - 1);
      } else {
        this.logger.error(
          `Failed to fetch prices after retries for ids: ${ids.join(', ')}`,
        );
        throw error;
      }
    }
  }

  private async fetchPrices(ids: string[]): Promise<CoinGeckoResponse> {
    const idsStr = ids.join(',');
    await this.consumeToken();
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}${this.priceEndpoint}`, {
          params: {
            ids: idsStr,
            vs_currencies: 'usd',
          },
          headers: {
            'x-cg-pro-api-key': this.apiKey,
          },
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch prices for IDs: ${idsStr}`,
        error.stack,
      );
      throw error;
    }
  }

  private async consumeToken() {
    while (this.tokens <= 0) {
      this.refillTokens();
      await this.delay(100); // Wait for tokens to refill
    }
    this.tokens -= 1;
  }

  private refillTokens() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed > this.TOKEN_BUCKET_INTERVAL) {
      this.tokens = this.MAX_REQUESTS;
      this.lastRefill = now;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(array.length / size) }, (v, i) =>
      array.slice(i * size, i * size + size),
    );
  }
}
