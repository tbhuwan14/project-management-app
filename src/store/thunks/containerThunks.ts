import { createAsyncThunk, nanoid } from '@reduxjs/toolkit';
import { delay, networkFailure } from '../../api/fakeApi';
import { nextPosition } from '../../lib/ordering';
import { canManageContainers } from '../../lib/permissions';
import { validateContainerParent } from '../../lib/validation';
import { appError, type AppError, type Container, type ContainerType, type Visibility } from '../../types';
import { containerPatched, containerUpserted } from '../slices/containersSlice';
import { selectList } from '../slices/uiSlice';
import { containersSelectors, permissionEntities, type RootState } from '../store';

type ThunkCfg = { state: RootState; rejectValue: AppError };
const now = () => new Date().toISOString();

export const createContainer = createAsyncThunk<
  Container,
  { name: string; type: ContainerType; parentId: string | null; visibility?: Visibility },
  ThunkCfg
>('containers/create', async (input, { getState, dispatch, rejectWithValue }) => {
  await delay();
  const state = getState();
  if (state.session.simulateFailures) return rejectWithValue(networkFailure());
  const name = input.name.trim();
  if (!name) return rejectWithValue(appError('VALIDATION', 'Name is required'));
  const parent = input.parentId ? containersSelectors.selectById(state, input.parentId) ?? null : null;
  const invalid = validateContainerParent(input.type, parent);
  if (invalid) return rejectWithValue(invalid);
  if (!canManageContainers(permissionEntities(state), state.session.currentUserId)) {
    return rejectWithValue(appError('FORBIDDEN', 'Only admins can manage the structure'));
  }
  const siblings = containersSelectors
    .selectAll(state)
    .filter((c) => c.parentId === input.parentId && c.archivedAt === null);
  const container: Container = {
    id: nanoid(),
    name,
    type: input.type,
    parentId: input.parentId,
    position: nextPosition(siblings.map((s) => s.position)),
    visibility: input.visibility ?? 'public',
    archivedAt: null,
    createdAt: now(),
    updatedAt: now(),
  };
  dispatch(containerUpserted(container));
  return container;
});

export const renameContainer = createAsyncThunk<Container, { id: string; name: string }, ThunkCfg>(
  'containers/rename',
  async ({ id, name }, { getState, dispatch, rejectWithValue }) => {
    await delay();
    const state = getState();
    if (state.session.simulateFailures) return rejectWithValue(networkFailure());
    const existing = containersSelectors.selectById(state, id);
    if (!existing) return rejectWithValue(appError('NOT_FOUND', 'Container not found'));
    const trimmed = name.trim();
    if (!trimmed) return rejectWithValue(appError('VALIDATION', 'Name is required'));
    if (!canManageContainers(permissionEntities(state), state.session.currentUserId)) {
      return rejectWithValue(appError('FORBIDDEN', 'Only admins can manage the structure'));
    }
    dispatch(containerPatched({ id, changes: { name: trimmed, updatedAt: now() } }));
    return { ...existing, name: trimmed };
  },
);

export const archiveContainer = createAsyncThunk<{ id: string }, { id: string }, ThunkCfg>(
  'containers/archive',
  async ({ id }, { getState, dispatch, rejectWithValue }) => {
    await delay();
    const state = getState();
    if (state.session.simulateFailures) return rejectWithValue(networkFailure());
    if (!containersSelectors.selectById(state, id)) {
      return rejectWithValue(appError('NOT_FOUND', 'Container not found'));
    }
    if (!canManageContainers(permissionEntities(state), state.session.currentUserId)) {
      return rejectWithValue(appError('FORBIDDEN', 'Only admins can manage the structure'));
    }
    const all = containersSelectors.selectAll(state);
    const toArchive = new Set<string>([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const c of all) {
        if (c.parentId && toArchive.has(c.parentId) && !toArchive.has(c.id)) {
          toArchive.add(c.id);
          grew = true;
        }
      }
    }
    const at = now();
    for (const cid of toArchive) {
      dispatch(containerPatched({ id: cid, changes: { archivedAt: at, updatedAt: at } }));
    }
    if (state.ui.selectedListId && toArchive.has(state.ui.selectedListId)) {
      dispatch(selectList(null));
    }
    return { id };
  },
);

export const reorderContainer = createAsyncThunk<Container, { id: string; position: number }, ThunkCfg>(
  'containers/reorder',
  async ({ id, position }, { getState, dispatch, rejectWithValue }) => {
    await delay();
    const state = getState();
    if (state.session.simulateFailures) return rejectWithValue(networkFailure());
    const existing = containersSelectors.selectById(state, id);
    if (!existing) return rejectWithValue(appError('NOT_FOUND', 'Container not found'));
    if (!canManageContainers(permissionEntities(state), state.session.currentUserId)) {
      return rejectWithValue(appError('FORBIDDEN', 'Only admins can reorder the structure'));
    }
    dispatch(containerPatched({ id, changes: { position, updatedAt: now() } }));
    return { ...existing, position };
  },
);
