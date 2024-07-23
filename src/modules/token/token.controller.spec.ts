import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { TokenController } from './token.controller';
import { TokenService } from './token.service';
import { TokenResponseDto } from './dto/token-response.dto';
import { TokenDto } from './dto/token.dto';

describe('TokenController', () => {
  let controller: TokenController;
  let tokenService: TokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TokenController],
      providers: [
        {
          provide: TokenService,
          useValue: createMock<TokenService>(),
        },
      ],
    }).compile();

    controller = module.get<TokenController>(TokenController);
    tokenService = module.get<TokenService>(TokenService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getTokens', () => {
    it('should return an array of tokens for a valid public key', async () => {
      const mockTokens: TokenResponseDto = {
        tokens: [
          {
            mintAddress: 'mint1',
            name: 'Token 1',
            symbol: 'TK1',
            imageUrl: 'http://example.com/token1.png',
            decimals: 6,
            balance: '1000',
            price: 10,
          },
          {
            mintAddress: 'mint2',
            name: 'Token 2',
            symbol: 'TK2',
            imageUrl: 'http://example.com/token2.png',
            decimals: 6,
            balance: '2000',
            price: 20,
          },
        ],
        totalValue: '0',
      };
      jest.spyOn(tokenService, 'getTokens').mockResolvedValue(mockTokens);

      const result = await controller.getTokens('validPublicKey');

      expect(result).toEqual(mockTokens);
    });

    it('should return an empty array when no tokens are found', async () => {
      const emptyTokens: TokenResponseDto = {
        tokens: [],
        totalValue: '0',
      };
      jest.spyOn(tokenService, 'getTokens').mockResolvedValue(emptyTokens);

      const result = await controller.getTokens('unknownPublicKey');
      expect(result).toEqual(emptyTokens);
    });

    it('should propagate the exception from TokenService', async () => {
      jest
        .spyOn(tokenService, 'getTokens')
        .mockRejectedValue(new Error('Service error'));

      await expect(
        controller.getTokens('publicKeyCausingError'),
      ).rejects.toThrow('Service error');
    });
  });
});
