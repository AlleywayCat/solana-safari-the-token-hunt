import { Injectable, Logger } from '@nestjs/common';
import { SolanaService } from '../solana/solana.service';
import { MetaplexService } from '../metaplex/metaplex.service';
import { CoinGeckoService } from '../coingecko/coingecko.service';
import { TokenResponseDto } from './dto/token-response.dto';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly solanaService: SolanaService,
    private readonly metaplexService: MetaplexService,
    private readonly coinGeckoService: CoinGeckoService,
  ) {}

  async getTokens(publicKey: string): Promise<TokenResponseDto> {
    try {
      const [balanceResult, tokenAccountsResult] = await Promise.all([
        this.solanaService.getSolBalance(publicKey),
        this.solanaService.getTokenAccountsByOwner(publicKey),
      ]);

      if (tokenAccountsResult.length === 0) {
        return { tokens: [], totalValue: '0.00' };
      }

      const mintAddresses = tokenAccountsResult.map(
        (account) => account.mintAddress,
      );

      const tokenMetadata =
        await this.metaplexService.getTokenMetadata(mintAddresses);

      const tokenSymbols = tokenMetadata
        .map((metadata) => metadata.symbol.toLowerCase())
        .filter((symbol) => symbol);

      if (tokenSymbols.length === 0) {
        return {
          tokens: [],
          totalValue: '0.00',
        };
      }

      const tokenPrices = await this.coinGeckoService.fetchPrices(tokenSymbols);

      const tokens = tokenMetadata.map((metadata) => {
        const symbolLowerCase = metadata.symbol.toLowerCase();
        const price = tokenPrices[symbolLowerCase]?.usd || 0;

        if (price === 0) {
          this.logger.warn(
            `Price for ${metadata.symbol} not found or is 0. This might be due to missing mapping or unsupported token.`,
          );
        }

        const account = tokenAccountsResult.find(
          (account) => account.mintAddress === metadata.mint,
        );

        const adjustedBalance =
          parseFloat(account.amount) / Math.pow(10, account.decimals);

        return {
          mintAddress: metadata.mint,
          name: metadata.name,
          symbol: metadata.symbol,
          imageUrl: metadata.image,
          decimals: account.decimals,
          balance: adjustedBalance.toFixed(account.decimals),
          price,
        };
      });

      const totalValue = tokens.reduce(
        (acc, token) => acc + parseFloat(token.balance) * token.price,
        0,
      );

      return {
        tokens,
        totalValue: totalValue.toFixed(2),
      };
    } catch (error) {
      this.logger.error('Failed to fetch tokens', error.stack);
      throw new Error('Failed to fetch tokens');
    }
  }
}
