import '@testing-library/jest-dom';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FAKE_LATENCY } from '../../api/fakeApi';
import { formatDue } from '../../lib/date';
import { renderApp } from '../../test/renderApp';
import { daysFromNow } from '../../store/seed';
import { createTask } from '../../store/thunks/taskThunks';

beforeAll(() => { FAKE_LATENCY.ms = 0; });

const uiOnSprint = {
  ui: {
    booted: true, selectedListId: 'l-sprint', viewMode: 'board' as const,
    drawerTaskId: null, toasts: [], listSort: null,
  },
};

test('renders a column per status with its tasks', () => {
  renderApp(uiOnSprint);
  const board = screen.getByRole('region', { name: /board/i });
  for (const name of ['To Do', 'In Progress', 'In Review', 'Done']) {
    expect(within(board).getByText(name)).toBeInTheDocument();
  }
  const review = screen.getByTestId('column-l-sprint-review');
  expect(within(review).getByText('Dark-launch search index')).toBeInTheDocument();
});

test('a card shows its priority badge, assignee avatar, and a non-overdue due date', () => {
  renderApp(uiOnSprint);
  // Implement login screen (t-6): urgent, assigned to Bob, due 3 days from
  // now — always in the future relative to the real clock these tests run
  // under (see seed.ts's daysFromNow offsets).
  const card = screen.getByText('Implement login screen').closest('[data-testid^="card-"]')!;
  expect(within(card as HTMLElement).getByText('Urgent')).toBeInTheDocument();
  expect(within(card as HTMLElement).getByTitle('Bob Builder')).toBeInTheDocument();
  const dueLabel = within(card as HTMLElement).getByText(formatDue(daysFromNow(3)));
  expect(dueLabel).toHaveClass('text-slate-500');
  expect(dueLabel).not.toHaveClass('text-red-600');
});

test('an overdue due date renders red and bold', () => {
  renderApp(uiOnSprint);
  // Migrate billing webhooks (t-8, l-sprint) is due 1 day ago — always in the
  // past relative to the real clock these tests run under.
  const card = screen.getByText('Migrate billing webhooks').closest('[data-testid^="card-"]')!;
  const dueLabel = within(card as HTMLElement).getByText(formatDue(daysFromNow(-1)));
  expect(dueLabel).toHaveClass('text-red-600', 'font-semibold');
});

test('a completed task keeps a past due date but does not render it as overdue', () => {
  renderApp({ ...uiOnSprint, ui: { ...uiOnSprint.ui, selectedListId: 'l-backlog' } });
  // Pick bundler (t-5, l-backlog) is in the Done column with a due date 15
  // days ago — always in the past relative to the real clock these tests run
  // under — but it is finished, so it must not read as overdue.
  const card = screen.getByText('Pick bundler').closest('[data-testid^="card-"]')!;
  const dueLabel = within(card as HTMLElement).getByText(formatDue(daysFromNow(-15)));
  expect(dueLabel).not.toHaveClass('text-red-600', 'font-semibold');
  expect(dueLabel).toHaveClass('text-slate-500');
});

test('a none-priority task hides its priority badge', () => {
  renderApp({ ...uiOnSprint, ui: { ...uiOnSprint.ui, selectedListId: 'l-backlog' } });
  // Pick bundler (t-5, l-backlog) has priority "none".
  const card = screen.getByText('Pick bundler').closest('[data-testid^="card-"]')!;
  for (const label of ['Urgent', 'High', 'Normal', 'Low']) {
    expect(within(card as HTMLElement).queryByText(label)).not.toBeInTheDocument();
  }
});

test('a card with subtasks shows the subtask count', async () => {
  const store = renderApp(uiOnSprint);
  await act(async () => {
    await store.dispatch(createTask({ listId: 'l-sprint', title: 'Subtask', parentTaskId: 't-6' }));
  });
  const card = screen.getByText('Implement login screen').closest('[data-testid^="card-"]')!;
  expect(within(card as HTMLElement).getByText('☑ 1')).toBeInTheDocument();
});

test('quick-add creates a task in that column', async () => {
  const user = userEvent.setup();
  const store = renderApp(uiOnSprint);
  const done = screen.getByTestId('column-l-sprint-done');
  await user.click(within(done).getByText('+ Add task'));
  await user.keyboard('Ship it{Enter}');
  const created = await within(done).findByText('Ship it');
  expect(created).toBeInTheDocument();
  expect(Object.values(store.getState().tasks.entities).some((t) => t?.title === 'Ship it' && t.statusId === 'l-sprint-done')).toBe(true);
});

test('clicking a card opens the drawer state', async () => {
  const user = userEvent.setup();
  const store = renderApp(uiOnSprint);
  await user.click(screen.getByText('Implement login screen'));
  expect(store.getState().ui.drawerTaskId).toBe('t-6');
});

test('pressing Enter on a focused card opens the drawer (keyboard activation)', async () => {
  const user = userEvent.setup();
  const store = renderApp(uiOnSprint);
  const card = screen.getByText('Implement login screen').closest('[data-testid^="card-"]')!;
  (card as HTMLElement).focus();
  await user.keyboard('{Enter}');
  expect(store.getState().ui.drawerTaskId).toBe('t-6');
});

test('board empty state when no list selected', () => {
  renderApp({ ui: { ...uiOnSprint.ui, selectedListId: null } });
  expect(screen.getByText(/select a list/i)).toBeInTheDocument();
});
