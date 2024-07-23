import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { CoinGeckoService } from './coingecko.service';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { CoinGeckoResponse } from './interfaces/coingecko-response.interface';

describe('CoinGeckoService', () => {
  let service: CoinGeckoService;
  let httpService: HttpService;
  let cacheManager: any;

  beforeEach(async () => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoinGeckoService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'COINGECKO_API_URL':
                  return 'https://api.coingecko.com/api/v3';
                case 'COINGECKO_API_KEY':
                  return 'test-api-key';
                case 'COINGECKO_PRICE_ENDPOINT':
                  return '/simple/price';
                case 'COINGECKO_COINS_LIST_ENDPOINT':
                  return '/coins/list';
                default:
                  return null;
              }
            }),
          },
        },
        {
          provide: HttpService,
          useValue: createMock<HttpService>(),
        },
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
      ],
    }).compile();

    service = module.get<CoinGeckoService>(CoinGeckoService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTokenPrices', () => {
    const symbols = ['bitcoin', 'ethereum'];
    const cacheKey = `token_prices_${symbols.join('_')}`;
    const cachedPrices: CoinGeckoResponse = {
      bitcoin: { usd: 45000 },
      ethereum: { usd: 3000 },
    };

    it('fetches token prices successfully when cache is empty', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValueOnce(null);
      jest
        .spyOn(httpService, 'get')
        .mockReturnValueOnce(of({ data: cachedPrices } as AxiosResponse));
      jest.spyOn(cacheManager, 'set').mockResolvedValueOnce(undefined);

      jest
        .spyOn(service as any, 'fetchAndCreateSymbolToIdMap')
        .mockResolvedValue(undefined);

      service['symbolToIdMap'] = { bitcoin: 'bitcoin', ethereum: 'ethereum' };

      const result = await service.getTokenPrices(symbols);

      expect(result).toEqual(cachedPrices);
      expect(cacheManager.get).toHaveBeenCalledWith(cacheKey);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.coingecko.com/api/v3/simple/price',
        {
          params: { ids: 'bitcoin,ethereum', vs_currencies: 'usd' },
          headers: { 'x-cg-pro-api-key': 'test-api-key' },
        },
      );
      expect(cacheManager.set).toHaveBeenCalledWith(
        cacheKey,
        cachedPrices,
        3600,
      );
    });

    it('fetches token prices successfully using cached data', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValueOnce(cachedPrices);

      const result = await service.getTokenPrices(symbols);

      expect(result).toEqual(cachedPrices);
      expect(cacheManager.get).toHaveBeenCalledWith(cacheKey);
    });

    it('handles no valid CoinGecko IDs found for provided symbols', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValueOnce(null);
      jest
        .spyOn(service as any, 'fetchAndCreateSymbolToIdMap')
        .mockResolvedValueOnce(undefined);
      service['symbolToIdMap'] = {};

      const result = await service.getTokenPrices(symbols);

      expect(result).toEqual({});
      expect(cacheManager.get).toHaveBeenCalledWith(cacheKey);
      expect(httpService.get).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('handles error when fetching prices fails', async () => {
      const errorMessage = 'Test error';
      jest.spyOn(cacheManager, 'get').mockResolvedValueOnce(null);
      jest
        .spyOn(httpService, 'get')
        .mockReturnValueOnce(throwError(() => new Error(errorMessage)));

      await expect(service.getTokenPrices(symbols)).rejects.toThrow(
        errorMessage,
      );
    });
  });

  describe('fetchAndCreateSymbolToIdMap', () => {
    const coinList = [
      { id: 'bitcoin', symbol: 'btc' },
      { id: 'ethereum', symbol: 'eth' },
    ];
    const symbolToIdMap = {
      btc: 'bitcoin',
      eth: 'ethereum',
    };

    it('successfully fetches and caches the symbol to ID map', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValueOnce(null);
      jest
        .spyOn(httpService, 'get')
        .mockReturnValueOnce(of({ data: coinList } as AxiosResponse));
      jest.spyOn(cacheManager, 'set').mockResolvedValueOnce(undefined);

      await (service as any).fetchAndCreateSymbolToIdMap();

      expect(cacheManager.get).toHaveBeenCalledWith('symbol_to_id_map');
      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.coingecko.com/api/v3/coins/list',
        {
          headers: { 'x-cg-pro-api-key': 'test-api-key' },
        },
      );
      expect(cacheManager.set).toHaveBeenCalledWith(
        'symbol_to_id_map',
        symbolToIdMap,
        3600,
      );
      expect(service['symbolToIdMap']).toEqual(symbolToIdMap);
    });

    it('uses cached symbol to ID map', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValueOnce(symbolToIdMap);

      await (service as any).fetchAndCreateSymbolToIdMap();

      expect(cacheManager.get).toHaveBeenCalledWith('symbol_to_id_map');
      expect(httpService.get).not.toHaveBeenCalled();
      expect(service['symbolToIdMap']).toEqual(symbolToIdMap);
    });
  });

  // describe('fetchPricesInBatches', () => {
  //   const tokenIds = ['bitcoin', 'ethereum'];
  //   const tokenPrices = {
  //     bitcoin: { usd: 45000 },
  //     ethereum: { usd: 3000 },
  //   };

  //   it('successfully fetches prices in batches', async () => {
  //     jest
  //       .spyOn(service as any, 'fetchPricesWithRetries')
  //       .mockResolvedValueOnce({ bitcoin: { usd: 45000 } })
  //       .mockResolvedValueOnce({ ethereum: { usd: 3000 } });

  //     const result = await (service as any).fetchPricesInBatches(tokenIds);

  //     const expectedPrices = {
  //       bitcoin: { usd: 45000 },
  //       ethereum: { usd: 3000 },
  //     };

  //     expect(result).toEqual(expectedPrices);
  //     expect(service['fetchPricesWithRetries']).toHaveBeenCalledTimes(2);
  //   });
  // });

  describe('fetchPricesWithRetries', () => {
    const tokenIds = ['bitcoin', 'ethereum'];
    const tokenPrices = {
      bitcoin: { usd: 45000 },
      ethereum: { usd: 3000 },
    };

    it('successfully fetches prices on first try', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValueOnce(of({ data: tokenPrices } as AxiosResponse));

      const result = await (service as any).fetchPricesWithRetries(tokenIds);

      expect(result).toEqual(tokenPrices);
      expect(httpService.get).toHaveBeenCalledTimes(1);
    });

    // it('successfully fetches prices after retries', async () => {
    //   jest.spyOn(httpService, 'get').mockReturnValueOnce(
    //     of({
    //       data: {},
    //       headers: { 'Retry-After': '1' },
    //     } as unknown as AxiosResponse),
    //   );
    //   jest.spyOn(service as any, 'delay').mockResolvedValueOnce(undefined);
    //   jest
    //     .spyOn(httpService, 'get')
    //     .mockReturnValueOnce(of({ data: tokenPrices } as AxiosResponse));

    //   const result = await (service as any).fetchPricesWithRetries(tokenIds);

    //   expect(result).toEqual(tokenPrices);
    //   expect(httpService.get).toHaveBeenCalledTimes(2);
    // });

    // it('fails after exceeding maximum retries', async () => {
    //   jest.spyOn(httpService, 'get').mockReturnValue(
    //     of({
    //       data: {},
    //       headers: { 'Retry-After': '1' },
    //     } as unknown as AxiosResponse),
    //   );
    //   jest.spyOn(service as any, 'delay').mockResolvedValue(undefined);

    //   await expect(
    //     (service as any).fetchPricesWithRetries(tokenIds),
    //   ).rejects.toThrow();

    //   expect(httpService.get).toHaveBeenCalledTimes(3);
    // });
  });

  describe('consumeToken and refillTokens', () => {
    it('consumes a token and refills automatically', async () => {
      service['tokens'] = 1;
      const initialTokens = service['tokens'];

      await (service as any).consumeToken();

      expect(service['tokens']).toBe(initialTokens - 1);

      jest.spyOn(service as any, 'refillTokens').mockImplementationOnce(() => {
        service['tokens'] = service['MAX_REQUESTS'];
      });

      await (service as any).consumeToken();

      expect(service['tokens']).toBe(service['MAX_REQUESTS'] - 1);
    });
  });
});
