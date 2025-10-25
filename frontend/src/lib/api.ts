import axios from 'axios';
import {
  ChainSchema,
  TransfersResponseSchema,
  TokenInfoSchema,
  TxDetailsSchema,
  type Chain,
  type TransfersResponse,
  type TokenInfo,
  type TxDetails,
} from './validators';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get list of supported chains
 */
export async function getChains(): Promise<Chain[]> {
  const response = await apiClient.get('/chains');
  return ChainSchema.array().parse(response.data);
}

/**
 * Get token transfers for an address
 */
export async function getTransfers(
  chainId: number,
  address: string,
  options?: {
    page?: number;
    offset?: number;
    sort?: 'asc' | 'desc';
  }
): Promise<TransfersResponse> {
  const params = new URLSearchParams();
  if (options?.page) params.append('page', options.page.toString());
  if (options?.offset) params.append('offset', options.offset.toString());
  if (options?.sort) params.append('sort', options.sort);

  const response = await apiClient.get(`/address/${chainId}/${address}/transfers`, { params });
  return TransfersResponseSchema.parse(response.data);
}

/**
 * Get token info for a contract address
 */
export async function getTokenInfo(chainId: number, address: string): Promise<TokenInfo> {
  const response = await apiClient.get(`/token/${chainId}/${address}/info`);
  return TokenInfoSchema.parse(response.data);
}

/**
 * Get transaction details
 */
export async function getTx(chainId: number, hash: string): Promise<TxDetails> {
  const response = await apiClient.get(`/tx/${chainId}/${hash}`);
  return TxDetailsSchema.parse(response.data);
}
