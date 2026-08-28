import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  CLEANUP_ACKNOWLEDGMENT,
  CLEANUP_ACKNOWLEDGMENT_TITLE,
  CLEANUP_ACKNOWLEDGMENT_VERSION,
  CLEANUP_GUIDELINES_VERSION,
  CLEANUP_RELEASE,
  CLEANUP_SAFETY_GUIDELINES,
} from './cleanup-safety-document';

describe('public cleanup safety document', () => {
  it('matches the active versioned acknowledgment published to the database', () => {
    const migrationPath = fileURLToPath(new URL(
      '../../../supabase/migrations/20260827171622_publish_cleanup_waiver_v2.sql',
      import.meta.url,
    ));
    const migration = readFileSync(migrationPath, 'utf8');

    for (const publishedValue of [
      CLEANUP_ACKNOWLEDGMENT_VERSION,
      CLEANUP_GUIDELINES_VERSION,
      CLEANUP_ACKNOWLEDGMENT_TITLE,
      CLEANUP_ACKNOWLEDGMENT,
      CLEANUP_SAFETY_GUIDELINES,
      CLEANUP_RELEASE,
    ]) {
      expect(migration).toContain(publishedValue);
    }
  });
});
