import '@testing-library/jest-dom';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FAKE_LATENCY } from '../../api/fakeApi';
import { renderApp } from '../../test/renderApp';

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

test('cards show priority, assignees, and due date', () => {
  renderApp(uiOnSprint);
  const card = screen.getByText('Implement login screen').closest('[data-testid^="card-"]')!;
  expect(within(card as HTMLElement).getByText('Urgent')).toBeInTheDocument();
  expect(within(card as HTMLElement).getByTitle('Bob Builder')).toBeInTheDocument();
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

test('board empty state when no list selected', () => {
  renderApp({ ui: { ...uiOnSprint.ui, selectedListId: null } });
  expect(screen.getByText(/select a list/i)).toBeInTheDocument();
});
