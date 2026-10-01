import { FAKE_LATENCY } from '../../api/fakeApi';
import { setCurrentUser } from '../slices/sessionSlice';
import { makeStore, tasksSelectors } from '../store';
import { archiveTask, createTask, moveTask, updateTask } from './taskThunks';

beforeAll(() => { FAKE_LATENCY.ms = 0; });

test('member creates a task in an accessible list', async () => {
  const store = makeStore();
  store.dispatch(setCurrentUser('u-bob'));
  const res = await store.dispatch(createTask({ listId: 'l-sprint', title: 'Bob task' }));
  expect(createTask.fulfilled.match(res)).toBe(true);
  const task = res.payload as { id: string; statusId: string };
  expect(task.statusId).toBe('l-sprint-todo');
});

test('member cannot create a task in a denied list → FORBIDDEN', async () => {
  const store = makeStore();
  store.dispatch(setCurrentUser('u-bob'));
  const before = tasksSelectors.selectTotal(store.getState());
  const res = await store.dispatch(createTask({ listId: 'l-content', title: 'Nope' }));
  expect(res.payload).toEqual({ error: { code: 'FORBIDDEN', message: expect.any(String) } });
  expect(tasksSelectors.selectTotal(store.getState())).toBe(before);
});

test('title validation enforced on create and update', async () => {
  const store = makeStore();
  const r1 = await store.dispatch(createTask({ listId: 'l-sprint', title: '   ' }));
  expect((r1.payload as { error: { code: string } }).error.code).toBe('VALIDATION');
  const r2 = await store.dispatch(updateTask({ id: 't-6', changes: { title: 'x'.repeat(501) } }));
  expect((r2.payload as { error: { code: string } }).error.code).toBe('VALIDATION');
});

test('updateTask rejects a status from another list', async () => {
  const store = makeStore();
  const res = await store.dispatch(updateTask({ id: 't-6', changes: { statusId: 'l-content-todo' } }));
  expect((res.payload as { error: { code: string } }).error.code).toBe('VALIDATION');
});

test('subtask: depth-1 enforced', async () => {
  const store = makeStore();
  const sub = await store.dispatch(createTask({ listId: 'l-sprint', title: 'Sub', parentTaskId: 't-6' }));
  expect(createTask.fulfilled.match(sub)).toBe(true);
  const subId = (sub.payload as { id: string }).id;
  const nested = await store.dispatch(createTask({ listId: 'l-sprint', title: 'Nested', parentTaskId: subId }));
  expect((nested.payload as { error: { code: string } }).error.code).toBe('VALIDATION');
});

test('cross-list move remaps status by category and moves subtasks', async () => {
  const store = makeStore();
  const sub = await store.dispatch(createTask({ listId: 'l-sprint', title: 'Sub of t-8', parentTaskId: 't-8' }));
  const subId = (sub.payload as { id: string }).id;
  // t-8 is in_progress in Sprint; move it to Backlog's in-progress column
  const res = await store.dispatch(moveTask({ id: 't-8', toListId: 'l-backlog', statusId: 'l-backlog-prog', position: 50 }));
  expect(moveTask.fulfilled.match(res)).toBe(true);
  const state = store.getState();
  expect(tasksSelectors.selectById(state, 't-8')?.primaryListId).toBe('l-backlog');
  const movedSub = tasksSelectors.selectById(state, subId);
  expect(movedSub?.primaryListId).toBe('l-backlog');
  expect(movedSub?.statusId).toBe('l-backlog-todo'); // subtask was todo in Sprint → todo in Backlog
});

test('move requires edit rights on the target list too', async () => {
  const store = makeStore();
  store.dispatch(setCurrentUser('u-bob'));
  const res = await store.dispatch(moveTask({ id: 't-6', toListId: 'l-content', statusId: 'l-content-todo', position: 50 }));
  expect((res.payload as { error: { code: string } }).error.code).toBe('FORBIDDEN');
});

test('archiveTask cascades to subtasks', async () => {
  const store = makeStore();
  const sub = await store.dispatch(createTask({ listId: 'l-sprint', title: 'Sub', parentTaskId: 't-6' }));
  const subId = (sub.payload as { id: string }).id;
  await store.dispatch(archiveTask({ id: 't-6' }));
  const state = store.getState();
  expect(tasksSelectors.selectById(state, 't-6')?.archivedAt).not.toBeNull();
  expect(tasksSelectors.selectById(state, subId)?.archivedAt).not.toBeNull();
});
