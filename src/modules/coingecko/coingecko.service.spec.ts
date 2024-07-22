import { Test, TestingModule } from '@nestjs/testing';
import { CoinGeckoService } from './coingecko.service';

describe('CoingeckoService', () => {
  let service: CoinGeckoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoinGeckoService],
    }).compile();

    service = module.get<CoinGeckoService>(CoinGeckoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
