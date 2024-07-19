import { Test, TestingModule } from '@nestjs/testing';
import { Solana } from './solana.connection.provider';

describe('Solana', () => {
  let provider: Solana;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Solana],
    }).compile();

    provider = module.get<Solana>(Solana);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
