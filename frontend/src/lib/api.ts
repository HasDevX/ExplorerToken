import axios from 'axios';
import {
  ChainSchema,
  TransfersResponseSchema,
  TokenInfoSchema,
  TxDetailsSchema,
  HoldersResponseSchema,
  type Chain,
  type TransfersResponse,
  type TokenInfo,
  type TxDetails,
  type HoldersResponse,
} from './validators';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add JWT token to requests automatically
apiClient.interceptors.request.use((config) => {
  // Token migration: check for old jwt_token and migrate to token
  const oldToken = localStorage.getItem('jwt_token');
  if (oldToken && !localStorage.getItem('token')) {
    localStorage.setItem('token', oldToken);
    localStorage.removeItem('jwt_token');
  }

  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get list of supported chains
 */
export async function getChains(): Promise<Chain[]> {
  const response = await apiClient.get('/chains');
  // API now returns { chains: [...] }
  return ChainSchema.array().parse(response.data.chains);
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
 * Get token holders for a contract address
 */
export async function getHolders(
  chainId: number,
  address: string,
  options?: {
    page?: number;
    offset?: number;
  }
): Promise<HoldersResponse> {
  const params = new URLSearchParams();
  if (options?.page) params.append('page', options.page.toString());
  if (options?.offset) params.append('offset', options.offset.toString());

  const response = await apiClient.get(`/token/${chainId}/${address}/holders`, { params });
  return HoldersResponseSchema.parse(response.data);
}

/**
 * Get transaction details
 */
export async function getTx(chainId: number, hash: string): Promise<TxDetails> {
  const response = await apiClient.get(`/tx/${chainId}/${hash}`);
  return TxDetailsSchema.parse(response.data);
}

// ============================================================================
// Setup API Functions
// ============================================================================

export interface SetupState {
  setupComplete: boolean;
}

export interface SetupData {
  apiKey: string;
  chains: number[];
  adminUsername: string;
  adminPassword: string;
  cacheTtl: number;
}

/**
 * Get setup state
 */
export async function getSetupState(): Promise<SetupState> {
  const response = await apiClient.get('/setup/state');
  return response.data;
}

/**
 * Complete setup wizard
 */
export async function completeSetup(data: SetupData): Promise<void> {
  await apiClient.post('/setup/complete', data);
}

// ============================================================================
// Auth API Functions
// ============================================================================

export interface LoginData {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    username: string;
    role: string;
  };
}

/**
 * Login admin user
 */
export async function login(data: LoginData): Promise<LoginResponse> {
  const response = await apiClient.post('/auth/login', data);
  return response.data;
}

/**
 * Logout admin user
 */
export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

/**
 * Get current user info
 */
export async function getCurrentUser(): Promise<{
  user: { userId: string; username: string; role: string };
}> {
  const response = await apiClient.get('/auth/me');
  return response.data;
}

// ============================================================================
// Admin API Functions
// ============================================================================

export interface ChainMeta {
  id: number;
  key: string;
  name: string;
  explorerBaseUrl: string;
  supported: boolean;
}

export interface Settings {
  selectedChainIds: number[];
  cacheTtl: number;
  apiKeySet: boolean;
  apiKeyLastValidated: string | null;
  chainsDetailed?: ChainMeta[];
}

/**
 * Get admin settings
 */
export async function getAdminSettings(): Promise<Settings> {
  const response = await apiClient.get('/admin/settings');
  return response.data;
}

/**
 * Update admin settings
 */
export async function updateAdminSettings(data: {
  chains?: number[];
  cacheTtl?: number;
}): Promise<void> {
  await apiClient.put('/admin/settings', data);
}

/**
 * Update API key
 */
export async function updateApiKey(apiKey: string): Promise<void> {
  await apiClient.put('/admin/api-key', { apiKey });
}

/**
 * Clear cache
 */
export async function clearCache(): Promise<void> {
  await apiClient.post('/admin/cache/clear');
}

/**
 * Get metrics
 */
export async function getMetrics(): Promise<{ usage: Record<string, number>; timestamp: string }> {
  const response = await apiClient.get('/admin/metrics');
  return response.data;
}
