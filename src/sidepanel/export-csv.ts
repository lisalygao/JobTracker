import type { Application } from '../types';
import { buildApplicationsCsv } from '../lib/csv';

export function downloadCsv(applications: Application[]): void {
  const csv = buildApplicationsCsv(applications);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `job-applications-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
