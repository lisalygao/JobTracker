import type { CandidateApplication, MessageResponse } from '../types';

// Confirm-before-save toast (design doc §3.3): detection never writes to
// storage directly. The user confirms, edits fields inline, or dismisses.
// Rendered in a shadow root so page CSS can't interfere.

const HOST_ID = 'jobtracker-toast-host';

export function toastIsOpen(): boolean {
  return document.getElementById(HOST_ID) !== null;
}

export function showConfirmToast(candidate: CandidateApplication): void {
  if (toastIsOpen()) return;

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.setAttribute('data-jobtracker-toast', 'true');
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    .toast {
      position: fixed; bottom: 24px; right: 24px; z-index: 2147483647;
      width: 320px; padding: 16px; border-radius: 12px;
      background: #1f2328; color: #f0f3f6;
      font: 13px/1.45 system-ui, -apple-system, sans-serif;
      box-shadow: 0 8px 30px rgba(0,0,0,.35);
    }
    .title { font-weight: 600; margin-bottom: 10px; }
    label { display: block; font-size: 11px; color: #9ea7b3; margin: 8px 0 2px; }
    input {
      width: 100%; box-sizing: border-box; padding: 6px 8px;
      border-radius: 6px; border: 1px solid #444c56;
      background: #2d333b; color: inherit; font: inherit;
    }
    .buttons { display: flex; gap: 8px; margin-top: 14px; }
    button {
      flex: 1; padding: 7px 0; border-radius: 6px; border: none;
      font: inherit; font-weight: 600; cursor: pointer;
    }
    .save { background: #347d39; color: #fff; }
    .dismiss { background: #444c56; color: #f0f3f6; }
    .error { color: #ff8182; margin-top: 8px; }
  `;

  const wrap = document.createElement('div');
  wrap.className = 'toast';
  wrap.innerHTML = `
    <div class="title">JobTracker: application detected — save it?</div>
    <label>Company</label>
    <input class="company" type="text">
    <label>Role</label>
    <input class="role" type="text">
    <div class="buttons">
      <button class="save">Save</button>
      <button class="dismiss">Dismiss</button>
    </div>
    <div class="error" hidden></div>
  `;

  const companyInput = wrap.querySelector<HTMLInputElement>('.company')!;
  const roleInput = wrap.querySelector<HTMLInputElement>('.role')!;
  const errorEl = wrap.querySelector<HTMLElement>('.error')!;
  companyInput.value = candidate.company;
  roleInput.value = candidate.role_title;

  wrap.querySelector('.dismiss')!.addEventListener('click', () => host.remove());
  wrap.querySelector('.save')!.addEventListener('click', () => {
    const toSave: CandidateApplication = {
      ...candidate,
      company: companyInput.value.trim() || candidate.company,
      role_title: roleInput.value.trim() || candidate.role_title,
    };
    void (async () => {
      try {
        const response = (await chrome.runtime.sendMessage({
          type: 'SAVE_APPLICATION',
          candidate: toSave,
        })) as MessageResponse;
        if (!response?.ok) throw new Error(response?.error ?? 'Unknown error');
        host.remove();
      } catch (error) {
        errorEl.hidden = false;
        errorEl.textContent = `Could not save: ${error instanceof Error ? error.message : error}`;
      }
    })();
  });

  shadow.append(style, wrap);
  document.documentElement.append(host);
}
