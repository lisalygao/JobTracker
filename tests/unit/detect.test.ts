import { describe, expect, it } from 'vitest';
import {
  matchesAnyPattern,
  sourceFromHostname,
  textLooksLikeConfirmation,
  urlLooksLikeConfirmation,
} from '../../src/lib/detect';

const SOURCE_DOMAINS = {
  greenhouse: ['greenhouse.io'],
  lever: ['lever.co'],
  workday: ['myworkdayjobs.com', 'workday.com'],
};

describe('sourceFromHostname', () => {
  it('maps known ATS domains including subdomains', () => {
    expect(sourceFromHostname('boards.greenhouse.io', SOURCE_DOMAINS)).toBe('greenhouse');
    expect(sourceFromHostname('jobs.lever.co', SOURCE_DOMAINS)).toBe('lever');
    expect(sourceFromHostname('acme.wd5.myworkdayjobs.com', SOURCE_DOMAINS)).toBe('workday');
  });

  it('maps linkedin and unknown hosts', () => {
    expect(sourceFromHostname('www.linkedin.com', SOURCE_DOMAINS)).toBe('linkedin_easy_apply');
    expect(sourceFromHostname('careers.example.com', SOURCE_DOMAINS)).toBe('other');
  });

  it('does not match lookalike domains', () => {
    expect(sourceFromHostname('notgreenhouse.iolike.com', SOURCE_DOMAINS)).toBe('other');
    expect(sourceFromHostname('fakelever.co.evil.com', SOURCE_DOMAINS)).toBe('other');
  });
});

describe('confirmation heuristics', () => {
  const urlPatterns = ['confirmation', 'thank-you', 'success'];
  const textPatterns = ['application submitted', 'we received your application'];

  it('matches confirmation-looking URLs by path, not host', () => {
    expect(
      urlLooksLikeConfirmation('https://boards.greenhouse.io/acme/confirmation', urlPatterns),
    ).toBe(true);
    expect(urlLooksLikeConfirmation('https://jobs.lever.co/acme/thank-you?x=1', urlPatterns)).toBe(
      true,
    );
    expect(urlLooksLikeConfirmation('https://jobs.lever.co/acme/apply', urlPatterns)).toBe(false);
    // Pattern in hostname only should not trigger
    expect(urlLooksLikeConfirmation('https://success.example.com/jobs/1', urlPatterns)).toBe(false);
  });

  it('matches confirmation text case-insensitively', () => {
    expect(textLooksLikeConfirmation('Your Application Submitted!', textPatterns)).toBe(true);
    expect(textLooksLikeConfirmation('We received your application.', textPatterns)).toBe(true);
    expect(textLooksLikeConfirmation('Apply now', textPatterns)).toBe(false);
  });

  it('matchesAnyPattern handles empty inputs', () => {
    expect(matchesAnyPattern('', ['x'])).toBe(false);
    expect(matchesAnyPattern('anything', [])).toBe(false);
  });
});
