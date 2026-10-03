import '@testing-library/jest-dom';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FAKE_LATENCY } from '../../api/fakeApi';
import { renderApp } from '../../test/renderApp';
import { tasksSelectors } from '../../store/store';
import { createTask } from '../../store/thunks/taskThunks';
import { setSimulateFailures } from '../../store/slices/sessionSlice';

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
  // A success toast also carries role="alert", so assert the actual error wording (and
  // error styling) rather than just "some alert appeared" — otherwise this would pass
  // just as well if the commit had silently succeeded and fired a success toast.
  // Deliberately NO { hidden: true }: the toast must be in the accessibility tree while
  // the drawer is open. Headless UI's Dialog inerts the body child holding the React root,
  // so this only passes because <Toasts /> portals into its own body child.
  const toast = await screen.findByRole('alert');
  expect(toast).toHaveTextContent('Simulated network failure');
  expect(toast).toHaveClass('text-red-800');
  // jsdom honours `aria-hidden` for role queries but does not implement `inert` at all
  // (it stores Headless UI's `el.inert = true` as a plain expando), so assert the
  // structural fact directly: with the Dialog open, no ancestor of the toast is inert or
  // aria-hidden. Before the portal fix the React root carried both.
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  for (let el = toast.parentElement; el !== null; el = el.parentElement) {
    expect(el.inert).toBeFalsy();
    expect(el).not.toHaveAttribute('aria-hidden', 'true');
  }
  // Reachability, not just presence: the Dismiss button must actually be clickable with
  // the dialog open, and clicking it must not take the drawer down with it.
  await user.click(within(toast).getByRole('button', { name: 'Dismiss' }));
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  expect(screen.getByRole('dialog')).toBeInTheDocument();
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
  // No { hidden: true }: the drawer stays open on a rejected move, and the permission
  // error has to stay reachable — announced and dismissable — while it does.
  const toast = await screen.findByRole('alert');
  expect(toast).toHaveTextContent('You do not have access to one of these lists');
  expect(toast).toHaveClass('text-red-800');
  await user.click(within(toast).getByRole('button', { name: 'Dismiss' }));
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(tasksSelectors.selectById(store.getState(), 't-17')?.primaryListId).toBe('l-roadmap');
});

test('adding a subtask shows it in the checklist', async () => {
  renderApp(uiWithDrawer);
  const user = userEvent.setup();
  const dialog = await screen.findByRole('dialog');
  await user.click(within(dialog).getByText('+ Add subtask'));
  await user.keyboard('Write unit tests{Enter}');
  expect(await within(dialog).findByText('Write unit tests')).toBeInTheDocument();
});

test('a subtask never gains its own "add subtask" affordance (max depth 1)', async () => {
  const store = renderApp(uiWithDrawer);
  const user = userEvent.setup();
  await user.click(await screen.findByText('+ Add subtask'));
  await user.keyboard('Only child{Enter}');
  const subtaskRow = (await screen.findByText('Only child')).closest('li')!;
  // Exactly one "+ Add subtask" affordance must exist in the whole drawer: the parent's.
  // If subtasks could recursively grow their own checklist, a second one would appear.
  expect(screen.getAllByText('+ Add subtask')).toHaveLength(1);
  // And specifically: the new subtask's own row renders no add-subtask affordance at all.
  expect(within(subtaskRow as HTMLElement).queryByText('+ Add subtask')).not.toBeInTheDocument();
  const subtask = Object.values(store.getState().tasks.entities).find((t) => t?.title === 'Only child')!;
  expect(subtask.parentTaskId).toBe('t-6');
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

test('a failed subtask removal toasts an error and leaves the subtask in place', async () => {
  const user = userEvent.setup();
  const store = renderApp(uiWithDrawer);
  // Create the subtask while failures are off, then flip simulateFailures on before
  // removing it — isolates the failure to the remove action itself.
  await user.click(await screen.findByText('+ Add subtask'));
  await user.keyboard('Keep me{Enter}');
  await screen.findByText('Keep me');
  const subtaskId = Object.values(store.getState().tasks.entities).find((t) => t?.title === 'Keep me')!.id;

  act(() => {
    store.dispatch(setSimulateFailures(true));
  });

  await user.click(screen.getByLabelText('Remove Keep me'));

  // No { hidden: true }: the drawer stays open on a rejected archive, so the toast has to
  // stay reachable — see the note on the title-commit test above.
  const toast = await screen.findByRole('alert');
  expect(toast).toHaveTextContent('Simulated network failure');
  expect(toast).toHaveClass('text-red-800');
  await user.click(within(toast).getByRole('button', { name: 'Dismiss' }));
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByText('Keep me')).toBeInTheDocument();
  expect(tasksSelectors.selectById(store.getState(), subtaskId)?.archivedAt).toBeNull();
});

test('archiving the task closes the drawer and removes it from the board', async () => {
  const user = userEvent.setup();
  const store = renderApp(uiWithDrawer);
  await user.click(await screen.findByText('Archive task'));
  await waitFor(() => expect(store.getState().ui.drawerTaskId).toBeNull());
  expect(tasksSelectors.selectById(store.getState(), 't-6')?.archivedAt).not.toBeNull();
});
