import { z } from 'zod';

// ============================================================================
// Response Schemas
// ============================================================================

export const ChainSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const TransferSchema = z.object({
  blockNumber: z.string(),
  timeStamp: z.string(),
  hash: z.string(),
  from: z.string(),
  to: z.string(),
  value: z.string(),
  contractAddress: z.string(),
  tokenName: z.string().optional(),
  tokenSymbol: z.string().optional(),
  tokenDecimal: z.string().optional(),
  gas: z.string().optional(),
  gasPrice: z.string().optional(),
  gasUsed: z.string().optional(),
});

export const TransfersResponseSchema = z.object({
  chainId: z.number(),
  address: z.string(),
  page: z.number(),
  offset: z.number(),
  sort: z.enum(['asc', 'desc']),
  data: z.array(TransferSchema),
});

export const TokenInfoSchema = z.object({
  contractAddress: z.string(),
  tokenName: z.string().optional(),
  symbol: z.string().optional(),
  divisor: z.string().optional(),
  tokenType: z.string().optional(),
  totalSupply: z.string().optional(),
  blueCheckmark: z.string().optional(),
  description: z.string().optional(),
  website: z.string().optional(),
  email: z.string().optional(),
  blog: z.string().optional(),
  reddit: z.string().optional(),
  slack: z.string().optional(),
  facebook: z.string().optional(),
  twitter: z.string().optional(),
  bitcointalk: z.string().optional(),
  github: z.string().optional(),
  telegram: z.string().optional(),
  wechat: z.string().optional(),
  linkedin: z.string().optional(),
  discord: z.string().optional(),
  whitepaper: z.string().optional(),
  tokenPriceUSD: z.string().optional(),
});

export const TxDetailsSchema = z.object({
  blockNumber: z.string(),
  timeStamp: z.string(),
  hash: z.string(),
  from: z.string(),
  to: z.string().optional(),
  value: z.string(),
  gas: z.string(),
  gasPrice: z.string(),
  gasUsed: z.string().optional(),
  isError: z.string().optional(),
  txreceipt_status: z.string().optional(),
  input: z.string().optional(),
  contractAddress: z.string().optional(),
  cumulativeGasUsed: z.string().optional(),
  confirmations: z.string().optional(),
});

export const HolderSchema = z.object({
  address: z.string(),
  balanceRaw: z.string(),
  percent: z.number().optional(),
});

export const HoldersResponseSchema = z.object({
  chainId: z.number(),
  address: z.string(),
  page: z.number(),
  offset: z.number(),
  data: z.array(HolderSchema),
});

// ============================================================================
// Type Exports
// ============================================================================

export type Chain = z.infer<typeof ChainSchema>;
export type Transfer = z.infer<typeof TransferSchema>;
export type TransfersResponse = z.infer<typeof TransfersResponseSchema>;
export type TokenInfo = z.infer<typeof TokenInfoSchema>;
export type TxDetails = z.infer<typeof TxDetailsSchema>;
export type Holder = z.infer<typeof HolderSchema>;
export type HoldersResponse = z.infer<typeof HoldersResponseSchema>;
