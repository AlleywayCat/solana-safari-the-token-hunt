import * as Joi from 'joi';

export const validationSchema = Joi.object({
  REDIS_HOST: Joi.string().required().description('Redis host'),
  REDIS_PORT: Joi.number().required().description('Redis port'),
  SOLANA_RPC_URL: Joi.string().required().description('Solana RPC URL'),
  COINGECKO_API_URL: Joi.string().required().description('CoinGecko API URL'),
  COINGECKO_API_KEY: Joi.string().required().description('CoinGecko API Key'),
});
