/**
 * Chain Registry - Single source of truth for supported EVM chains
 * This configuration defines which chains are supported by the Etherscan APIV2 integration
 */

export interface ChainMeta {
  id: number;
  key: string; // short key
  name: string; // user-facing name
  explorerBaseUrl: string; // used to build links
  supported: boolean; // true if APIV2 supported
}

/**
 * Known chains with Etherscan APIV2 support status
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
    id: 59144,
    key: 'linea',
    name: 'Linea',
    explorerBaseUrl: 'https://lineascan.build',
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
 * Get chain metadata by chain ID
 */
export function getChainMeta(id: number): ChainMeta | undefined {
  return KNOWN_CHAINS.find((chain) => chain.id === id);
}

/**
 * Array of supported chain IDs (only chains with supported=true)
 */
export const SUPPORTED_CHAIN_IDS: number[] = KNOWN_CHAINS.filter((c) => c.supported).map(
  (c) => c.id
);

/**
 * Array of supported chains (only chains with supported=true)
 */
export const SUPPORTED_CHAINS: ChainMeta[] = KNOWN_CHAINS.filter((c) => c.supported);

/**
 * Default chain IDs to use when no chains are configured
 * Includes the 9 APIV2-supported chains (Linea excluded pending full vendor support)
 */
export const DEFAULT_CHAIN_IDS: number[] = [1, 10, 56, 137, 42161, 43114, 8453, 324, 5000];
