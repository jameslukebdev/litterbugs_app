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
      '../../../supabase/migrations/20260907130658_publish_cleanup_waiver_v3_early_approval.sql',
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

  it('documents reporter approval as an allowed early resolution', () => {
    expect(CLEANUP_ACKNOWLEDGMENT).toContain(
      'Reporter approval ends the remaining dispute window',
    );
    expect(CLEANUP_ACKNOWLEDGMENT).toContain(
      'automatically approved when the 48-hour window expires',
    );
    expect(CLEANUP_ACKNOWLEDGMENT).not.toContain('no early payout');
  });
});
