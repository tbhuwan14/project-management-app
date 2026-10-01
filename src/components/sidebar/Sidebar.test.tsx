import '@testing-library/jest-dom';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { FAKE_LATENCY } from '../../api/fakeApi';
import { renderApp } from '../../test/renderApp';
import { setCurrentUser } from '../../store/slices/sessionSlice';

beforeAll(() => { FAKE_LATENCY.ms = 0; });

test('Alice sees all spaces, folders, and lists including the private one', () => {
  renderApp();
  expect(screen.getByText('Engineering')).toBeInTheDocument();
  expect(screen.getByText('Marketing')).toBeInTheDocument();
  expect(screen.getByText('Leadership Roadmap')).toBeInTheDocument();
});

test('switching to Bob hides denied and private branches', () => {
  const store = renderApp();
  act(() => { store.dispatch(setCurrentUser('u-bob')); });
  expect(screen.queryByText('Marketing')).not.toBeInTheDocument();
  expect(screen.queryByText('Leadership Roadmap')).not.toBeInTheDocument();
  expect(screen.getByText('Sprint 1')).toBeInTheDocument();
});

test('Carol sees the private roadmap but not the Q4 folder', () => {
  const store = renderApp();
  act(() => { store.dispatch(setCurrentUser('u-carol')); });
  expect(screen.getByText('Leadership Roadmap')).toBeInTheDocument();
  expect(screen.queryByText('Q4 Launch')).not.toBeInTheDocument();
});

test('clicking a list selects it', async () => {
  const user = userEvent.setup();
  const store = renderApp();
  await user.click(screen.getByText('Sprint 1'));
  expect(store.getState().ui.selectedListId).toBe('l-sprint');
});

test('members see no structure menus', () => {
  const store = renderApp();
  act(() => { store.dispatch(setCurrentUser('u-bob')); });
  expect(screen.queryByLabelText(/options for/i)).not.toBeInTheDocument();
});
