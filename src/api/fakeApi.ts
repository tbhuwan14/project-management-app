import { appError, type AppError } from '../types';

/** Mutable so tests can set FAKE_LATENCY.ms = 0. */
export const FAKE_LATENCY = { ms: 200 };

export const delay = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY.ms));

export const networkFailure = (): AppError =>
  appError('NETWORK', 'Simulated network failure — turn off the toggle in the top bar');
