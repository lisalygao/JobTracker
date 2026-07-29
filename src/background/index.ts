import type { Message, MessageResponse } from '../types';
import {
  deleteApplication,
  getSettings,
  listApplications,
  listResumeVersions,
  saveApplication,
  saveResumeVersion,
  saveSettings,
  updateApplication,
} from './storage';
import { tailorResume } from './anthropic';

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

function broadcastChange(): void {
  // Notify any open side panel; ignore "no receiver" errors when it's closed.
  chrome.runtime.sendMessage({ type: 'APPLICATIONS_CHANGED' } satisfies Message).catch(() => {});
}

async function handleMessage(message: Message): Promise<unknown> {
  switch (message.type) {
    case 'SAVE_APPLICATION': {
      const app = await saveApplication(message.candidate);
      broadcastChange();
      return app;
    }
    case 'LIST_APPLICATIONS':
      return listApplications();
    case 'UPDATE_APPLICATION': {
      const app = await updateApplication(message.id, message.changes);
      broadcastChange();
      return app;
    }
    case 'DELETE_APPLICATION':
      await deleteApplication(message.id);
      broadcastChange();
      return null;
    case 'LIST_RESUME_VERSIONS':
      return listResumeVersions(message.applicationId);
    case 'GET_SETTINGS':
      return getSettings();
    case 'SAVE_SETTINGS':
      await saveSettings(message.settings);
      return null;
    case 'TAILOR_RESUME': {
      const [settings, applications] = await Promise.all([getSettings(), listApplications()]);
      const application = applications.find((a) => a.id === message.applicationId);
      if (!application) throw new Error('Application not found.');
      const result = await tailorResume(
        settings,
        message.jobDescription,
        application.role_title,
        application.company,
      );
      const version = await saveResumeVersion({
        application_id: application.id,
        base_resume_snapshot: settings.baseResume,
        tailored_content: result.tailored_resume,
        suggestions_given: result.suggestions,
      });
      broadcastChange();
      return version;
    }
    case 'APPLICATIONS_CHANGED':
      return null; // broadcast-only message, nothing to do here
  }
}

chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse: (response: MessageResponse) => void) => {
    handleMessage(message)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error: unknown) => {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
      });
    return true; // keep the message channel open for the async response
  },
);
