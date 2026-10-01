import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import Toasts from './Toasts';
import { makeStore } from '../../store/store';
import { addToast } from '../../store/slices/uiSlice';

test('toast renders and auto-dismisses after 4s', () => {
  jest.useFakeTimers();
  try {
    const store = makeStore();
    render(
      <Provider store={store}>
        <Toasts />
      </Provider>,
    );

    act(() => {
      store.dispatch(addToast({ message: 'Task saved', tone: 'success' }));
    });
    expect(screen.getByText('Task saved')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(screen.queryByText('Task saved')).not.toBeInTheDocument();
  } finally {
    jest.useRealTimers();
  }
});

test('toast can be dismissed manually before the timer fires', async () => {
  const user = userEvent.setup();
  const store = makeStore();
  render(
    <Provider store={store}>
      <Toasts />
    </Provider>,
  );

  act(() => {
    store.dispatch(addToast({ message: 'Simulated network failure', tone: 'error' }));
  });
  expect(screen.getByText('Simulated network failure')).toBeInTheDocument();

  await user.click(screen.getByLabelText('Dismiss'));
  expect(screen.queryByText('Simulated network failure')).not.toBeInTheDocument();
});
