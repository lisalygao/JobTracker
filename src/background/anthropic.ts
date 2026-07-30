import Anthropic from '@anthropic-ai/sdk';
import type { Settings } from '../types';

export interface TailoringResult {
  suggestions: string;
  tailored_resume: string;
}

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'string',
      description:
        'Specific, actionable tailoring tips with rationale, as markdown bullet points.',
    },
    tailored_resume: {
      type: 'string',
      description: 'The full tailored resume draft as plain text.',
    },
  },
  required: ['suggestions', 'tailored_resume'],
  additionalProperties: false,
} as const;

export async function tailorResume(
  settings: Settings,
  jobDescription: string,
  roleTitle: string,
  company: string,
): Promise<TailoringResult> {
  if (!settings.apiKey) {
    throw new Error('No API key configured. Add your Anthropic API key in Settings.');
  }
  if (!settings.baseResume.trim()) {
    throw new Error('No base resume configured. Paste your resume in Settings first.');
  }
  if (!jobDescription.trim()) {
    throw new Error('Job description is empty. Scrape it from the posting page or paste it.');
  }

  const client = new Anthropic({
    apiKey: settings.apiKey,
    // BYOK design: the user's own key, calls go directly from the extension.
    dangerouslyAllowBrowser: true,
  });

  const response = await client.messages.create({
    model: settings.model || 'claude-opus-5',
    max_tokens: 16000,
    system:
      'You are an expert resume writer. Tailor resumes to job descriptions truthfully: ' +
      'reorder, reword, and emphasize real experience from the base resume to match the role. ' +
      'Never invent experience, employers, titles, dates, or skills that are not in the base resume.',
    messages: [
      {
        role: 'user',
        content:
          `Tailor my resume for this role.\n\n` +
          `Role: ${roleTitle} at ${company}\n\n` +
          `<job_description>\n${jobDescription}\n</job_description>\n\n` +
          `<base_resume>\n${settings.baseResume}\n</base_resume>`,
      },
    ],
    output_config: {
      format: { type: 'json_schema', schema: OUTPUT_SCHEMA },
    },
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('The model declined this request.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('The response was truncated. Try a shorter resume or job description.');
  }

  const text = response.content.find((b) => b.type === 'text')?.text;
  if (!text) throw new Error('Empty response from the model.');

  const parsed = JSON.parse(text) as TailoringResult;
  if (typeof parsed.suggestions !== 'string' || typeof parsed.tailored_resume !== 'string') {
    throw new Error('Unexpected response shape from the model.');
  }
  return parsed;
}
