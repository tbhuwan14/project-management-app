import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import App from './App';
import { FAKE_LATENCY } from './api/fakeApi';
import { loadPersisted, subscribePersistence } from './store/persistence';
import { setCurrentUser } from './store/slices/sessionSlice';
import { makeStore } from './store/store';
import { renderApp } from './test/renderApp';

beforeAll(() => { FAKE_LATENCY.ms = 0; });
afterEach(() => { localStorage.clear(); });

test('renders shell with current user', () => {
  renderApp();
  expect(screen.getByText('Flowboard')).toBeInTheDocument();
  expect(screen.getByText('Alice Admin')).toBeInTheDocument();
});

test('user switcher changes the current user', async () => {
  const user = userEvent.setup();
  const store = renderApp();
  await user.click(screen.getByText('Alice Admin'));
  await user.click(await screen.findByText('Bob Builder'));
  expect(store.getState().session.currentUserId).toBe('u-bob');
});

test('failure toggle flips session flag', async () => {
  const user = userEvent.setup();
  const store = renderApp();
  await user.click(screen.getByRole('switch'));
  expect(store.getState().session.simulateFailures).toBe(true);
});

test('shows the boot skeleton before markBooted fires', () => {
  const store = makeStore();
  expect(store.getState().ui.booted).toBe(false);
  const { container } = render(
    <Provider store={store}>
      <App />
    </Provider>,
  );
  // The skeleton has no app chrome at all — assert its distinguishing
  // "animate-pulse" wrapper is present and the real shell is not.
  expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  expect(screen.queryByText('Flowboard')).not.toBeInTheDocument();
  expect(screen.queryByText('Select a list from the sidebar')).not.toBeInTheDocument();
});

test('reset button clears persisted storage so a reload cannot resurrect old state', async () => {
  // Seed localStorage the same way the real app does: a store with
  // persistence wired up, dispatch a change, flush the debounced save.
  jest.useFakeTimers();
  try {
    const seedStore = makeStore();
    subscribePersistence(seedStore);
    seedStore.dispatch(setCurrentUser('u-carol'));
    jest.runAllTimers();
  } finally {
    jest.useRealTimers();
  }
  expect(loadPersisted()?.session?.currentUserId).toBe('u-carol');

  const user = userEvent.setup();
  renderApp();
  await user.click(screen.getByRole('button', { name: 'Reset demo data' }));

  expect(loadPersisted()).toBeUndefined();
});
