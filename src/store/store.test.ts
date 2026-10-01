import { canView } from '../lib/permissions';
import { loadPersisted, subscribePersistence } from './persistence';
import { appReset, containersSelectors, makeStore, permissionEntities, tasksSelectors } from './store';
import { setCurrentUser, setSimulateFailures } from './slices/sessionSlice';
import { taskPatched } from './slices/tasksSlice';
import { markBooted } from './slices/uiSlice';

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

test('appReset restores all entity slices, resets session, and keeps booted true', () => {
  const store = makeStore();
  store.dispatch(markBooted());
  store.dispatch(setCurrentUser('u-carol'));
  store.dispatch(setSimulateFailures(true));
  store.dispatch(taskPatched({ id: 't-1', changes: { archivedAt: '2026-10-01T00:00:00.000Z' } }));

  // Sanity: the store is actually dirty before reset.
  expect(tasksSelectors.selectById(store.getState(), 't-1')?.archivedAt).not.toBeNull();
  expect(store.getState().session.currentUserId).toBe('u-carol');
  expect(store.getState().session.simulateFailures).toBe(true);

  store.dispatch(appReset());

  const state = store.getState();
  const fresh = makeStore().getState();
  expect(state.containers).toEqual(fresh.containers);
  expect(state.tasks).toEqual(fresh.tasks);
  expect(state.statuses).toEqual(fresh.statuses);
  expect(state.users).toEqual(fresh.users);
  expect(state.grants).toEqual(fresh.grants);
  expect(state.session).toEqual({ currentUserId: 'u-alice', simulateFailures: false });
  expect(state.ui.booted).toBe(true);
});

test('appReset keeps booted true even if reset before the app ever booted', () => {
  const store = makeStore();
  expect(store.getState().ui.booted).toBe(false);
  store.dispatch(appReset());
  expect(store.getState().ui.booted).toBe(true);
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
