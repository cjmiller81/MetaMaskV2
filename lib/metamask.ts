import { type MetaMaskInpageProvider } from '@metamask/providers';

declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}

export class MetaMaskError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MetaMaskError';
  }
}

export interface TokenHolding {
  symbol: string;
  chain: string;
  quantity: string;
  selected?: boolean;
}

export interface Account {
  address: string;
  holdings: TokenHolding[];
}

async function getChainName(chainId: string): Promise<string> {
  if (!window.ethereum) throw new MetaMaskError('MetaMask not installed');

  try {
    // Get the chain information from MetaMask
    const chainInfo = await window.ethereum.request({
      method: 'eth_chainId',
    });

    // Map common chain IDs to names
    const chainNames: { [key: string]: string } = {
      '0x1': 'ETHEREUM',
      '0x38': 'BNB CHAIN',
      '0x89': 'POLYGON',
      '0xa': 'OPTIMISM',
      '0xa4b1': 'ARBITRUM ONE',
      '0x2105': 'BASE',
      '0xfa': 'FANTOM',
      '0xa86a': 'AVALANCHE',
    };

    return chainNames[chainId] || `CHAIN ${parseInt(chainId, 16)}`;
  } catch (error) {
    console.error('Error getting chain name:', error);
    return `CHAIN ${parseInt(chainId, 16)}`;
  }
}

async function getNativeTokenSymbol(chainId: string): Promise<string> {
  const chainSymbols: { [key: string]: string } = {
    '0x1': 'ETH',
    '0x38': 'BNB',
    '0x89': 'MATIC',
    '0xa': 'ETH',
    '0xa4b1': 'ETH',
    '0x2105': 'ETH',
    '0xfa': 'FTM',
    '0xa86a': 'AVAX',
  };

  return chainSymbols[chainId] || 'ETH';
}

async function getTokenBalance(
  address: string,
  chainId: string
): Promise<TokenHolding | null> {
  if (!window.ethereum) throw new MetaMaskError('MetaMask not installed');

  try {
    // Switch to the chain
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId }],
    });

    // Get native token balance
    const balance = await window.ethereum.request({
      method: 'eth_getBalance',
      params: [address, 'latest'],
    }) as string;

    const quantity = (parseInt(balance, 16) / 1e18).toFixed(4);
    
    // Only return if there's a balance
    if (parseFloat(quantity) > 0) {
      return {
        symbol: await getNativeTokenSymbol(chainId),
        chain: await getChainName(chainId),
        quantity,
        selected: false,
      };
    }

    return null;
  } catch (error: any) {
    // If chain switch failed, it might not be supported by the wallet
    if (error.code === 4902) {
      return null;
    }
    console.error('Error fetching token balance:', error);
    return null;
  }
}

export async function getAccountHoldings(address: string): Promise<TokenHolding[]> {
  const holdings: TokenHolding[] = [];

  // Common chains to check
  const chainIds = [
    '0x1',   // Ethereum
    '0x38',  // BNB Chain
    '0x89',  // Polygon
    '0xa',   // Optimism
    '0xa4b1',// Arbitrum One
    '0x2105',// Base
    '0xfa',  // Fantom
    '0xa86a' // Avalanche
  ];

  // Check balances on all supported chains
  for (const chainId of chainIds) {
    try {
      const holding = await getTokenBalance(address, chainId);
      if (holding) {
        holdings.push(holding);
      }
    } catch (error) {
      console.error(`Error fetching balance for chain ${chainId}:`, error);
    }
  }

  return holdings;
}

export async function connectMetaMask(): Promise<Account[]> {
  if (typeof window === 'undefined') {
    throw new MetaMaskError('MetaMask cannot be accessed server-side');
  }

  if (!window.ethereum) {
    throw new MetaMaskError('MetaMask is not installed');
  }

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    }) as string[];

    if (!accounts.length) {
      throw new MetaMaskError('No accounts found');
    }

    const accountsWithHoldings = await Promise.all(
      accounts.map(async (address) => {
        const holdings = await getAccountHoldings(address);
        return { address, holdings };
      })
    );

    return accountsWithHoldings;
  } catch (error: any) {
    if (error.code === 4001) {
      throw new MetaMaskError('User rejected the connection request');
    }
    throw new MetaMaskError(error.message || 'Failed to connect to MetaMask');
  }
}

export function isMetaMaskInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.ethereum);
}

export function setupAccountChangeListener(callback: (accounts: string[]) => void): void {
  if (typeof window !== 'undefined' && window.ethereum) {
    window.ethereum.on('accountsChanged', callback);
  }
}