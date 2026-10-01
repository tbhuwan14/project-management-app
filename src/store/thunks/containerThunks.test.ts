import { FAKE_LATENCY } from '../../api/fakeApi';
import { setCurrentUser, setSimulateFailures } from '../slices/sessionSlice';
import { selectList } from '../slices/uiSlice';
import { containersSelectors, makeStore } from '../store';
import { archiveContainer, createContainer, renameContainer, reorderContainer } from './containerThunks';

beforeAll(() => { FAKE_LATENCY.ms = 0; });

test('admin creates a list under a folder', async () => {
  const store = makeStore();
  const res = await store.dispatch(createContainer({ name: 'New List', type: 'list', parentId: 'f-q4' }));
  expect(createContainer.fulfilled.match(res)).toBe(true);
  const created = containersSelectors.selectAll(store.getState()).find((c) => c.name === 'New List');
  expect(created?.type).toBe('list');
  expect(created?.parentId).toBe('f-q4');
});

test('member cannot create containers → FORBIDDEN, state untouched', async () => {
  const store = makeStore();
  store.dispatch(setCurrentUser('u-bob'));
  const before = containersSelectors.selectTotal(store.getState());
  const res = await store.dispatch(createContainer({ name: 'Nope', type: 'list', parentId: 'f-q4' }));
  expect(createContainer.rejected.match(res)).toBe(true);
  expect(res.payload).toEqual({ error: { code: 'FORBIDDEN', message: expect.any(String) } });
  expect(containersSelectors.selectTotal(store.getState())).toBe(before);
});

test('invalid parent type → VALIDATION', async () => {
  const store = makeStore();
  const res = await store.dispatch(createContainer({ name: 'Bad', type: 'list', parentId: 'sp-eng' }));
  expect(res.payload).toEqual({ error: { code: 'VALIDATION', message: expect.any(String) } });
});

test('simulateFailures → NETWORK', async () => {
  const store = makeStore();
  store.dispatch(setSimulateFailures(true));
  const res = await store.dispatch(renameContainer({ id: 'l-sprint', name: 'Sprint 2' }));
  expect(res.payload).toEqual({ error: { code: 'NETWORK', message: expect.any(String) } });
  expect(containersSelectors.selectById(store.getState(), 'l-sprint')?.name).toBe('Sprint 1');
});

test('archive cascades to descendants', async () => {
  const store = makeStore();
  await store.dispatch(archiveContainer({ id: 'f-q4' }));
  const state = store.getState();
  expect(containersSelectors.selectById(state, 'f-q4')?.archivedAt).not.toBeNull();
  expect(containersSelectors.selectById(state, 'l-sprint')?.archivedAt).not.toBeNull();
  expect(containersSelectors.selectById(state, 'l-backlog')?.archivedAt).not.toBeNull();
});

test('reorder updates position', async () => {
  const store = makeStore();
  await store.dispatch(reorderContainer({ id: 'sp-mkt', position: 100 }));
  expect(containersSelectors.selectById(store.getState(), 'sp-mkt')?.position).toBe(100);
});

test('archive cascades transitively across multiple levels', async () => {
  const store = makeStore();
  await store.dispatch(archiveContainer({ id: 'sp-eng' }));
  const state = store.getState();
  expect(containersSelectors.selectById(state, 'sp-eng')?.archivedAt).not.toBeNull();
  expect(containersSelectors.selectById(state, 'f-q4')?.archivedAt).not.toBeNull();
  expect(containersSelectors.selectById(state, 'l-backlog')?.archivedAt).not.toBeNull();
  expect(containersSelectors.selectById(state, 'l-sprint')?.archivedAt).not.toBeNull();
});

test('archiving the selected list clears the ui selection', async () => {
  const store = makeStore();
  store.dispatch(selectList('l-sprint'));
  await store.dispatch(archiveContainer({ id: 'f-q4' }));
  expect(store.getState().ui.selectedListId).toBeNull();
});

test('validation runs before the permission check', async () => {
  const store = makeStore();
  store.dispatch(setCurrentUser('u-bob'));
  const res = await store.dispatch(createContainer({ name: 'Bad', type: 'list', parentId: 'sp-eng' }));
  expect(res.payload).toEqual({ error: { code: 'VALIDATION', message: expect.any(String) } });
});
