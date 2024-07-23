import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { TokenService } from '../src/modules/token/token.service';

describe('TokenController (e2e)', () => {
  let app: INestApplication;
  const tokenService = {
    getTokens: (publicKey: string) => ({
      tokens: [
        {
          mintAddress: 'fakeMintAddress',
          name: 'FakeToken',
          symbol: 'FTK',
          imageUrl: 'http://example.com/fake.png',
          decimals: 6,
          balance: '1000.000000',
          price: 1.0,
        },
      ],
      totalValue: '1000.00',
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TokenService)
      .useValue(tokenService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/tokens (GET)', () => {
    const publicKey = 'ETddVJxVaLWcFfRT3TCoPty4mqrY9s32KPMZ8KFfgFg';

    return request(app.getHttpServer())
      .get('/tokens')
      .query({ publicKey })
      .expect(200)
      .expect({
        tokens: [
          {
            mintAddress: 'fakeMintAddress',
            name: 'FakeToken',
            symbol: 'FTK',
            imageUrl: 'http://example.com/fake.png',
            decimals: 6,
            balance: '1000.000000',
            price: 1.0,
          },
        ],
        totalValue: '1000.00',
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
