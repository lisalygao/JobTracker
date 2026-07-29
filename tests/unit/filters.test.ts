import { describe, expect, it } from 'vitest';
import { applyFilters } from '../../src/sidepanel/views/list';
import type { Application } from '../../src/types';

function makeApp(overrides: Partial<Application>): Application {
  return {
    id: crypto.randomUUID(),
    date_applied: '2026-07-15T12:00:00.000Z',
    company: 'Acme',
    role_title: 'Engineer',
    source: 'other',
    posting_url: '',
    status: 'applied',
    resume_version_id: null,
    notes: null,
    created_at: '2026-07-15T12:00:00.000Z',
    updated_at: '2026-07-15T12:00:00.000Z',
    ...overrides,
  };
}

const apps = [
  makeApp({ company: 'Acme', status: 'applied', date_applied: '2026-07-01T00:00:00Z' }),
  makeApp({ company: 'Beta Corp', status: 'interviewing', date_applied: '2026-07-15T00:00:00Z' }),
  makeApp({ company: 'Gamma', status: 'rejected', date_applied: '2026-07-28T00:00:00Z' }),
];

describe('applyFilters', () => {
  it('passes everything through with empty filters', () => {
    expect(applyFilters(apps, { status: '', company: '', from: '', to: '' })).toHaveLength(3);
  });

  it('filters by status', () => {
    const result = applyFilters(apps, { status: 'interviewing', company: '', from: '', to: '' });
    expect(result.map((a) => a.company)).toEqual(['Beta Corp']);
  });

  it('filters by company substring, case-insensitive', () => {
    const result = applyFilters(apps, { status: '', company: 'beta', from: '', to: '' });
    expect(result.map((a) => a.company)).toEqual(['Beta Corp']);
  });

  it('filters by date range inclusively', () => {
    const result = applyFilters(apps, {
      status: '',
      company: '',
      from: '2026-07-15',
      to: '2026-07-28',
    });
    expect(result.map((a) => a.company)).toEqual(['Beta Corp', 'Gamma']);
  });
});
