import * as Joi from 'joi';

export const validationSchema = Joi.object({
  SOLANA_RPC_URL: Joi.string().required().description('Solana RPC URL'),
  COINGECKO_API_KEY: Joi.string().required().description('CoinGecko API Key'),
});
