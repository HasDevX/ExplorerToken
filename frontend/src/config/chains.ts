/**
 * Chain Registry - Frontend copy of supported EVM chains
 * This mirrors the backend chain registry for UI purposes
 */

export interface ChainMeta {
  id: number;
  key: string; // short key
  name: string; // user-facing name
  explorerBaseUrl: string; // used to build links
  supported: boolean; // true if APIV2 supported
}

/**
 * Known chains - only supported chains for frontend use
 */
export const KNOWN_CHAINS: ChainMeta[] = [
  {
    id: 1,
    key: 'eth',
    name: 'Ethereum',
    explorerBaseUrl: 'https://etherscan.io',
    supported: true,
  },
  {
    id: 10,
    key: 'op',
    name: 'Optimism',
    explorerBaseUrl: 'https://optimistic.etherscan.io',
    supported: true,
  },
  {
    id: 56,
    key: 'bsc',
    name: 'BNB Smart Chain',
    explorerBaseUrl: 'https://bscscan.com',
    supported: true,
  },
  {
    id: 137,
    key: 'polygon',
    name: 'Polygon',
    explorerBaseUrl: 'https://polygonscan.com',
    supported: true,
  },
  {
    id: 324,
    key: 'zksync',
    name: 'zkSync',
    explorerBaseUrl: 'https://explorer.zksync.io',
    supported: true,
  },
  {
    id: 5000,
    key: 'mantle',
    name: 'Mantle',
    explorerBaseUrl: 'https://mantlescan.xyz',
    supported: true,
  },
  {
    id: 8453,
    key: 'base',
    name: 'Base',
    explorerBaseUrl: 'https://basescan.org',
    supported: true,
  },
  {
    id: 42161,
    key: 'arb1',
    name: 'Arbitrum One',
    explorerBaseUrl: 'https://arbiscan.io',
    supported: true,
  },
  {
    id: 43114,
    key: 'avax',
    name: 'Avalanche C-Chain',
    explorerBaseUrl: 'https://snowtrace.io',
    supported: true,
  },
  {
    id: 25,
    key: 'cronos',
    name: 'Cronos',
    explorerBaseUrl: 'https://cronoscan.com',
    // Marked as unsupported - Etherscan v2 API support pending vendor confirmation
    supported: false,
  },
];

/**
 * Default selected chains for setup wizard (9 APIV2-supported chains)
 */
export const DEFAULT_SELECTED_CHAIN_IDS: number[] = [
  1, 10, 56, 137, 42161, 43114, 8453, 324, 5000,
];

/**
 * Get chain metadata by chain ID
 */
export function getChainMeta(id: number): ChainMeta | undefined {
  return KNOWN_CHAINS.find((chain) => chain.id === id);
}

/**
 * Get explorer URL for an address on a specific chain
 */
export function getAddressExplorerUrl(chainId: number, address: string): string {
  const chain = getChainMeta(chainId);
  if (!chain) return '#';
  return `${chain.explorerBaseUrl}/address/${address}`;
}

/**
 * Get explorer URL for a transaction on a specific chain
 */
export function getTxExplorerUrl(chainId: number, txHash: string): string {
  const chain = getChainMeta(chainId);
  if (!chain) return '#';
  return `${chain.explorerBaseUrl}/tx/${txHash}`;
}

/**
 * Get explorer URL for a token on a specific chain
 */
export function getTokenExplorerUrl(chainId: number, tokenAddress: string): string {
  const chain = getChainMeta(chainId);
  if (!chain) return '#';
  return `${chain.explorerBaseUrl}/token/${tokenAddress}`;
}
