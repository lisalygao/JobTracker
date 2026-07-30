import type {
  Application,
  ApplicationStatus,
  CandidateApplication,
  ResumeVersion,
  Settings,
} from '../types';
import { DEFAULT_SETTINGS } from '../types';

// All state lives in chrome.storage.local and is written through immediately:
// the MV3 service worker can be killed at any time, so nothing is kept in memory.

const KEYS = {
  applications: 'applications',
  resumeVersions: 'resume_versions',
  settings: 'settings',
} as const;

async function read<T>(key: string, fallback: T): Promise<T> {
  const result = await chrome.storage.local.get(key);
  return (result[key] as T | undefined) ?? fallback;
}

async function write(key: string, value: unknown): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

// Mutations are read-modify-write over whole arrays; two messages arriving
// close together (toast save + panel update) could otherwise interleave and
// drop a write. Serialize all mutations through one promise chain.
let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

export async function listApplications(): Promise<Application[]> {
  return read<Application[]>(KEYS.applications, []);
}

export function saveApplication(candidate: CandidateApplication): Promise<Application> {
  return withLock(() => saveApplicationImpl(candidate));
}

async function saveApplicationImpl(candidate: CandidateApplication): Promise<Application> {
  const now = new Date().toISOString();
  const application: Application = {
    id: crypto.randomUUID(),
    date_applied: now,
    company: candidate.company,
    role_title: candidate.role_title,
    source: candidate.source,
    posting_url: candidate.posting_url,
    status: 'applied' as ApplicationStatus,
    resume_version_id: null,
    notes: null,
    created_at: now,
    updated_at: now,
  };
  const applications = await listApplications();
  applications.unshift(application);
  await write(KEYS.applications, applications);
  return application;
}

export function updateApplication(
  id: string,
  changes: Partial<Application>,
): Promise<Application> {
  return withLock(() => updateApplicationImpl(id, changes));
}

// Unlocked internal used by both the locked export and saveResumeVersion
// (which already holds the lock — calling the export would deadlock).
async function updateApplicationImpl(
  id: string,
  changes: Partial<Application>,
): Promise<Application> {
  const applications = await listApplications();
  const index = applications.findIndex((a) => a.id === id);
  if (index === -1) throw new Error(`Application not found: ${id}`);
  const updated: Application = {
    ...applications[index],
    ...changes,
    id, // never allow id/created_at to change
    created_at: applications[index].created_at,
    updated_at: new Date().toISOString(),
  };
  applications[index] = updated;
  await write(KEYS.applications, applications);
  return updated;
}

export function deleteApplication(id: string): Promise<void> {
  return withLock(() => deleteApplicationImpl(id));
}

async function deleteApplicationImpl(id: string): Promise<void> {
  const applications = await listApplications();
  await write(
    KEYS.applications,
    applications.filter((a) => a.id !== id),
  );
  const versions = await read<ResumeVersion[]>(KEYS.resumeVersions, []);
  await write(
    KEYS.resumeVersions,
    versions.filter((v) => v.application_id !== id),
  );
}

export async function listResumeVersions(applicationId: string): Promise<ResumeVersion[]> {
  const versions = await read<ResumeVersion[]>(KEYS.resumeVersions, []);
  return versions.filter((v) => v.application_id === applicationId);
}

export function saveResumeVersion(
  version: Omit<ResumeVersion, 'id' | 'created_at'>,
): Promise<ResumeVersion> {
  return withLock(async () => {
    const full: ResumeVersion = {
      ...version,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    const versions = await read<ResumeVersion[]>(KEYS.resumeVersions, []);
    versions.unshift(full);
    await write(KEYS.resumeVersions, versions);
    await updateApplicationImpl(full.application_id, { resume_version_id: full.id });
    return full;
  });
}

export async function getSettings(): Promise<Settings> {
  const stored = await read<Partial<Settings>>(KEYS.settings, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function saveSettings(settings: Settings): Promise<void> {
  return withLock(() => write(KEYS.settings, settings));
}
