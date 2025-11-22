/**
 * Outbox Processor Configuration
 * 
 * Configuration for the subscription audit outbox processor worker.
 * Controls polling intervals, batch sizes, retry logic, and feature flags.
 */

import { z } from 'zod';

const booleanSchema = z
  .string()
  .optional()
  .transform((val) => {
    if (!val) return true; // Default to enabled
    const normalized = val.toLowerCase().trim();
    if (['true', '1', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'no'].includes(normalized)) return false;
    return true;
  });

const outboxConfigSchema = z.object({
  pollIntervalMs: z.number().default(2000),
  batchSize: z.number().default(10),
  maxRetries: z.number().default(5),
  retryDelays: z.array(z.number()).default([1000, 2000, 4000, 8000, 16000]),
  enableProcessor: booleanSchema,
});

const rawConfig = {
  pollIntervalMs: 2000,
  batchSize: 10,
  maxRetries: 5,
  retryDelays: [1000, 2000, 4000, 8000, 16000],
  enableProcessor: process.env.ENABLE_OUTBOX_PROCESSOR,
};

export const outboxConfig = outboxConfigSchema.parse(rawConfig);

export default outboxConfig;
