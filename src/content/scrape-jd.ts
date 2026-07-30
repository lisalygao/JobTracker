import type { MessageResponse, TabMessage } from '../types';
import { firstSelectorText } from '../lib/detect';

const MAX_JD_LENGTH = 20_000;

/**
 * Register a listener so the side panel can request the job description from
 * the active tab (auto-scrape with manual-paste fallback in the panel UI).
 */
export function registerJdScraper(selectors: string[]): void {
  chrome.runtime.onMessage.addListener(
    (message: TabMessage, _sender, sendResponse: (response: MessageResponse<string>) => void) => {
      if (message?.type !== 'SCRAPE_JD') return;
      const text = firstSelectorText(document, selectors) || document.body?.innerText || '';
      sendResponse({ ok: true, data: text.trim().slice(0, MAX_JD_LENGTH) });
    },
  );
}
