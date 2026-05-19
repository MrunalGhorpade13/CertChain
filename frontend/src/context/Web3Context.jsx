/**
 * Web3Context.jsx — Global Web3 / Wallet State Management
 *
 * This context provides wallet connection state to the entire application.
 * Any component can call `useWeb3()` to access:
 *   - account:      Connected wallet address (null if not connected)
 *   - provider:     Ethers.js BrowserProvider instance
 *   - signer:       Ethers.js Signer for signing transactions
 *   - chainId:      Currently connected network chain ID
 *   - isConnecting: Boolean flag for loading state
 *   - connectWallet:    Function to trigger MetaMask connection
 *   - disconnectWallet: Function to clear local state
 *
 * IMPORTANT: This does NOT store private keys. MetaMask manages key security.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

// ── Create context with sensible defaults ─────────────────────────────────
const Web3Context = createContext({
  account:          null,
  provider:         null,
  signer:           null,
  chainId:          null,
  isConnecting:     false,
  connectWallet:    () => {},
  disconnectWallet: () => {},
});

import contractInfo from '../contracts/CertificateRegistry.json';

// ── Supported networks ────────────────────────────────────────────────────
// Dynamically restrict to the chain ID where the contract is currently deployed
const SUPPORTED_CHAIN_IDS = [Number(contractInfo.chainId)];
const CHAIN_NAMES = {
  1:        'Ethereum Mainnet',
  11155111: 'Sepolia Testnet',
  31337:    'Hardhat Local',
};

/**
 * Web3Provider component — wraps the entire app to provide wallet context.
 * Place this high in the component tree (inside BrowserRouter).
 */
export function Web3Provider({ children }) {
  const [account,      setAccount]      = useState(null);
  const [provider,     setProvider]     = useState(null);
  const [signer,       setSigner]       = useState(null);
  const [chainId,      setChainId]      = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // ── Helper: initialise Ethers provider from window.ethereum ─────────────
  const initProvider = useCallback(async () => {
    if (!window.ethereum) return null;
    // ethers v6: use BrowserProvider (replaces Web3Provider from v5)
    const ethersProvider = new ethers.BrowserProvider(window.ethereum);
    return ethersProvider;
  }, []);

  // ── Connect wallet ────────────────────────────────────────────────────
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      toast.error('MetaMask not detected. Please install the MetaMask extension.', {
        duration: 5000,
        icon: '🦊',
      });
      return;
    }

    setIsConnecting(true);
    try {
      const ethersProvider = await initProvider();

      // Request account access — this triggers the MetaMask popup
      const accounts = await ethersProvider.send('eth_requestAccounts', []);
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned. Please unlock MetaMask.');
      }

      const ethSigner = await ethersProvider.getSigner();
      const network   = await ethersProvider.getNetwork();
      const cId       = Number(network.chainId);

      // Warn if on unsupported network, but don't block
      if (!SUPPORTED_CHAIN_IDS.includes(cId)) {
        toast(`⚠️ Connected to ${CHAIN_NAMES[cId] ?? `Chain ${cId}`}. Please switch to Sepolia Testnet.`, {
          duration: 6000,
        });
      }

      setProvider(ethersProvider);
      setSigner(ethSigner);
      setAccount(accounts[0]);
      setChainId(cId);

      toast.success(`Wallet connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`, {
        icon: '✅',
      });
    } catch (err) {
      // MetaMask error code 4001 = user rejected the request
      if (err.code === 4001) {
        toast.error('Connection rejected. Please approve in MetaMask.');
      } else {
        toast.error(`Failed to connect: ${err.message}`);
      }
      console.error('[Web3Context] connectWallet error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, [initProvider]);

  // ── Disconnect wallet (local state reset only) ────────────────────────
  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
    toast('Wallet disconnected.', { icon: '👋' });
  }, []);

  // ── Auto-reconnect on page load if MetaMask is already authorised ─────
  useEffect(() => {
    const tryAutoConnect = async () => {
      if (!window.ethereum) return;
      try {
        const ethersProvider = await initProvider();
        // eth_accounts (no 'Request') does NOT prompt the user
        const accounts = await ethersProvider.send('eth_accounts', []);
        if (accounts && accounts.length > 0) {
          const ethSigner = await ethersProvider.getSigner();
          const network   = await ethersProvider.getNetwork();
          setProvider(ethersProvider);
          setSigner(ethSigner);
          setAccount(accounts[0]);
          setChainId(Number(network.chainId));
        }
      } catch (err) {
        console.warn('[Web3Context] Auto-connect failed (non-critical):', err.message);
      }
    };
    tryAutoConnect();
  }, [initProvider]);

  // ── Listen for MetaMask account/chain changes ─────────────────────────
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setAccount(accounts[0]);
        toast(`Account switched to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);
      }
    };

    const handleChainChanged = (chainIdHex) => {
      const newChainId = parseInt(chainIdHex, 16);
      setChainId(newChainId);
      // Reload to reset all provider/signer references safely
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged',    handleChainChanged);

    // Cleanup listeners on unmount to prevent memory leaks
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged',    handleChainChanged);
    };
  }, [disconnectWallet]);

  // ── Context value object ──────────────────────────────────────────────
  const value = {
    account,
    provider,
    signer,
    chainId,
    isConnecting,
    connectWallet,
    disconnectWallet,
    // Helper: is user on the correct network?
    isCorrectNetwork: SUPPORTED_CHAIN_IDS.includes(chainId),
    chainName: CHAIN_NAMES[chainId] ?? `Unknown (${chainId})`,
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}

/**
 * useWeb3 — custom hook to consume the Web3Context.
 * Must be used inside a <Web3Provider> ancestor.
 *
 * Example:
 *   const { account, connectWallet } = useWeb3();
 */
export function useWeb3() {
  return useContext(Web3Context);
}

export default Web3Context;
