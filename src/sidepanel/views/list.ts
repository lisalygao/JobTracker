import type { Application, ApplicationStatus } from '../../types';
import { APPLICATION_STATUSES } from '../../types';
import { downloadCsv } from '../export-csv';

export interface ListFilters {
  status: ApplicationStatus | '';
  company: string;
  from: string;
  to: string;
}

export function applyFilters(applications: Application[], filters: ListFilters): Application[] {
  return applications.filter((app) => {
    if (filters.status && app.status !== filters.status) return false;
    if (filters.company && !app.company.toLowerCase().includes(filters.company.toLowerCase()))
      return false;
    const applied = app.date_applied.slice(0, 10);
    if (filters.from && applied < filters.from) return false;
    if (filters.to && applied > filters.to) return false;
    return true;
  });
}

export function renderList(
  container: HTMLElement,
  applications: Application[],
  filters: ListFilters,
  handlers: {
    onFiltersChange: (filters: ListFilters) => void;
    onOpen: (id: string) => void;
  },
): void {
  container.innerHTML = '';

  const filterBar = document.createElement('div');
  filterBar.className = 'filters';

  const statusSelect = document.createElement('select');
  statusSelect.innerHTML =
    `<option value="">All statuses</option>` +
    APPLICATION_STATUSES.map((s) => `<option value="${s}">${s}</option>`).join('');
  statusSelect.value = filters.status;

  const companyInput = document.createElement('input');
  companyInput.type = 'search';
  companyInput.placeholder = 'Company…';
  companyInput.value = filters.company;

  const fromInput = document.createElement('input');
  fromInput.type = 'date';
  fromInput.title = 'Applied from';
  fromInput.value = filters.from;

  const toInput = document.createElement('input');
  toInput.type = 'date';
  toInput.title = 'Applied to';
  toInput.value = filters.to;

  const emitFilters = (): void =>
    handlers.onFiltersChange({
      status: statusSelect.value as ListFilters['status'],
      company: companyInput.value,
      from: fromInput.value,
      to: toInput.value,
    });
  // 'change' (not 'input') so the full re-render doesn't steal focus mid-typing.
  for (const el of [statusSelect, companyInput, fromInput, toInput])
    el.addEventListener('change', emitFilters);
  filterBar.append(statusSelect, companyInput, fromInput, toInput);

  const visible = applyFilters(applications, filters);

  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';
  const exportButton = document.createElement('button');
  exportButton.className = 'secondary';
  exportButton.textContent = `Export CSV (${visible.length})`;
  exportButton.disabled = visible.length === 0;
  exportButton.addEventListener('click', () => downloadCsv(visible));
  const count = document.createElement('span');
  count.className = 'muted';
  count.textContent = `${visible.length} of ${applications.length} applications`;
  count.style.alignSelf = 'center';
  toolbar.append(exportButton, count);

  container.append(filterBar, toolbar);

  if (visible.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = applications.length
      ? 'No applications match the current filters.'
      : 'No applications yet. Apply to a job on LinkedIn or a supported ATS and confirm the toast.';
    container.append(empty);
    return;
  }

  const table = document.createElement('table');
  table.innerHTML = `<thead><tr>
    <th>Date</th><th>Company</th><th>Role</th><th>Status</th>
  </tr></thead>`;
  const tbody = document.createElement('tbody');
  for (const app of visible) {
    const row = document.createElement('tr');
    row.className = 'row';
    const date = document.createElement('td');
    date.textContent = app.date_applied.slice(0, 10);
    const company = document.createElement('td');
    company.textContent = app.company;
    const role = document.createElement('td');
    role.textContent = app.role_title;
    const status = document.createElement('td');
    status.innerHTML = `<span class="badge">${app.status}</span>`;
    row.append(date, company, role, status);
    row.addEventListener('click', () => handlers.onOpen(app.id));
    tbody.append(row);
  }
  table.append(tbody);
  container.append(table);
}
