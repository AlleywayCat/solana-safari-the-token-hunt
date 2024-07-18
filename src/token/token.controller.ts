import { Controller, Get, Query } from '@nestjs/common';
import { TokenService } from './token.service';

@Controller('tokens')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Get()
  async getTokens(@Query('publicKey') publicKey: string) {
    return await this.tokenService.getTokens(publicKey);
  }
}
