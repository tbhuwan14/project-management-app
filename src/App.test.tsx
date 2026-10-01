import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import App from './App';
import { FAKE_LATENCY } from './api/fakeApi';
import { markBooted } from './store/slices/uiSlice';
import { makeStore, type AppStore, type PreloadedAppState } from './store/store';

beforeAll(() => { FAKE_LATENCY.ms = 0; });

export function renderApp(preloaded?: PreloadedAppState): AppStore {
  const store = makeStore(preloaded);
  store.dispatch(markBooted());
  render(
    <Provider store={store}>
      <App />
    </Provider>,
  );
  return store;
}

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
