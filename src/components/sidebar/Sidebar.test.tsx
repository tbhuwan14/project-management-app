import '@testing-library/jest-dom';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { FAKE_LATENCY } from '../../api/fakeApi';
import { renderApp } from '../../test/renderApp';
import { setCurrentUser, setSimulateFailures } from '../../store/slices/sessionSlice';
import { containersAdapter } from '../../store/slices/containersSlice';
import { grantsAdapter } from '../../store/slices/grantsSlice';
import { containersSelectors } from '../../store/store';
import type { Container, Grant } from '../../types';

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

test('admin renames a node via the ⋯ menu; Enter commits the new name', async () => {
  const user = userEvent.setup();
  renderApp();
  await user.click(screen.getByLabelText('Options for Sprint 1'));
  await user.click(await screen.findByText('Rename'));
  const input = screen.getByLabelText('Rename');
  await user.clear(input);
  await user.type(input, 'Sprint One{Enter}');
  expect(await screen.findByText('Sprint One')).toBeInTheDocument();
  expect(screen.queryByText('Sprint 1')).not.toBeInTheDocument();
});

test('Escape cancels an in-progress add without creating a container', async () => {
  const user = userEvent.setup();
  const store = renderApp();
  const before = containersSelectors.selectTotal(store.getState());
  await user.click(screen.getByLabelText('Options for Q4 Launch'));
  await user.click(await screen.findByText('Add list'));
  const input = screen.getByLabelText('New list name');
  await user.type(input, 'Should not exist{Escape}');
  expect(screen.queryByText('Should not exist')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('New list name')).not.toBeInTheDocument();
  expect(containersSelectors.selectTotal(store.getState())).toBe(before);
});

test('a rejected rename thunk surfaces an error toast', async () => {
  const user = userEvent.setup();
  const store = renderApp();
  act(() => { store.dispatch(setSimulateFailures(true)); });
  await user.click(screen.getByLabelText('Options for Sprint 1'));
  await user.click(await screen.findByText('Rename'));
  const input = screen.getByLabelText('Rename');
  await user.clear(input);
  await user.type(input, 'Sprint X{Enter}');
  expect(await screen.findByRole('alert')).toHaveTextContent(/simulated network failure/i);
  // The rejected rename must not have applied.
  expect(screen.queryByText('Sprint X')).not.toBeInTheDocument();
  expect(screen.getByText('Sprint 1')).toBeInTheDocument();
});

test('for Carol, a pass-through ancestor renders dimmed and is not selectable', async () => {
  const user = userEvent.setup();
  const store = renderApp();
  act(() => { store.dispatch(setCurrentUser('u-carol')); });

  // Marketing and Website Revamp are not viewable in their own right for Carol,
  // but surface as dimmed pass-through ancestors on the path to the one list
  // she is explicitly granted: Leadership Roadmap.
  const marketingRow = screen.getByText('Marketing').closest('div');
  expect(marketingRow).toHaveClass('opacity-50');
  expect(screen.getByText('Website Revamp').closest('div')).toHaveClass('opacity-50');
  expect(screen.getByText('Leadership Roadmap')).toBeInTheDocument();

  const before = store.getState().ui.selectedListId;
  await user.click(screen.getByText('Marketing'));
  expect(store.getState().ui.selectedListId).toBe(before);
});

test('a pass-through ancestor stranded by dead-end pruning is pruned too, not left as a new dead end', () => {
  // Synthetic tree (not the seed): a private space is pass-through only
  // because its one child folder is viewable via a direct grant — but that
  // folder's own only child is denied, so the folder itself is a P15-5 dead
  // end and gets pruned. Once the folder is gone, the space has nothing left
  // to lead to and must be pruned too, instead of surfacing one level up as
  // the exact "visible branch, no children, no expand arrow" bug P15-5 was
  // written to fix. A sibling branch with a real, always-visible list is
  // included as a control: it proves the fix prunes precisely the stranded
  // branch rather than collapsing the whole tree by accident.
  const T0 = '2026-01-01T00:00:00.000Z';
  const container = (
    id: string, name: string, type: Container['type'], parentId: string | null,
    visibility: Container['visibility'] = 'public',
  ): Container => ({
    id, name, type, parentId, position: 0, visibility, archivedAt: null, createdAt: T0, updatedAt: T0,
  });
  const containers: Container[] = [
    container('ws-x', 'Synth Workspace', 'workspace', null),
    container('sp-x', 'Stranded Space', 'space', 'ws-x', 'private'),
    container('folder-x', 'Childless Folder', 'folder', 'sp-x'),
    container('list-x', 'Denied List', 'list', 'folder-x'),
    container('sp-ok', 'Control Space', 'space', 'ws-x'),
    container('list-ok', 'Always Visible List', 'list', 'sp-ok'),
  ];
  const grants: Grant[] = [
    { id: 'g-allow-folder', resourceId: 'folder-x', userId: 'u-bob', mode: 'allow' },
    { id: 'g-deny-list', resourceId: 'list-x', userId: 'u-bob', mode: 'deny' },
  ];

  renderApp({
    containers: containersAdapter.setAll(containersAdapter.getInitialState(), containers),
    grants: grantsAdapter.setAll(grantsAdapter.getInitialState(), grants),
    session: { currentUserId: 'u-bob', simulateFailures: false },
  });

  expect(screen.queryByText('Childless Folder')).not.toBeInTheDocument();
  expect(screen.queryByText('Stranded Space')).not.toBeInTheDocument();
  // The control branch and the workspace root (which still has real content
  // via the control branch) are unaffected.
  expect(screen.getByText('Synth Workspace')).toBeInTheDocument();
  expect(screen.getByText('Control Space')).toBeInTheDocument();
  expect(screen.getByText('Always Visible List')).toBeInTheDocument();
});
