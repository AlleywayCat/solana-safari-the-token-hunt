# Solana Safari - The Token Hunt 🏹

Solana Safari - The Token Hunt is an innovative project designed to explore the Solana blockchain ecosystem by hunting for tokens. This project leverages the power of the Solana blockchain to provide a unique and engaging experience for users.

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
  - [API Endpoint](#api-endpoint)
- [Running Tests](#running-tests)
- [License](#license)

## Features

- **Token Hunting**: Discover and collect various tokens within the Solana ecosystem.
- **Integration with CoinGecko**: Utilize real-time data from CoinGecko for accurate token information.
- **Caching Mechanism**: Efficient data retrieval with caching strategies to enhance performance.
- **Metaplex Integration**: Seamlessly interact with the Metaplex protocol for token management.

## Getting Started

To get started with Solana Safari - The Token Hunt, follow these steps:

### Prerequisites

- Node.js
- npm
- Docker
- Docker Compose
- A Solana wallet
- An API key from CoinGecko

### Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/AlleywayCat/solana-safari-the-token-hunt.git
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

3. Set up your environment variables by copying the `.env.example` file to `.env` and filling in your details:

   ```sh
   cp .env.example .env
   ```

   Ensure you have the following environment variables set in your `.env` file:

   - `SOLANA_RPC_URL`: Your Solana RPC URL.
   - `COINGECKO_API_URL`: Your CoinGecko API URL.
   - `COINGECKO_API_KEY`: Your CoinGecko API key.

4. Start the application:

   ```sh
   npm run start:dev
   ```

   Alternatively, you can start the application using **Docker Compose**:

   1. Build and start the containers:

      ```sh
      docker-compose up --build
      ```

   2. The application will be available at http://localhost:3000.

## Usage

### API Endpoint

The primary API endpoint to retrieve token information for a given Solana public key is:

```sh
GET /tokens?publicKey={publicKey}
```

### Example Request

```sh
GET /tokens?publicKey=ETddVJxVaLWcFfRT3TCoPty4mqrY9s32KPMZ8KFfgFg
```

### Example Response

```json
{
  "tokens": [
    {
      "mintAddress": "string",
      "name": "string",
      "symbol": "string",
      "imageUrl": "string",
      "decimals": number,
      "balance": "string",
      "price": "number"
    }
  ],
  "totalValue": "string"
}
```

## Running Tests

To run the tests for the application, use the following command:

```sh
npm test
```

The tests include:

- End-to-end or functional tests to verify the entire flow of the application.
- Unit tests to ensure individual components of the code work correctly.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
