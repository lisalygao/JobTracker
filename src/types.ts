export type ApplicationSource =
  | 'linkedin_easy_apply'
  | 'linkedin_external'
  | 'greenhouse'
  | 'lever'
  | 'workday'
  | 'other';

export type ApplicationStatus = 'applied' | 'interviewing' | 'rejected' | 'offer' | 'withdrawn';

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'applied',
  'interviewing',
  'rejected',
  'offer',
  'withdrawn',
];

export interface Application {
  id: string;
  date_applied: string;
  company: string;
  role_title: string;
  source: ApplicationSource;
  posting_url: string;
  status: ApplicationStatus;
  resume_version_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResumeVersion {
  id: string;
  application_id: string;
  base_resume_snapshot: string;
  tailored_content: string;
  suggestions_given: string;
  created_at: string;
}

export interface Settings {
  apiKey: string;
  model: string;
  baseResume: string;
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  model: 'claude-opus-5',
  baseResume: '',
};

/** What a detector extracts before the user confirms via the toast. */
export interface CandidateApplication {
  company: string;
  role_title: string;
  posting_url: string;
  source: ApplicationSource;
}

export interface SelectorsConfig {
  linkedin: {
    jobTitle: string[];
    company: string[];
    easyApplyModal: string[];
    submittedTextPatterns: string[];
    jobDescription: string[];
  };
  ats: {
    confirmationUrlPatterns: string[];
    confirmationTextPatterns: string[];
    jobTitle: string[];
    companyMeta: string[];
    jobDescription: string[];
  };
  sourceDomains: Record<string, string[]>;
}

export type Message =
  | { type: 'SAVE_APPLICATION'; candidate: CandidateApplication }
  | { type: 'LIST_APPLICATIONS' }
  | { type: 'UPDATE_APPLICATION'; id: string; changes: Partial<Application> }
  | { type: 'DELETE_APPLICATION'; id: string }
  | { type: 'LIST_RESUME_VERSIONS'; applicationId: string }
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; settings: Settings }
  | { type: 'TAILOR_RESUME'; applicationId: string; jobDescription: string }
  | { type: 'APPLICATIONS_CHANGED' };

/** Sent from the side panel to the active tab's content script. */
export type TabMessage = { type: 'SCRAPE_JD' };

export interface MessageResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}
