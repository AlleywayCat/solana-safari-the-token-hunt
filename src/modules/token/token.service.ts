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
      // Fetch SOL balance and token accounts in parallel
      const [solBalance, tokenAccountsResult] = await Promise.all([
        this.solanaService.getSolBalance(publicKey),
        this.solanaService.getTokenAccountsByOwner(publicKey),
      ]);

      // Extract mint addresses from token accounts
      const mints = tokenAccountsResult.map((account) => account.mintAddress);

      // Fetch token metadata
      const tokenMetadata = await this.metaplexService.getTokenMetadata(mints);

      // Extract token symbols and convert them to lowercase
      const tokenSymbols = tokenMetadata
        .map((metadata) => metadata.symbol.toLowerCase())
        .filter((symbol) => symbol); // Filter out empty or invalid symbols

      // If no valid token symbols, return early
      if (tokenSymbols.length === 0) {
        return {
          tokens: [],
          totalValue: '0.00',
        };
      }

      // Fetch token prices and SOL price in parallel
      const [tokenPrices, solPriceData] = await Promise.all([
        this.coinGeckoService.getTokenPrices(tokenSymbols),
        this.coinGeckoService.getTokenPrices(['sol']),
      ]);

      const solPrice = solPriceData['sol']?.usd || 0;

      // Map token metadata to token response format
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

      // Calculate the total value including SOL balance
      const tokensTotalValue = tokens.reduce(
        (acc, token) => acc + parseFloat(token.balance) * token.price,
        0,
      );

      const solTotalValue = solBalance * solPrice;
      const totalValue = tokensTotalValue + solTotalValue;

      return {
        tokens,
        totalValue: totalValue.toFixed(2),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get tokens for ${publicKey}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
