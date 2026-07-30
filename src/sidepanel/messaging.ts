import type { Message, MessageResponse, TabMessage } from '../types';

export async function send<T>(message: Message): Promise<T> {
  const response = (await chrome.runtime.sendMessage(message)) as MessageResponse<T> | undefined;
  if (!response?.ok) throw new Error(response?.error ?? 'No response from background worker');
  return response.data as T;
}

/** Ask the active tab's content script for the job description text. */
export async function scrapeActiveTabJd(): Promise<string> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab.');
  try {
    const message: TabMessage = { type: 'SCRAPE_JD' };
    const response = (await chrome.tabs.sendMessage(tab.id, message)) as
      | MessageResponse<string>
      | undefined;
    if (!response?.ok || !response.data) throw new Error('Nothing scraped');
    return response.data;
  } catch {
    throw new Error(
      'Could not scrape this tab (not a supported job page). Paste the job description manually.',
    );
  }
}
