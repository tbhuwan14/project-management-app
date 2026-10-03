import '@testing-library/jest-dom';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FAKE_LATENCY } from '../../api/fakeApi';
import { formatDue } from '../../lib/date';
import { daysFromNow, seedTasks } from '../../store/seed';
import { tasksAdapter } from '../../store/slices/tasksSlice';
import { renderApp } from '../../test/renderApp';

beforeAll(() => { FAKE_LATENCY.ms = 0; });

const uiListMode = {
  ui: {
    booted: true, selectedListId: 'l-sprint', viewMode: 'list' as const,
    drawerTaskId: null, toasts: [], listSort: null,
  },
};

const rowIds = () => screen.getAllByTestId(/^row-/).map((row) => row.getAttribute('data-testid'));

test('renders a row per task with status and priority', () => {
  renderApp(uiListMode);
  const table = screen.getByRole('table');
  expect(within(table).getByText('Implement login screen')).toBeInTheDocument();
  expect(within(table).getAllByText('In Progress').length).toBeGreaterThanOrEqual(1);
  // Implement login screen (t-6) is seeded with priority "urgent".
  const row = screen.getByTestId('row-t-6');
  expect(within(row).getByText('Urgent')).toBeInTheDocument();
});

test('row click opens drawer state', async () => {
  const user = userEvent.setup();
  const store = renderApp(uiListMode);
  await user.click(screen.getByText('Implement login screen'));
  expect(store.getState().ui.drawerTaskId).toBe('t-6');
});

test('Priority header cycles asc -> desc -> off, reordering rows each time and showing direction', async () => {
  const user = userEvent.setup();
  renderApp(uiListMode);
  const header = screen.getByRole('button', { name: /priority/i });

  // Natural (unsorted) order is seed position order.
  expect(rowIds()).toEqual([
    'row-t-6', 'row-t-7', 'row-t-8', 'row-t-9', 'row-t-10', 'row-t-11', 'row-t-12',
  ]);

  await user.click(header);
  expect(header).toHaveTextContent('↑');
  expect(rowIds()).toEqual([
    'row-t-6', 'row-t-8', 'row-t-7', 'row-t-10', 'row-t-9', 'row-t-11', 'row-t-12',
  ]);

  await user.click(header);
  expect(header).toHaveTextContent('↓');
  expect(rowIds()).toEqual([
    'row-t-12', 'row-t-9', 'row-t-11', 'row-t-7', 'row-t-10', 'row-t-6', 'row-t-8',
  ]);

  await user.click(header);
  expect(header).not.toHaveTextContent('↑');
  expect(header).not.toHaveTextContent('↓');
  expect(rowIds()).toEqual([
    'row-t-6', 'row-t-7', 'row-t-8', 'row-t-9', 'row-t-10', 'row-t-11', 'row-t-12',
  ]);
});

test('Due date header sorts chronologically with null due dates last in both directions', async () => {
  const user = userEvent.setup();
  renderApp(uiListMode);
  const header = screen.getByRole('button', { name: /due date/i });

  await user.click(header);
  expect(header).toHaveTextContent('↑');
  expect(rowIds()).toEqual([
    'row-t-11', 'row-t-8', 'row-t-10', 'row-t-6', 'row-t-7', 'row-t-9', 'row-t-12',
  ]);

  await user.click(header);
  expect(header).toHaveTextContent('↓');
  expect(rowIds()).toEqual([
    'row-t-7', 'row-t-6', 'row-t-10', 'row-t-8', 'row-t-11', 'row-t-9', 'row-t-12',
  ]);
});

test('a completed task keeps a past due date but does not render it as overdue', () => {
  renderApp({ ...uiListMode, ui: { ...uiListMode.ui, selectedListId: 'l-backlog' } });
  // Pick bundler (t-5, l-backlog) is Done with a due date 15 days ago —
  // always in the past — but finished work must not read as late.
  const row = screen.getByTestId('row-t-5');
  const dueCell = within(row).getByText(formatDue(daysFromNow(-15)));
  expect(dueCell).not.toHaveClass('text-red-600', 'font-semibold');
  expect(dueCell).toHaveClass('text-slate-500');
});

test('pressing Enter on a focused row opens the drawer (keyboard activation)', async () => {
  const user = userEvent.setup();
  const store = renderApp(uiListMode);
  const row = screen.getByTestId('row-t-6');
  row.focus();
  await user.keyboard('{Enter}');
  expect(store.getState().ui.drawerTaskId).toBe('t-6');
});

test('an empty list shows an empty state instead of a bare table', () => {
  const tasksWithoutSprint = tasksAdapter.setAll(
    tasksAdapter.getInitialState(),
    seedTasks.filter((t) => t.primaryListId !== 'l-sprint'),
  );
  renderApp({ ...uiListMode, tasks: tasksWithoutSprint });
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(screen.getByText(/no tasks in this list/i)).toBeInTheDocument();
});
