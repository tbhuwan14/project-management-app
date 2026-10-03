import { FAKE_LATENCY } from '../../api/fakeApi';
import { setCurrentUser, setSimulateFailures } from '../slices/sessionSlice';
import { containerPatched } from '../slices/containersSlice';
import { taskPatched } from '../slices/tasksSlice';
import { containersSelectors, makeStore, tasksSelectors } from '../store';
import { createTask, updateTask } from './taskThunks';
import { moveTaskWithRollback, reorderContainerWithRollback } from './optimistic';

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
  // Dirty a field outside the set the optimistic patch touches (primaryListId/statusId/
  // position), so the assertion below can't be satisfied by a rollback that only reverts
  // those three fields instead of restoring the whole prior entity.
  store.dispatch(taskPatched({ id: 't-6', changes: { description: 'dirty', priority: 'high' } }));
  const before = tasksSelectors.selectById(store.getState(), 't-6')!;
  store.dispatch(setSimulateFailures(true));
  const err = await moveTaskWithRollback(store.dispatch, store.getState, {
    id: 't-6', toListId: 'l-sprint', statusId: 'l-sprint-done', position: 9999,
  });
  expect(err?.error.code).toBe('NETWORK');
  const after = tasksSelectors.selectById(store.getState(), 't-6')!;
  expect(after).toEqual(before);
  expect(after.description).toBe('dirty');
  expect(after.priority).toBe('high');
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

test('cross-list move via the wrapper carries subtasks with a remapped status', async () => {
  const store = makeStore();
  const sub = await store.dispatch(createTask({ listId: 'l-sprint', title: 'Sub of t-8', parentTaskId: 't-8' }));
  const subId = (sub.payload as { id: string }).id;
  // Push the subtask into a non-todo category so the remap is actually exercised.
  await store.dispatch(updateTask({ id: subId, changes: { statusId: 'l-sprint-prog' } }));
  const err = await moveTaskWithRollback(store.dispatch, store.getState, {
    id: 't-8', toListId: 'l-backlog', statusId: 'l-backlog-prog', position: 50,
  });
  expect(err).toBeNull();
  const state = store.getState();
  expect(tasksSelectors.selectById(state, 't-8')?.primaryListId).toBe('l-backlog');
  const movedSub = tasksSelectors.selectById(state, subId);
  expect(movedSub?.primaryListId).toBe('l-backlog');
  expect(movedSub?.statusId).toBe('l-backlog-prog');
});

test('a denied source list cannot be bypassed by moving into a list the user can edit', async () => {
  // Regression test for the Critical defect: the optimistic pre-patch used to overwrite
  // primaryListId before moveTask's body ran, so its permission check only ever saw the
  // (already-patched) destination list on both sides. t-13 lives in l-content, which is
  // entirely denied to Bob (not just edit-denied — canView is false), while l-sprint is
  // freely editable by Bob. Before the fromListId fix this wrongly resolved to success.
  const store = makeStore();
  store.dispatch(setCurrentUser('u-bob'));
  const before = tasksSelectors.selectById(store.getState(), 't-13')!;
  const err = await moveTaskWithRollback(store.dispatch, store.getState, {
    id: 't-13', toListId: 'l-sprint', statusId: 'l-sprint-todo', position: 9999,
  });
  expect(err?.error.code).toBe('FORBIDDEN');
  expect(tasksSelectors.selectById(store.getState(), 't-13')).toEqual(before);
});

test('reorderContainerWithRollback: successful reorder sticks', async () => {
  const store = makeStore();
  const err = await reorderContainerWithRollback(store.dispatch, store.getState, { id: 'l-sprint', position: 4096 });
  expect(err).toBeNull();
  expect(containersSelectors.selectById(store.getState(), 'l-sprint')?.position).toBe(4096);
});

test('reorderContainerWithRollback: failed reorder rolls back the full snapshot and toasts', async () => {
  const store = makeStore();
  // Same discriminating trick as the task test: dirty a field outside the patch set first.
  store.dispatch(containerPatched({ id: 'l-sprint', changes: { name: 'Dirty Name' } }));
  const before = containersSelectors.selectById(store.getState(), 'l-sprint')!;
  store.dispatch(setSimulateFailures(true));
  const err = await reorderContainerWithRollback(store.dispatch, store.getState, { id: 'l-sprint', position: 4096 });
  expect(err?.error.code).toBe('NETWORK');
  const after = containersSelectors.selectById(store.getState(), 'l-sprint')!;
  expect(after).toEqual(before);
  expect(after.name).toBe('Dirty Name');
  expect(store.getState().ui.toasts).toHaveLength(1);
  expect(store.getState().ui.toasts[0].tone).toBe('error');
});
