import type { SelectorsConfig } from '../types';

/** Load selectors.json from the extension bundle (see §3.4 of the design doc). */
export async function loadSelectors(): Promise<SelectorsConfig> {
  const url = chrome.runtime.getURL('config/selectors.json');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load selectors.json: ${response.status}`);
  return (await response.json()) as SelectorsConfig;
}
