import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { SolanaService } from './solana.service';
import { SOLANA_CONNECTION } from '../../shared/constants/constants';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { SolanaRpcError } from './errors/solana-error';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn(),
  PublicKey: jest.fn().mockImplementation((key) => ({ key })),
  LAMPORTS_PER_SOL: 1000000000,
}));

describe('SolanaService', () => {
  let service: SolanaService;
  let mockConnection;
  let mockCacheManager;

  beforeEach(async () => {
    mockConnection = {
      getBalance: jest.fn(),
      getParsedTokenAccountsByOwner: jest.fn(),
    };
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SolanaService,
        { provide: SOLANA_CONNECTION, useValue: mockConnection },
        {
          provide: ConfigService,
          useValue: createMock<ConfigService>(),
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<SolanaService>(SolanaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSolBalance', () => {
    const publicKey = 'testPublicKey';
    const balanceInLamports = 1000000000;
    const expectedBalance = 1;

    it('should return the correct SOL balance', async () => {
      mockConnection.getBalance.mockResolvedValue(balanceInLamports);

      const balance = await service.getSolBalance(publicKey);

      expect(balance).toEqual(expectedBalance);
      expect(mockConnection.getBalance).toHaveBeenCalledWith(
        expect.anything(),
        'confirmed',
      );
    });

    it('should throw SolanaRpcError on failure', async () => {
      mockConnection.getBalance.mockRejectedValue(new Error('Test error'));

      await expect(service.getSolBalance(publicKey)).rejects.toThrow(
        SolanaRpcError,
      );
    });
  });

  describe('getTokenAccountsByOwner', () => {
    const publicKey = 'testPublicKey';
    const cacheKey = `tokenAccounts-${publicKey}`;
    const tokenAccounts = [
      { mintAddress: 'mintAddress1', amount: '100', decimals: 2 },
    ];

    it('should return cached data if available', async () => {
      mockCacheManager.get.mockResolvedValue(tokenAccounts);

      const result = await service.getTokenAccountsByOwner(publicKey);

      expect(result).toEqual(tokenAccounts);
      expect(mockCacheManager.get).toHaveBeenCalledWith(cacheKey);
      expect(
        mockConnection.getParsedTokenAccountsByOwner,
      ).not.toHaveBeenCalled();
    });

    it('should fetch and cache data if not in cache', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockConnection.getParsedTokenAccountsByOwner.mockResolvedValue({
        value: [
          {
            account: {
              data: {
                parsed: {
                  info: {
                    mint: 'mintAddress1',
                    tokenAmount: { amount: '100', decimals: 2 },
                  },
                },
              },
            },
          },
        ],
      });

      const result = await service.getTokenAccountsByOwner(publicKey);

      expect(result).toEqual(tokenAccounts);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        cacheKey,
        tokenAccounts,
        expect.any(Number),
      );
    });

    it('should throw SolanaRpcError on failure', async () => {
      mockConnection.getParsedTokenAccountsByOwner.mockRejectedValue(
        new Error('Test error'),
      );

      await expect(service.getTokenAccountsByOwner(publicKey)).rejects.toThrow(
        SolanaRpcError,
      );
    });
  });

  describe('getCachedData', () => {
    it('should return cached data if available', async () => {
      const cacheKey = 'testCacheKey';
      const cachedData = { data: 'testData' };
      mockCacheManager.get.mockResolvedValue(cachedData);

      const result = await (service as any).getCachedData(cacheKey);

      expect(result).toEqual(cachedData);
      expect(mockCacheManager.get).toHaveBeenCalledWith(cacheKey);
    });

    it('should return null if cached data is not available', async () => {
      const cacheKey = 'testCacheKey';
      mockCacheManager.get.mockResolvedValue(null);

      const result = await (service as any).getCachedData(cacheKey);

      expect(result).toBeNull();
      expect(mockCacheManager.get).toHaveBeenCalledWith(cacheKey);
    });
  });

  describe('setCachedData', () => {
    it('should set cached data', async () => {
      const cacheKey = 'testCacheKey';
      const data = { data: 'testData' };
      mockCacheManager.set.mockResolvedValue(undefined);

      await (service as any).setCachedData(cacheKey, data);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        cacheKey,
        data,
        expect.any(Number),
      );
    });

    it('should log a warning if setting cache data fails', async () => {
      const cacheKey = 'testCacheKey';
      const data = { data: 'testData' };
      const error = new Error('Test error');
      mockCacheManager.set.mockRejectedValue(error);
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await (service as any).setCachedData(cacheKey, data);

      expect(loggerSpy).toHaveBeenCalledWith(
        `Failed to set cache for ${cacheKey}: ${error.message}`,
      );
    });
  });
});
