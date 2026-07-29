import type { ApplicationSource } from '../types';

/** Map a hostname to an Application source using the domain lists from selectors.json. */
export function sourceFromHostname(
  hostname: string,
  sourceDomains: Record<string, string[]>,
): ApplicationSource {
  const host = hostname.toLowerCase();
  if (host.endsWith('linkedin.com') || host === 'linkedin.com') return 'linkedin_easy_apply';
  for (const [source, domains] of Object.entries(sourceDomains)) {
    if (domains.some((d) => host === d || host.endsWith(`.${d}`))) {
      return source as ApplicationSource;
    }
  }
  return 'other';
}

/** Case-insensitive substring match against a pattern list. */
export function matchesAnyPattern(text: string, patterns: string[]): boolean {
  const haystack = text.toLowerCase();
  return patterns.some((p) => haystack.includes(p.toLowerCase()));
}

export function urlLooksLikeConfirmation(url: string, patterns: string[]): boolean {
  let pathAndQuery: string;
  try {
    const u = new URL(url);
    pathAndQuery = `${u.pathname}${u.search}`;
  } catch {
    pathAndQuery = url;
  }
  return matchesAnyPattern(pathAndQuery, patterns);
}

export function textLooksLikeConfirmation(text: string, patterns: string[]): boolean {
  return matchesAnyPattern(text, patterns);
}

/** Try selectors in order; return the first non-empty text content. */
export function firstSelectorText(root: ParentNode, selectors: string[]): string {
  for (const selector of selectors) {
    let el: Element | null = null;
    try {
      el = root.querySelector(selector);
    } catch {
      continue; // bad selector in config shouldn't kill the detector
    }
    const text = el?.textContent?.trim();
    if (text) return text;
  }
  return '';
}
