export class SolanaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SolanaError';
  }
}

export class SolanaRpcError extends SolanaError {
  constructor(message: string, publicKey: string) {
    super(`RPC Error for ${publicKey}: ${message}`);
    this.name = 'SolanaRpcError';
  }
}

export class SolanaParseError extends SolanaError {
  constructor(message: string, publicKey: string) {
    super(`Parse Error for ${publicKey}: ${message}`);
    this.name = 'SolanaParseError';
  }
}
