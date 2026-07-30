import type { CandidateApplication, SelectorsConfig } from '../types';
import {
  firstSelectorText,
  sourceFromHostname,
  textLooksLikeConfirmation,
  urlLooksLikeConfirmation,
} from '../lib/detect';
import { loadSelectors } from './config';
import { registerJdScraper } from './scrape-jd';
import { showConfirmToast, toastIsOpen } from './toast';

// External ATS detector (design doc §3.2). Heuristic: confirmation-looking
// URL or confirmation text in the page. This will never be 100% reliable
// across every ATS — that's fine, because the confirm toast makes detection
// a low-stakes trigger rather than a silent write.

const firedUrls = new Set<string>();

function extractCandidate(config: SelectorsConfig): CandidateApplication {
  const { ats, sourceDomains } = config;
  let company = '';
  for (const selector of ats.companyMeta) {
    try {
      const meta = document.querySelector<HTMLMetaElement>(selector);
      if (meta?.content) {
        company = meta.content.trim();
        break;
      }
    } catch {
      /* bad selector in config — skip */
    }
  }
  if (!company) {
    // e.g. jobs.lever.co/acme → "acme"; boards.greenhouse.io/acme → path part
    const pathPart = location.pathname.split('/').filter(Boolean)[0] ?? '';
    company = pathPart || location.hostname.split('.')[0];
  }
  return {
    company,
    role_title: firstSelectorText(document, ats.jobTitle) || document.title,
    posting_url: location.href,
    source: sourceFromHostname(location.hostname, sourceDomains),
  };
}

async function main(): Promise<void> {
  const config = await loadSelectors();
  const { ats } = config;
  registerJdScraper(ats.jobDescription);

  const check = (): void => {
    if (toastIsOpen() || firedUrls.has(location.href)) return;
    const urlHit = urlLooksLikeConfirmation(location.href, ats.confirmationUrlPatterns);
    const textHit = textLooksLikeConfirmation(
      document.body?.innerText ?? '',
      ats.confirmationTextPatterns,
    );
    if (urlHit || textHit) {
      firedUrls.add(location.href);
      showConfirmToast(extractCandidate(config));
    }
  };

  // Many ATS flows are SPAs (Workday especially): watch for DOM and URL
  // changes rather than only checking once at load.
  const observer = new MutationObserver(() => check());
  observer.observe(document.body ?? document.documentElement, {
    childList: true,
    subtree: true,
  });
  check();
}

void main().catch((error) => console.warn('[JobTracker] ATS detector failed to start:', error));
