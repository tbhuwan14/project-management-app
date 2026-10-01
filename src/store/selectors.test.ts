import { setCurrentUser } from './slices/sessionSlice';
import { selectList, setListSort } from './slices/uiSlice';
import {
  selectAccessibleSelectedListId, selectBoardColumns, selectListRows, selectVisibleTree,
} from './selectors';
import { makeStore } from './store';

const flatten = (nodes: ReturnType<typeof selectVisibleTree>): string[] =>
  nodes.flatMap((n) => [n.container.id, ...flatten(n.children)]);

test('Alice sees the whole tree', () => {
  const state = makeStore().getState();
  expect(flatten(selectVisibleTree(state)).sort()).toEqual(
    ['ws-1', 'sp-eng', 'sp-mkt', 'f-q4', 'f-web', 'l-backlog', 'l-sprint', 'l-content', 'l-roadmap'].sort(),
  );
});

test('Bob sees Engineering only', () => {
  const store = makeStore();
  store.dispatch(setCurrentUser('u-bob'));
  const ids = flatten(selectVisibleTree(store.getState()));
  expect(ids).toContain('l-sprint');
  expect(ids).not.toContain('sp-mkt');
  expect(ids).not.toContain('l-roadmap');
});

test('Carol sees private roadmap but not the Q4 folder', () => {
  const store = makeStore();
  store.dispatch(setCurrentUser('u-carol'));
  const ids = flatten(selectVisibleTree(store.getState()));
  expect(ids).toContain('l-roadmap');
  expect(ids).not.toContain('f-q4');
  expect(ids).not.toContain('l-sprint');
});

test('selected list becomes inaccessible after user switch', () => {
  const store = makeStore();
  store.dispatch(selectList('l-content'));
  expect(selectAccessibleSelectedListId(store.getState())).toBe('l-content');
  store.dispatch(setCurrentUser('u-bob'));
  expect(selectAccessibleSelectedListId(store.getState())).toBeNull();
});

test('board columns group tasks by status in position order', () => {
  const state = makeStore().getState();
  const columns = selectBoardColumns(state, 'l-sprint');
  expect(columns.map((c) => c.status.name)).toEqual(['To Do', 'In Progress', 'In Review', 'Done']);
  const progress = columns.find((c) => c.status.id === 'l-sprint-prog')!;
  expect(progress.tasks.map((t) => t.id)).toEqual(['t-8', 't-9']);
});

test('list rows sort by priority rank', () => {
  const store = makeStore();
  store.dispatch(setListSort({ key: 'priority', dir: 'asc' }));
  const rows = selectListRows(store.getState(), 'l-sprint');
  expect(rows[0].priority).toBe('urgent');
  expect(rows[rows.length - 1].priority).toBe('low');
});

test('list rows sort by dueDate with nulls last', () => {
  const store = makeStore();
  store.dispatch(setListSort({ key: 'dueDate', dir: 'asc' }));
  const rows = selectListRows(store.getState(), 'l-sprint');
  expect(rows[0].id).toBe('t-11'); // earliest due 2026-09-25
  expect(rows[rows.length - 1].dueDate).toBeNull();
});
