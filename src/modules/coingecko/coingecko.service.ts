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
  private readonly cacheTTL = 3600; // Cache TTL in seconds (1 hour)
  private symbolToIdMap: { [symbol: string]: string } = {};

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.apiUrl = this.configService.get<string>('COINGECKO_API_URL');
    this.apiKey = this.configService.get<string>('COINGECKO_API_KEY');
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

      this.logger.debug(`Token IDs: ${tokenIds.join(', ')}`);

      const tokenPrices = await this.fetchPrices(tokenIds);

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
        this.httpService.get(`${this.apiUrl}/coins/list`, {
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

      this.logger.debug(
        `Symbol to ID map created: ${JSON.stringify(this.symbolToIdMap)}`,
      );

      await this.cacheManager.set(cacheKey, this.symbolToIdMap, this.cacheTTL);
    } catch (error) {
      this.logger.error(
        'Failed to fetch coin list from CoinGecko',
        error.stack,
      );
      throw error;
    }
  }

  async fetchPrices(ids: string[]): Promise<CoinGeckoResponse> {
    const idsStr = ids.join(',');
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/simple/price`, {
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
}
