import type { CandidateApplication } from '../types';
import { firstSelectorText, matchesAnyPattern } from '../lib/detect';
import { loadSelectors } from './config';
import { registerJdScraper } from './scrape-jd';
import { showConfirmToast, toastIsOpen } from './toast';

// LinkedIn Easy Apply detector (design doc §3.1).
// Fires only when the Easy Apply modal reaches its "application submitted"
// confirmation state — not on the Submit click, which can fail. If LinkedIn
// redirects out to an external ATS instead, this script does nothing; the
// ATS detector owns that flow.

const COOLDOWN_MS = 60_000;
let lastFiredAt = 0;
let lastFiredUrl = '';

function extractCandidate(selectors: {
  jobTitle: string[];
  company: string[];
}): CandidateApplication {
  return {
    company: firstSelectorText(document, selectors.company),
    role_title: firstSelectorText(document, selectors.jobTitle) || document.title,
    posting_url: location.href,
    source: 'linkedin_easy_apply',
  };
}

async function main(): Promise<void> {
  const config = await loadSelectors();
  const { linkedin } = config;
  registerJdScraper(linkedin.jobDescription);

  const check = (): void => {
    if (toastIsOpen()) return;
    const now = Date.now();
    if (now - lastFiredAt < COOLDOWN_MS && location.href === lastFiredUrl) return;

    for (const modalSelector of linkedin.easyApplyModal) {
      let modals: NodeListOf<Element>;
      try {
        modals = document.querySelectorAll(modalSelector);
      } catch {
        continue;
      }
      for (const modal of modals) {
        const text = modal.textContent ?? '';
        if (matchesAnyPattern(text, linkedin.submittedTextPatterns)) {
          lastFiredAt = now;
          lastFiredUrl = location.href;
          showConfirmToast(extractCandidate(linkedin));
          return;
        }
      }
    }
  };

  const observer = new MutationObserver(() => check());
  observer.observe(document.body ?? document.documentElement, {
    childList: true,
    subtree: true,
  });
  check();
}

void main().catch((error) => console.warn('[JobTracker] LinkedIn detector failed to start:', error));
