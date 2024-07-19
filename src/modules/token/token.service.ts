import { Injectable } from '@nestjs/common';
import { SolanaService } from '../solana/solana.service';
import { MetaplexService } from '../../services/metaplex/metaplex.service';
import { CoinGeckoService } from '../../services/coingecko/coingecko.service';

@Injectable()
export class TokenService {
  constructor(
    private solanaService: SolanaService,
    private metaplexService: MetaplexService,
    private coingeckoService: CoinGeckoService,
  ) {}

  async getTokens(publicKey: string) {
    const { balance } = await this.solanaService.getSolBalance(publicKey);
    const tokenAccounts =
      await this.solanaService.getTokenAccountsByOwner(publicKey);

    return {
      balance: balance.toString(),
      tokenAccounts,
    };
  }
}
