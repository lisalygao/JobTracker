import type { Application, ApplicationStatus, ResumeVersion } from '../../types';
import { APPLICATION_STATUSES } from '../../types';
import { scrapeActiveTabJd, send } from '../messaging';

function field(labelText: string, control: HTMLElement): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  const label = document.createElement('label');
  label.textContent = labelText;
  wrap.append(label, control);
  return wrap;
}

function renderVersion(version: ResumeVersion): HTMLElement {
  const box = document.createElement('div');
  box.className = 'version';
  const when = new Date(version.created_at).toLocaleString();

  const title = document.createElement('div');
  title.innerHTML = `<strong>Tailored version</strong> <span class="muted">${when}</span>`;

  const suggestions = document.createElement('details');
  suggestions.innerHTML = `<summary>Suggestions</summary>`;
  const suggestionsPre = document.createElement('pre');
  suggestionsPre.textContent = version.suggestions_given;
  suggestions.append(suggestionsPre);

  const content = document.createElement('details');
  content.innerHTML = `<summary>Tailored resume</summary>`;
  const contentPre = document.createElement('pre');
  contentPre.textContent = version.tailored_content;
  const copy = document.createElement('button');
  copy.className = 'secondary';
  copy.textContent = 'Copy to clipboard';
  copy.addEventListener('click', () => {
    void navigator.clipboard.writeText(version.tailored_content).then(() => {
      copy.textContent = 'Copied!';
      setTimeout(() => (copy.textContent = 'Copy to clipboard'), 1500);
    });
  });
  content.append(contentPre, copy);

  box.append(title, suggestions, content);
  return box;
}

export function renderDetail(
  container: HTMLElement,
  application: Application,
  versions: ResumeVersion[],
  handlers: {
    onBack: () => void;
    onChanged: () => void;
  },
): void {
  container.innerHTML = '';

  const back = document.createElement('button');
  back.className = 'secondary';
  back.textContent = '← Back';
  back.addEventListener('click', handlers.onBack);

  const heading = document.createElement('h2');
  heading.textContent = `${application.role_title} — ${application.company}`;
  heading.style.marginTop = '10px';

  const meta = document.createElement('p');
  meta.className = 'muted';
  // Built with DOM APIs: posting_url comes from an arbitrary page's
  // location.href and must never be interpolated into markup.
  meta.append(`Applied ${application.date_applied.slice(0, 10)} · ${application.source}`);
  if (application.posting_url) {
    const anchor = document.createElement('a');
    anchor.href = application.posting_url;
    anchor.textContent = 'posting';
    anchor.target = '_blank';
    anchor.rel = 'noreferrer';
    meta.append(' · ', anchor);
  }

  const errorEl = document.createElement('div');
  errorEl.className = 'error';
  errorEl.hidden = true;
  const showError = (error: unknown): void => {
    errorEl.hidden = false;
    errorEl.textContent = error instanceof Error ? error.message : String(error);
  };

  // Status
  const statusSelect = document.createElement('select');
  statusSelect.innerHTML = APPLICATION_STATUSES.map(
    (s) => `<option value="${s}">${s}</option>`,
  ).join('');
  statusSelect.value = application.status;
  statusSelect.addEventListener('change', () => {
    send<Application>({
      type: 'UPDATE_APPLICATION',
      id: application.id,
      changes: { status: statusSelect.value as ApplicationStatus },
    })
      .then(handlers.onChanged)
      .catch(showError);
  });

  // Notes
  const notes = document.createElement('textarea');
  notes.rows = 3;
  notes.placeholder = 'Notes…';
  notes.value = application.notes ?? '';
  notes.addEventListener('change', () => {
    send<Application>({
      type: 'UPDATE_APPLICATION',
      id: application.id,
      changes: { notes: notes.value || null },
    }).catch(showError);
  });

  // Tailoring panel
  const tailoring = document.createElement('section');
  const tailoringHeading = document.createElement('h2');
  tailoringHeading.textContent = 'Resume tailoring';
  const jd = document.createElement('textarea');
  jd.rows = 6;
  jd.placeholder = 'Job description — scrape it from the posting tab or paste it here.';

  const scrapeButton = document.createElement('button');
  scrapeButton.className = 'secondary';
  scrapeButton.textContent = 'Scrape from active tab';
  scrapeButton.addEventListener('click', () => {
    scrapeButton.disabled = true;
    scrapeActiveTabJd()
      .then((text) => {
        jd.value = text;
        errorEl.hidden = true;
      })
      .catch(showError)
      .finally(() => (scrapeButton.disabled = false));
  });

  const tailorButton = document.createElement('button');
  tailorButton.className = 'primary';
  tailorButton.textContent = 'Get tailoring suggestions';
  tailorButton.addEventListener('click', () => {
    tailorButton.disabled = true;
    tailorButton.textContent = 'Tailoring… (can take a minute)';
    send<ResumeVersion>({
      type: 'TAILOR_RESUME',
      applicationId: application.id,
      jobDescription: jd.value,
    })
      .then(handlers.onChanged)
      .catch(showError)
      .finally(() => {
        tailorButton.disabled = false;
        tailorButton.textContent = 'Get tailoring suggestions';
      });
  });

  const tailoringToolbar = document.createElement('div');
  tailoringToolbar.className = 'toolbar';
  tailoringToolbar.append(scrapeButton, tailorButton);
  tailoring.append(tailoringHeading, field('Job description', jd), tailoringToolbar);

  // Versions
  const versionsSection = document.createElement('section');
  if (versions.length) {
    const versionsHeading = document.createElement('h2');
    versionsHeading.textContent = `Resume versions (${versions.length})`;
    versionsSection.append(versionsHeading);
    for (const version of versions) versionsSection.append(renderVersion(version));
  }

  // Delete
  const deleteButton = document.createElement('button');
  deleteButton.className = 'danger';
  deleteButton.textContent = 'Delete application';
  deleteButton.style.marginTop = '16px';
  deleteButton.addEventListener('click', () => {
    if (!confirm('Delete this application and its resume versions?')) return;
    send({ type: 'DELETE_APPLICATION', id: application.id })
      .then(handlers.onBack)
      .catch(showError);
  });

  container.append(
    back,
    heading,
    meta,
    errorEl,
    field('Status', statusSelect),
    field('Notes', notes),
    tailoring,
    versionsSection,
    deleteButton,
  );
}
