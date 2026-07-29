import type { Application } from '../types';

export function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

const COLUMNS: { header: string; get: (app: Application) => string }[] = [
  { header: 'date_applied', get: (a) => a.date_applied },
  { header: 'company', get: (a) => a.company },
  { header: 'role_title', get: (a) => a.role_title },
  { header: 'status', get: (a) => a.status },
  { header: 'source', get: (a) => a.source },
  { header: 'posting_url', get: (a) => a.posting_url },
  { header: 'notes', get: (a) => a.notes ?? '' },
];

export function buildApplicationsCsv(applications: Application[]): string {
  const lines = [COLUMNS.map((c) => c.header).join(',')];
  for (const app of applications) {
    lines.push(COLUMNS.map((c) => csvEscape(c.get(app))).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}
