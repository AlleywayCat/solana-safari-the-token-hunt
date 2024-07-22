import * as Joi from 'joi';

export const validationSchema = Joi.object({
  SOLANA_RPC_URL: Joi.string().required().description('Solana RPC URL'),
  COINGECKO_API_URL: Joi.string().required().description('CoinGecko API URL'),
  COINGECKO_API_KEY: Joi.string().required().description('CoinGecko API Key'),
  COINGECKO_PRICE_ENDPOINT: Joi.string()
    .default('/simple/price')
    .description('CoinGecko Price Endpoint'),
  COINGECKO_COINS_LIST_ENDPOINT: Joi.string()
    .default('/coins/list')
    .description('CoinGecko Coins List Endpoint'),
  THROTTLER_TTL: Joi.number().default(60000).description('Throttler TTL'),
  THROTTLER_LIMIT: Joi.number().default(10).description('Throttler Limit'),
});
