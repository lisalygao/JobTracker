import type { Settings } from '../../types';
import { send } from '../messaging';

export function renderSettings(container: HTMLElement, settings: Settings): void {
  container.innerHTML = '';

  const heading = document.createElement('h2');
  heading.textContent = 'Settings';

  const info = document.createElement('p');
  info.className = 'muted';
  info.textContent =
    'Resume tailoring uses your own Anthropic API key (BYOK). Calls go directly ' +
    'from this extension to the API; the key is stored locally in this browser only.';

  const apiKey = document.createElement('input');
  apiKey.type = 'password';
  apiKey.placeholder = 'sk-ant-…';
  apiKey.value = settings.apiKey;

  const model = document.createElement('input');
  model.type = 'text';
  model.placeholder = 'claude-opus-5';
  model.value = settings.model;

  const baseResume = document.createElement('textarea');
  baseResume.rows = 14;
  baseResume.placeholder = 'Paste your base resume here (plain text).';
  baseResume.value = settings.baseResume;

  const status = document.createElement('span');
  status.className = 'muted';
  status.style.alignSelf = 'center';

  const saveButton = document.createElement('button');
  saveButton.className = 'primary';
  saveButton.textContent = 'Save settings';
  saveButton.addEventListener('click', () => {
    const next: Settings = {
      apiKey: apiKey.value.trim(),
      model: model.value.trim() || 'claude-opus-5',
      baseResume: baseResume.value,
    };
    send({ type: 'SAVE_SETTINGS', settings: next })
      .then(() => {
        status.textContent = 'Saved.';
        setTimeout(() => (status.textContent = ''), 2000);
      })
      .catch((error: unknown) => {
        status.textContent = `Save failed: ${error instanceof Error ? error.message : error}`;
      });
  });

  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';
  toolbar.append(saveButton, status);

  const wrap = (label: string, el: HTMLElement): HTMLElement => {
    const div = document.createElement('div');
    div.className = 'field';
    const l = document.createElement('label');
    l.textContent = label;
    div.append(l, el);
    return div;
  };

  container.append(
    heading,
    info,
    wrap('Anthropic API key', apiKey),
    wrap('Model', model),
    wrap('Base resume', baseResume),
    toolbar,
  );
}
