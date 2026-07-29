import { describe, expect, it } from 'vitest';
import { buildApplicationsCsv, csvEscape } from '../../src/lib/csv';
import type { Application } from '../../src/types';

function makeApp(overrides: Partial<Application> = {}): Application {
  return {
    id: 'id-1',
    date_applied: '2026-07-29T12:00:00.000Z',
    company: 'Acme',
    role_title: 'Engineer',
    source: 'greenhouse',
    posting_url: 'https://boards.greenhouse.io/acme/jobs/1',
    status: 'applied',
    resume_version_id: null,
    notes: null,
    created_at: '2026-07-29T12:00:00.000Z',
    updated_at: '2026-07-29T12:00:00.000Z',
    ...overrides,
  };
}

describe('csvEscape', () => {
  it('leaves plain values alone', () => {
    expect(csvEscape('Acme')).toBe('Acme');
  });

  it('quotes values with commas, quotes, and newlines', () => {
    expect(csvEscape('Acme, Inc.')).toBe('"Acme, Inc."');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"');
  });
});

describe('buildApplicationsCsv', () => {
  it('emits a header row and one row per application', () => {
    const csv = buildApplicationsCsv([makeApp(), makeApp({ company: 'Beta Corp' })]);
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('date_applied,company,role_title,status,source,posting_url,notes');
    expect(lines[1]).toContain('Acme');
    expect(lines[2]).toContain('Beta Corp');
  });

  it('escapes tricky fields', () => {
    const csv = buildApplicationsCsv([
      makeApp({ company: 'Acme, Inc.', notes: 'Referred by "Sam"' }),
    ]);
    expect(csv).toContain('"Acme, Inc."');
    expect(csv).toContain('"Referred by ""Sam"""');
  });
});
