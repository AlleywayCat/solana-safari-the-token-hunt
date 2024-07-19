import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  COINGECKO_API_KEY,
  COINGECKO_API_URL,
} from '../../shared/constants/constants';

@Injectable()
export class CoinGeckoService {
  private readonly logger = new Logger(CoinGeckoService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getPriceData() {
    const apiUrl = this.configService.get<string>(COINGECKO_API_URL);
    const apiKey = this.configService.get<string>(COINGECKO_API_KEY);

    const response = await firstValueFrom(
      this.httpService.get(apiUrl, {
        headers: {
          'Content-Type': 'application/json',
          'x-cg-pro-api-key': apiKey,
        },
      }),
    );

    this.logger.debug(response.data);

    return response.data;
  }
}
