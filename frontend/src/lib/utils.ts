/**
 * Check if a string is a valid Ethereum address (0x + 40 hex chars)
 */
export function isEthAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

/**
 * Check if a string is a valid transaction hash (0x + 64 hex chars)
 */
export function isTxHash(value: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

/**
 * Shorten a hex string for display
 * @param hex - The hex string to shorten
 * @param startChars - Number of characters to show at start (default 6)
 * @param endChars - Number of characters to show at end (default 4)
 */
export function shortenHex(hex: string, startChars = 6, endChars = 4): string {
  if (hex.length <= startChars + endChars) {
    return hex;
  }
  return `${hex.slice(0, startChars)}...${hex.slice(-endChars)}`;
}

/**
 * Format timestamp to readable date
 */
export function formatTimestamp(timestamp: string): string {
  const date = new Date(parseInt(timestamp) * 1000);
  return date.toLocaleString();
}

/**
 * Format large numbers with commas
 */
export function formatNumber(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toLocaleString();
}
