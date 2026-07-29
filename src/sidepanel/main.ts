import type { Application, Message, ResumeVersion, Settings } from '../types';
import { send } from './messaging';
import { renderList, type ListFilters } from './views/list';
import { renderDetail } from './views/detail';
import { renderSettings } from './views/settings';

type Route = { view: 'list' } | { view: 'detail'; id: string } | { view: 'settings' };

const app = document.getElementById('app')!;
const navList = document.getElementById('nav-list')!;
const navSettings = document.getElementById('nav-settings')!;

let route: Route = { view: 'list' };
let filters: ListFilters = { status: '', company: '', from: '', to: '' };

async function render(): Promise<void> {
  navList.classList.toggle('active', route.view !== 'settings');
  navSettings.classList.toggle('active', route.view === 'settings');

  try {
    if (route.view === 'settings') {
      const settings = await send<Settings>({ type: 'GET_SETTINGS' });
      renderSettings(app, settings);
      return;
    }

    const applications = await send<Application[]>({ type: 'LIST_APPLICATIONS' });

    if (route.view === 'detail') {
      const id = route.id;
      const application = applications.find((a) => a.id === id);
      if (!application) {
        route = { view: 'list' };
        return render();
      }
      const versions = await send<ResumeVersion[]>({
        type: 'LIST_RESUME_VERSIONS',
        applicationId: id,
      });
      renderDetail(app, application, versions, {
        onBack: () => {
          route = { view: 'list' };
          void render();
        },
        onChanged: () => void render(),
      });
      return;
    }

    renderList(app, applications, filters, {
      onFiltersChange: (next) => {
        filters = next;
        void render();
      },
      onOpen: (id) => {
        route = { view: 'detail', id };
        void render();
      },
    });
  } catch (error) {
    app.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'error';
    p.textContent = `Something went wrong: ${error instanceof Error ? error.message : error}`;
    app.append(p);
  }
}

navList.addEventListener('click', () => {
  route = { view: 'list' };
  void render();
});
navSettings.addEventListener('click', () => {
  route = { view: 'settings' };
  void render();
});

// Live-refresh when the background worker saves/updates records.
chrome.runtime.onMessage.addListener((message: Message) => {
  if (message?.type === 'APPLICATIONS_CHANGED' && route.view !== 'settings') {
    void render();
  }
});

void render();
