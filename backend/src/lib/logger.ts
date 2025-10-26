/**
 * Simple logger utility with ISO timestamp prefixes
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const getTimestamp = (): string => {
  return new Date().toISOString();
};

const formatMessage = (level: LogLevel, message: string, metadata?: object): string => {
  const metaStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
  return `[${getTimestamp()}] [${level.toUpperCase()}] ${message}${metaStr}`;
};

export const logger = {
  info: (message: string, metadata?: object): void => {
    console.log(formatMessage('info', message, metadata));
  },
  warn: (message: string, metadata?: object): void => {
    console.warn(formatMessage('warn', message, metadata));
  },
  error: (message: string, metadata?: object): void => {
    console.error(formatMessage('error', message, metadata));
  },
  debug: (message: string, metadata?: object): void => {
    console.debug(formatMessage('debug', message, metadata));
  },
};
