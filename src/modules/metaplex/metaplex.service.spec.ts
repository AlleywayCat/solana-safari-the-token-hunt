import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';
import { MetaplexService } from './metaplex.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { METAPLEX_INSTANCE } from '../../shared/constants/constants';
import { ConfigService } from '@nestjs/config';
import { Metaplex, Metadata, Nft, Sft } from '@metaplex-foundation/js';
import { PublicKey } from '@solana/web3.js';

jest.mock('@metaplex-foundation/js', () => ({
  Metaplex: jest.fn(() => ({
    nfts: jest.fn().mockReturnThis(),
    findAllByMintList: jest.fn(),
    load: jest.fn(),
  })),
  Metadata: jest.fn(),
  Nft: jest.fn(),
  Sft: jest.fn(),
  chunk: jest.requireActual('lodash').chunk,
}));

jest.mock('@solana/web3.js', () => ({
  PublicKey: jest.fn((input) => {
    if (input === 'invalid-mint') {
      throw new Error('Invalid public key input');
    }
    return { toBase58: () => input };
  }),
}));

describe('MetaplexService', () => {
  let service: MetaplexService;
  let cacheManagerMock: any;
  let metaplexMock: any;

  beforeEach(async () => {
    cacheManagerMock = {
      get: jest.fn(),
      set: jest.fn(),
    };
    metaplexMock = {
      nfts: jest.fn().mockReturnThis(),
      findAllByMintList: jest.fn().mockResolvedValue([]),
      load: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetaplexService,
        {
          provide: ConfigService,
          useValue: createMock<ConfigService>(),
        },
        { provide: CACHE_MANAGER, useValue: cacheManagerMock },
        { provide: METAPLEX_INSTANCE, useValue: metaplexMock },
      ],
    }).compile();

    service = module.get<MetaplexService>(MetaplexService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTokenMetadata', () => {
    it('should return metadata for given mints', async () => {
      const mints = ['mint1', 'mint2'];
      const expectedMetadata = [
        { mint: 'mint1', name: 'Token1', symbol: 'TK1', image: 'image1' },
        { mint: 'mint2', name: 'Token2', symbol: 'TK2', image: 'image2' },
      ];

      cacheManagerMock.get
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      metaplexMock.findAllByMintList.mockResolvedValueOnce([
        {
          address: { toBase58: () => 'mint1' },
          model: 'nft',
          name: 'Token1',
          symbol: 'TK1',
          json: { image: 'image1' },
        },
        {
          address: { toBase58: () => 'mint2' },
          model: 'nft',
          name: 'Token2',
          symbol: 'TK2',
          json: { image: 'image2' },
        },
      ]);

      const result = await service.getTokenMetadata(mints);

      expect(result).toEqual(expectedMetadata);
      expect(cacheManagerMock.set).toHaveBeenCalledTimes(2);
    });
  });

  describe('loadAdditionalMetadata', () => {
    it('should load additional metadata successfully', async () => {
      const metadatas: Metadata[] = [
        {
          model: 'metadata',
          address: { toBase58: () => 'address1', bump: 1 } as any,
          name: 'NFT1',
          symbol: 'NFT',
          json: { image: 'image1' },
        } as Metadata,
      ];
      const expectedMetadata = [
        { mint: 'address1', name: 'NFT1', symbol: 'NFT', image: 'image1' },
      ];

      jest
        .spyOn(service as any, 'loadMetadataWithRetries')
        .mockResolvedValueOnce(expectedMetadata[0]);

      const result = await service['loadAdditionalMetadata'](metadatas);
      expect(result).toEqual(expectedMetadata);
    });
  });
});
