/**
 * Simple logger utility with ISO timestamp prefixes
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const getTimestamp = (): string => {
  return new Date().toISOString();
};

const formatMessage = (level: LogLevel, message: string): string => {
  return `[${getTimestamp()}] [${level.toUpperCase()}] ${message}`;
};

export const logger = {
  info: (message: string): void => {
    console.log(formatMessage('info', message));
  },
  warn: (message: string): void => {
    console.warn(formatMessage('warn', message));
  },
  error: (message: string): void => {
    console.error(formatMessage('error', message));
  },
  debug: (message: string): void => {
    console.debug(formatMessage('debug', message));
  },
};
