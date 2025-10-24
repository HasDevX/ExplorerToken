import { env } from '@/config/env';

export const BASE_URL = 'https://api.etherscan.io/v2/api';

/**
 * Helper function to create URL parameters for Etherscan V2 API
 * @param module - API module (e.g., 'account', 'token', 'proxy', 'transaction', 'stats')
 * @param action - API action (e.g., 'tokentx', 'topholders', etc.)
 * @param chainId - Blockchain chain ID
 * @param extra - Additional parameters to include
 * @returns URLSearchParams object with all parameters
 */
export function makeParams(
  module: string,
  action: string,
  chainId: number,
  extra: Record<string, string | number | undefined> = {}
): URLSearchParams {
  const params = new URLSearchParams();

  params.append('module', module);
  params.append('action', action);
  params.append('chainid', chainId.toString());
  params.append('apikey', env.ETHERSCAN_API_KEY);

  // Add extra parameters, filtering out undefined values
  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, value.toString());
    }
  });

  return params;
}
