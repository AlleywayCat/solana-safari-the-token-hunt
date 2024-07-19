import { Injectable } from '@nestjs/common';
import { SolanaService } from '../solana/solana.service';
import { MetaplexService } from '../metaplex/metaplex.service';
import { CoinGeckoService } from '../coingecko/coingecko.service';

@Injectable()
export class TokenService {
  constructor(
    private solanaService: SolanaService,
    private metaplexService: MetaplexService,
    private coinGeckoService: CoinGeckoService,
  ) {}

  async getTokens(publicKey: string) {
    const [balanceResult, tokenAccountsResult] = await Promise.all([
      this.solanaService.getSolBalance(publicKey),
      this.solanaService.getTokenAccountsByOwner(publicKey),
    ]);

    const tokenMetadata = await this.metaplexService.getTokenMetadata(
      tokenAccountsResult.map((account) => account.mintAddress),
    );

    return {
      balance: balanceResult.balance.toString(),
      tokenAccounts: tokenAccountsResult,
      tokenMetadata,
    };
  }
}
