/**
 * hardhat.config.js — Hardhat Configuration
 *
 * This file configures:
 *  - The Solidity compiler version
 *  - Network settings (local Hardhat node + Sepolia testnet)
 *  - Etherscan verification support
 *
 * Environment variables (set in contracts/.env):
 *  SEPOLIA_RPC_URL    — Infura/Alchemy HTTPS endpoint for Sepolia
 *  PRIVATE_KEY        — Deployer wallet private key (WITHOUT 0x prefix)
 *  ETHERSCAN_API_KEY  — For contract verification on Etherscan
 */

require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

// ── Read secrets from environment ────────────────────────────────────────
const SEPOLIA_RPC_URL   = process.env.SEPOLIA_RPC_URL   || '';
const PRIVATE_KEY       = process.env.PRIVATE_KEY       || '0x' + '0'.repeat(64); // placeholder
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';

/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
  // ── Solidity Compiler ──────────────────────────────────────────────────
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        enabled: true,
        runs:    200, // Optimise for typical call frequency
      },
    },
  },

  // ── Networks ───────────────────────────────────────────────────────────
  networks: {
    /**
     * hardhat — built-in in-memory network for unit tests.
     * No configuration needed; runs automatically with `npx hardhat test`.
     */
    hardhat: {
      chainId: 31337,
    },

    /**
     * localhost — connects to a running `npx hardhat node` process.
     * Use this for local frontend development.
     */
    localhost: {
      url:     'http://127.0.0.1:8545',
      chainId: 31337,
    },

    /**
     * sepolia — Ethereum Sepolia public testnet.
     * Requires SEPOLIA_RPC_URL and PRIVATE_KEY in .env
     * Get free Sepolia ETH from: https://sepoliafaucet.com
     */
    sepolia: {
      url:      SEPOLIA_RPC_URL,
      accounts: PRIVATE_KEY !== '0x' + '0'.repeat(64) ? [PRIVATE_KEY] : [],
      chainId:  11155111,
    },
  },

  // ── Etherscan (contract verification) ─────────────────────────────────
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY,
    },
  },

  // ── Gas Reporter (optional — shows gas costs per function in tests) ────
  gasReporter: {
    enabled:  process.env.REPORT_GAS === 'true',
    currency: 'USD',
  },

  // ── Compilation artifacts path ─────────────────────────────────────────
  paths: {
    sources:   './contracts',
    tests:     './test',
    cache:     './cache',
    artifacts: './artifacts',
  },
};
