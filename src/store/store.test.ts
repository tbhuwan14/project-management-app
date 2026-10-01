import { canView } from '../lib/permissions';
import { loadPersisted, subscribePersistence } from './persistence';
import { containersSelectors, makeStore, permissionEntities, tasksSelectors } from './store';
import { setCurrentUser } from './slices/sessionSlice';

test('seed meets assignment minimums', () => {
  const state = makeStore().getState();
  const containers = containersSelectors.selectAll(state);
  expect(containers.filter((c) => c.type === 'workspace')).toHaveLength(1);
  expect(containers.filter((c) => c.type === 'space')).toHaveLength(2);
  expect(containers.filter((c) => c.type === 'folder')).toHaveLength(2);
  expect(containers.filter((c) => c.type === 'list')).toHaveLength(4);
  expect(tasksSelectors.selectAll(state).length).toBeGreaterThanOrEqual(15);
});

test('seed grant story: Bob denied Marketing, Carol allowed private roadmap', () => {
  const state = makeStore().getState();
  const e = permissionEntities(state);
  expect(canView(e, 'u-bob', 'l-content')).toBe(false);
  expect(canView(e, 'u-bob', 'l-roadmap')).toBe(false);
  expect(canView(e, 'u-bob', 'l-sprint')).toBe(true);
  expect(canView(e, 'u-carol', 'l-roadmap')).toBe(true);
  expect(canView(e, 'u-carol', 'l-sprint')).toBe(false);
});

test('persistence round-trips session state', () => {
  jest.useFakeTimers();
  try {
    localStorage.clear();
    const store = makeStore();
    subscribePersistence(store);
    store.dispatch(setCurrentUser('u-carol'));
    // Deterministically fire the debounced save, whatever its interval is.
    jest.runAllTimers();
    const persisted = loadPersisted();
    expect(persisted?.session?.currentUserId).toBe('u-carol');
  } finally {
    jest.useRealTimers();
    localStorage.clear();
  }
});
