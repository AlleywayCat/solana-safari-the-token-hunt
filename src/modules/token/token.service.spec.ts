import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from './token.service';
import { SolanaService } from '../solana/solana.service';
import { MetaplexService } from '../metaplex/metaplex.service';
import { CoinGeckoService } from '../coingecko/coingecko.service';
import { TokenResponseDto } from './dto/token-response.dto';
import { TokenDto } from './dto/token.dto';

describe('TokenService', () => {
  let solanaService: SolanaService;
  let metaplexService: MetaplexService;
  let coinGeckoService: CoinGeckoService;
  let tokenService: TokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: SolanaService, useValue: createMock<SolanaService>() },
        { provide: MetaplexService, useValue: createMock<MetaplexService>() },
        { provide: CoinGeckoService, useValue: createMock<CoinGeckoService>() },
      ],
    }).compile();

    tokenService = module.get<TokenService>(TokenService);
    solanaService = module.get<SolanaService>(SolanaService);
    metaplexService = module.get<MetaplexService>(MetaplexService);
    coinGeckoService = module.get<CoinGeckoService>(CoinGeckoService);
  });

  it('should be defined', () => {
    expect(tokenService).toBeDefined();
  });

  describe('getTokens', () => {
    const publicKey = 'testPublicKey';

    it('should successfully retrieve tokens', async () => {
      const solBalance = 1;
      const tokenAccountsResult = [
        { mintAddress: 'mint1', amount: '1000', decimals: 9 },
        { mintAddress: 'mint2', amount: '2000', decimals: 9 },
      ];
      const tokenMetadata = [
        { mint: 'mint1', name: 'Token1', symbol: 'T1', image: 'image1' },
        { mint: 'mint2', name: 'Token2', symbol: 'T2', image: 'image2' },
      ];
      const tokenPrices = {
        t1: { usd: 1 },
        t2: { usd: 2 },
      };
      const solPriceData = { sol: { usd: 100 } };

      jest.spyOn(solanaService, 'getSolBalance').mockResolvedValue(solBalance);
      jest
        .spyOn(solanaService, 'getTokenAccountsByOwner')
        .mockResolvedValue(tokenAccountsResult);
      jest
        .spyOn(metaplexService, 'getTokenMetadata')
        .mockResolvedValue(tokenMetadata);
      jest
        .spyOn(coinGeckoService, 'getTokenPrices')
        .mockImplementation((symbols) => {
          if (symbols.includes('sol')) return Promise.resolve(solPriceData);
          return Promise.resolve(tokenPrices);
        });

      const result = await tokenService.getTokens(publicKey);

      const expectedTokens: TokenDto[] = [
        {
          mintAddress: 'mint1',
          name: 'Token1',
          symbol: 'T1',
          imageUrl: 'image1',
          decimals: 9,
          balance: '0.000001000',
          price: 1,
        },
        {
          mintAddress: 'mint2',
          name: 'Token2',
          symbol: 'T2',
          imageUrl: 'image2',
          decimals: 9,
          balance: '0.000002000',
          price: 2,
        },
      ];
      const expectedTotalValue = (0.001 * 1 + 0.002 * 2 + 1 * 100).toFixed(2);

      const expectedResponse: TokenResponseDto = {
        tokens: expectedTokens,
        totalValue: expectedTotalValue,
      };

      expect(result).toEqual(expectedResponse);
    });

    it('should handle no tokens found', async () => {
      const solBalance = 1;
      const tokenAccountsResult: any[] = [];
      const tokenMetadata: any[] = [];

      jest.spyOn(solanaService, 'getSolBalance').mockResolvedValue(solBalance);
      jest
        .spyOn(solanaService, 'getTokenAccountsByOwner')
        .mockResolvedValue(tokenAccountsResult);
      jest
        .spyOn(metaplexService, 'getTokenMetadata')
        .mockResolvedValue(tokenMetadata);

      const result = await tokenService.getTokens(publicKey);

      const expectedResponse: TokenResponseDto = {
        tokens: [],
        totalValue: '0.00',
      };

      expect(result).toEqual(expectedResponse);
    });

    it('should handle token with no price', async () => {
      const solBalance = 1;
      const tokenAccountsResult = [
        { mintAddress: 'mint1', amount: '1000', decimals: 9 },
      ];
      const tokenMetadata = [
        { mint: 'mint1', name: 'Token1', symbol: 'T1', image: 'image1' },
      ];
      const tokenPrices = {
        t1: { usd: 0 },
      };
      const solPriceData = { sol: { usd: 100 } };

      jest.spyOn(solanaService, 'getSolBalance').mockResolvedValue(solBalance);
      jest
        .spyOn(solanaService, 'getTokenAccountsByOwner')
        .mockResolvedValue(tokenAccountsResult);
      jest
        .spyOn(metaplexService, 'getTokenMetadata')
        .mockResolvedValue(tokenMetadata);
      jest
        .spyOn(coinGeckoService, 'getTokenPrices')
        .mockImplementation((symbols) => {
          if (symbols.includes('sol')) return Promise.resolve(solPriceData);
          return Promise.resolve(tokenPrices);
        });

      const result = await tokenService.getTokens(publicKey);

      const expectedTokens: TokenDto[] = [
        {
          mintAddress: 'mint1',
          name: 'Token1',
          symbol: 'T1',
          imageUrl: 'image1',
          decimals: 9,
          balance: '0.000001000',
          price: 0,
        },
      ];
      const expectedTotalValue = (1 * 100).toFixed(2);

      const expectedResponse: TokenResponseDto = {
        tokens: expectedTokens,
        totalValue: expectedTotalValue,
      };

      expect(result).toEqual(expectedResponse);
    });

    it('should propagate errors correctly', async () => {
      const errorMessage = 'Test error';
      jest
        .spyOn(solanaService, 'getSolBalance')
        .mockRejectedValue(new Error(errorMessage));

      await expect(tokenService.getTokens(publicKey)).rejects.toThrow(
        errorMessage,
      );
    });
  });
});
