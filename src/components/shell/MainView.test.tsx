import '@testing-library/jest-dom';
import { act, screen } from '@testing-library/react';
import { renderApp } from '../../test/renderApp';
import { selectList } from '../../store/slices/uiSlice';

const uiOnSprint = {
  ui: {
    booted: true, selectedListId: 'l-sprint', viewMode: 'board' as const,
    drawerTaskId: null, toasts: [], listSort: null,
  },
};

test('a fresh render with an already-selected list shows content immediately, no switch skeleton', () => {
  renderApp(uiOnSprint);
  expect(screen.getByRole('region', { name: /board/i })).toBeInTheDocument();
});

test('switching to a different list shows a brief skeleton, then the new list', () => {
  jest.useFakeTimers();
  try {
    const store = renderApp(uiOnSprint);
    expect(screen.getByRole('region', { name: /board/i })).toBeInTheDocument();

    act(() => { store.dispatch(selectList('l-backlog')); });
    // Mid-switch: the skeleton is up, the board region is gone.
    expect(screen.queryByRole('region', { name: /board/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Backlog' })).toBeInTheDocument(); // header updates immediately

    act(() => { jest.advanceTimersByTime(300); });
    expect(screen.getByRole('region', { name: /board/i })).toBeInTheDocument();
  } finally {
    jest.useRealTimers();
  }
});
