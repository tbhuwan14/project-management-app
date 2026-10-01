import '@testing-library/jest-dom';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FAKE_LATENCY } from '../../api/fakeApi';
import { renderApp } from '../../test/renderApp';
import { tasksSelectors } from '../../store/store';
import { createTask } from '../../store/thunks/taskThunks';

beforeAll(() => { FAKE_LATENCY.ms = 0; });

const uiWithDrawer = {
  ui: {
    booted: true, selectedListId: 'l-sprint', viewMode: 'board' as const,
    drawerTaskId: 't-6', toasts: [], listSort: null,
  },
};

test('drawer shows the task and closes on Escape', async () => {
  const user = userEvent.setup();
  const store = renderApp(uiWithDrawer);
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
  expect(screen.getByDisplayValue('Implement login screen')).toBeInTheDocument();
  await user.keyboard('{Escape}');
  expect(store.getState().ui.drawerTaskId).toBeNull();
});

test('clicking the overlay closes the drawer', async () => {
  const user = userEvent.setup();
  const store = renderApp(uiWithDrawer);
  await screen.findByRole('dialog');
  await user.click(screen.getByTestId('drawer-overlay'));
  await waitFor(() => expect(store.getState().ui.drawerTaskId).toBeNull());
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('editing the title commits on blur', async () => {
  const user = userEvent.setup();
  const store = renderApp(uiWithDrawer);
  const title = await screen.findByDisplayValue('Implement login screen');
  await user.clear(title);
  await user.type(title, 'Login screen v2');
  await user.tab();
  const updated = await screen.findByDisplayValue('Login screen v2');
  expect(updated).toBeInTheDocument();
  expect(tasksSelectors.selectById(store.getState(), 't-6')?.title).toBe('Login screen v2');
});

test('typing in the title field survives an unrelated task update (no fighting keystrokes)', async () => {
  const user = userEvent.setup();
  const store = renderApp(uiWithDrawer);
  const title = await screen.findByLabelText('Title');
  await user.clear(title);
  await user.type(title, 'Partial edit in progress');
  // Trigger an unrelated commit on the SAME task, forcing a store update + re-render
  // while the title field still holds uncommitted local text.
  await user.selectOptions(screen.getByLabelText('Priority'), 'high');
  await waitFor(() => expect(tasksSelectors.selectById(store.getState(), 't-6')?.priority).toBe('high'));
  expect(screen.getByLabelText('Title')).toHaveValue('Partial edit in progress');
});

test('a failed title commit reverts the field and shows an error toast', async () => {
  const user = userEvent.setup();
  const store = renderApp({
    ...uiWithDrawer,
    session: { currentUserId: 'u-alice', simulateFailures: true },
  });
  const title = await screen.findByDisplayValue('Implement login screen');
  await user.clear(title);
  await user.type(title, 'Will not save');
  await user.tab();
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(await screen.findByDisplayValue('Implement login screen')).toBeInTheDocument();
  expect(tasksSelectors.selectById(store.getState(), 't-6')?.title).toBe('Implement login screen');
});

test('changing status moves the card column', async () => {
  const user = userEvent.setup();
  const store = renderApp(uiWithDrawer);
  await user.selectOptions(await screen.findByLabelText('Status'), 'l-sprint-done');
  await new Promise((r) => setTimeout(r, 10));
  expect(tasksSelectors.selectById(store.getState(), 't-6')?.statusId).toBe('l-sprint-done');
});

test('the status dropdown offers only the statuses belonging to the task’s own list', async () => {
  renderApp(uiWithDrawer);
  const select = await screen.findByLabelText('Status');
  const values = within(select).getAllByRole('option').map((o) => (o as HTMLOptionElement).value);
  expect(values).toEqual(['l-sprint-todo', 'l-sprint-prog', 'l-sprint-review', 'l-sprint-done']);
  expect(values).not.toContain('l-backlog-todo');
  expect(values).not.toContain('l-content-todo');
});

test('moving to another list remaps the status by category and carries subtasks along', async () => {
  const user = userEvent.setup();
  const store = renderApp(uiWithDrawer);
  await screen.findByRole('dialog');
  await user.click(await screen.findByText('+ Add subtask'));
  await user.keyboard('Carry me{Enter}');
  const subtask = await screen.findByText('Carry me');
  const subtaskId = Object.values(store.getState().tasks.entities).find((t) => t?.title === 'Carry me')!.id;
  expect(subtask).toBeInTheDocument();

  await user.selectOptions(screen.getByLabelText('Move to list'), 'l-backlog');
  await waitFor(() => expect(tasksSelectors.selectById(store.getState(), 't-6')?.primaryListId).toBe('l-backlog'));
  const moved = tasksSelectors.selectById(store.getState(), 't-6')!;
  expect(moved.statusId).toBe('l-backlog-todo'); // same "todo" category remapped into the new list
  const movedSub = tasksSelectors.selectById(store.getState(), subtaskId)!;
  expect(movedSub.primaryListId).toBe('l-backlog');
});

test('moving to a list the user cannot edit at the source is rejected and toasts an error', async () => {
  const user = userEvent.setup();
  // t-17 ("FY27 headcount plan") lives in l-roadmap, under the private sp-mkt space.
  // u-bob is explicitly denied sp-mkt, so he can edit neither list-roadmap task nor
  // move it away: the thunk must read the TRUE source list (l-roadmap), not an
  // already-patched one, to catch this.
  const store = renderApp({
    ui: {
      booted: true, selectedListId: 'l-sprint', viewMode: 'board' as const,
      drawerTaskId: 't-17', toasts: [], listSort: null,
    },
    session: { currentUserId: 'u-bob', simulateFailures: false },
  });
  await screen.findByRole('dialog');
  await user.selectOptions(screen.getByLabelText('Move to list'), 'l-sprint');
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(tasksSelectors.selectById(store.getState(), 't-17')?.primaryListId).toBe('l-roadmap');
});

test('adding a subtask shows it in the checklist', async () => {
  renderApp(uiWithDrawer);
  const user = userEvent.setup();
  await user.click(await screen.findByText('+ Add subtask'));
  await user.keyboard('Write unit tests{Enter}');
  expect(await screen.findByText('Write unit tests')).toBeInTheDocument();
});

test('a subtask never gains its own "add subtask" affordance (max depth 1)', async () => {
  const store = renderApp(uiWithDrawer);
  const user = userEvent.setup();
  await user.click(await screen.findByText('+ Add subtask'));
  await user.keyboard('Only child{Enter}');
  await screen.findByText('Only child');
  // Exactly one "+ Add subtask" affordance must exist: the parent's. If subtasks could
  // recursively grow their own checklist, a second one would appear here.
  expect(screen.getAllByText('+ Add subtask')).toHaveLength(1);
  expect(store.getState().tasks.entities['t-6']?.parentTaskId).toBeFalsy();
});

test('toggling a subtask flips it between the done and todo status categories', async () => {
  const store = renderApp(uiWithDrawer);
  await act(async () => {
    await store.dispatch(createTask({ listId: 'l-sprint', title: 'Toggle me', parentTaskId: 't-6' }));
  });
  const user = userEvent.setup();
  const checkbox = await screen.findByLabelText('Toggle Toggle me');
  expect(checkbox).not.toBeChecked();
  const subtaskId = Object.values(store.getState().tasks.entities).find((t) => t?.title === 'Toggle me')!.id;
  expect(tasksSelectors.selectById(store.getState(), subtaskId)?.statusId).toBe('l-sprint-todo');

  await user.click(checkbox);
  await waitFor(() => expect(tasksSelectors.selectById(store.getState(), subtaskId)?.statusId).toBe('l-sprint-done'));
  expect(await screen.findByLabelText('Toggle Toggle me')).toBeChecked();

  await user.click(screen.getByLabelText('Toggle Toggle me'));
  await waitFor(() => expect(tasksSelectors.selectById(store.getState(), subtaskId)?.statusId).toBe('l-sprint-todo'));
});

test('archiving the task closes the drawer and removes it from the board', async () => {
  const user = userEvent.setup();
  const store = renderApp(uiWithDrawer);
  await user.click(await screen.findByText('Archive task'));
  await waitFor(() => expect(store.getState().ui.drawerTaskId).toBeNull());
  expect(tasksSelectors.selectById(store.getState(), 't-6')?.archivedAt).not.toBeNull();
});
