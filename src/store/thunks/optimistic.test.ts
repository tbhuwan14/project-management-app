import { FAKE_LATENCY } from '../../api/fakeApi';
import { setCurrentUser, setSimulateFailures } from '../slices/sessionSlice';
import { makeStore, tasksSelectors } from '../store';
import { moveTaskWithRollback } from './optimistic';

beforeAll(() => { FAKE_LATENCY.ms = 0; });

test('successful move sticks', async () => {
  const store = makeStore();
  const err = await moveTaskWithRollback(store.dispatch, store.getState, {
    id: 't-6', toListId: 'l-sprint', statusId: 'l-sprint-done', position: 9999,
  });
  expect(err).toBeNull();
  expect(tasksSelectors.selectById(store.getState(), 't-6')?.statusId).toBe('l-sprint-done');
});

test('failed move rolls back to the snapshot and toasts', async () => {
  const store = makeStore();
  const before = tasksSelectors.selectById(store.getState(), 't-6')!;
  store.dispatch(setSimulateFailures(true));
  const err = await moveTaskWithRollback(store.dispatch, store.getState, {
    id: 't-6', toListId: 'l-sprint', statusId: 'l-sprint-done', position: 9999,
  });
  expect(err?.error.code).toBe('NETWORK');
  const after = tasksSelectors.selectById(store.getState(), 't-6')!;
  expect(after).toEqual(before);
  expect(store.getState().ui.toasts).toHaveLength(1);
  expect(store.getState().ui.toasts[0].tone).toBe('error');
});

test('forbidden move rolls back too', async () => {
  const store = makeStore();
  store.dispatch(setCurrentUser('u-bob'));
  const before = tasksSelectors.selectById(store.getState(), 't-13')!; // Content Calendar task, denied for Bob
  const err = await moveTaskWithRollback(store.dispatch, store.getState, {
    id: 't-13', toListId: 'l-content', statusId: 'l-content-done', position: 9999,
  });
  expect(err?.error.code).toBe('FORBIDDEN');
  expect(tasksSelectors.selectById(store.getState(), 't-13')).toEqual(before);
});
