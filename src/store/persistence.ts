import type { AppStore, PreloadedAppState } from './store';

const KEY = 'flowboard:v1';
const SAVE_DEBOUNCE_MS = 300;

export function loadPersisted(): PreloadedAppState | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as PreloadedAppState;
  } catch {
    return undefined;
  }
}

export function subscribePersistence(store: AppStore): void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  store.subscribe(() => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const { containers, tasks, statuses, users, grants, session } = store.getState();
      try {
        localStorage.setItem(KEY, JSON.stringify({ containers, tasks, statuses, users, grants, session }));
      } catch {
        // storage full/unavailable — persistence is best-effort
      }
    }, SAVE_DEBOUNCE_MS);
  });
}

export function clearPersisted(): void {
  localStorage.removeItem(KEY);
}
