import { createAsyncThunk, nanoid } from '@reduxjs/toolkit';
import { delay, networkFailure } from '../../api/fakeApi';
import { nextPosition } from '../../lib/ordering';
import { canEditTasks } from '../../lib/permissions';
import { validateStatusInList, validateSubtaskParent, validateTaskTitle } from '../../lib/validation';
import { appError, type AppError, type Status, type Task } from '../../types';
import { taskPatched, tasksPatched, taskUpserted } from '../slices/tasksSlice';
import { closeDrawer } from '../slices/uiSlice';
import { permissionEntities, statusesSelectors, tasksSelectors, type RootState } from '../store';

type ThunkCfg = { state: RootState; rejectValue: AppError };
const now = () => new Date().toISOString();

const listStatuses = (state: RootState, listId: string): Status[] =>
  statusesSelectors.selectAll(state).filter((s) => s.listId === listId);

const defaultStatus = (state: RootState, listId: string): Status | undefined => {
  const statuses = listStatuses(state, listId);
  return statuses.find((s) => s.category === 'todo') ?? statuses[0];
};

/** Same-category status in the target list, falling back to its default. */
const remapStatus = (state: RootState, fromStatusId: string, toListId: string): Status | undefined => {
  const from = statusesSelectors.selectById(state, fromStatusId);
  const targets = listStatuses(state, toListId);
  return targets.find((s) => s.category === from?.category) ?? defaultStatus(state, toListId);
};

export const createTask = createAsyncThunk<
  Task,
  { listId: string; title: string; parentTaskId?: string; statusId?: string },
  ThunkCfg
>('tasks/create', async (input, { getState, dispatch, rejectWithValue }) => {
  await delay();
  const state = getState();
  if (state.session.simulateFailures) return rejectWithValue(networkFailure());
  const invalidTitle = validateTaskTitle(input.title);
  if (invalidTitle) return rejectWithValue(invalidTitle);
  if (!canEditTasks(permissionEntities(state), state.session.currentUserId, input.listId)) {
    return rejectWithValue(appError('FORBIDDEN', 'You do not have access to this list'));
  }
  let parent: Task | undefined;
  if (input.parentTaskId) {
    parent = tasksSelectors.selectById(state, input.parentTaskId);
    const invalidParent = validateSubtaskParent(parent);
    if (invalidParent) return rejectWithValue(invalidParent);
    if (parent!.primaryListId !== input.listId) {
      return rejectWithValue(appError('VALIDATION', 'Subtasks must live in their parent task’s list'));
    }
  }
  let status: Status | undefined;
  if (input.statusId) {
    status = statusesSelectors.selectById(state, input.statusId);
    const invalidStatus = validateStatusInList(status, input.listId);
    if (invalidStatus) return rejectWithValue(invalidStatus);
  } else {
    status = defaultStatus(state, input.listId);
  }
  if (!status) return rejectWithValue(appError('VALIDATION', 'List has no statuses'));
  const siblings = tasksSelectors
    .selectAll(state)
    .filter((t) => t.primaryListId === input.listId && t.statusId === status.id && t.archivedAt === null);
  const task: Task = {
    id: nanoid(),
    title: input.title.trim(),
    description: '',
    primaryListId: input.listId,
    statusId: status.id,
    priority: 'none',
    assigneeIds: [],
    dueDate: null,
    position: nextPosition(siblings.map((t) => t.position)),
    parentTaskId: input.parentTaskId ?? null,
    archivedAt: null,
    createdAt: now(),
    updatedAt: now(),
  };
  dispatch(taskUpserted(task));
  return task;
});

export const updateTask = createAsyncThunk<
  Task,
  { id: string; changes: Partial<Pick<Task, 'title' | 'description' | 'statusId' | 'priority' | 'assigneeIds' | 'dueDate'>> },
  ThunkCfg
>('tasks/update', async ({ id, changes }, { getState, dispatch, rejectWithValue }) => {
  await delay();
  const state = getState();
  if (state.session.simulateFailures) return rejectWithValue(networkFailure());
  const task = tasksSelectors.selectById(state, id);
  if (!task || task.archivedAt !== null) return rejectWithValue(appError('NOT_FOUND', 'Task not found'));
  if (!canEditTasks(permissionEntities(state), state.session.currentUserId, task.primaryListId)) {
    return rejectWithValue(appError('FORBIDDEN', 'You do not have access to this task'));
  }
  if (changes.title !== undefined) {
    const invalid = validateTaskTitle(changes.title);
    if (invalid) return rejectWithValue(invalid);
  }
  if (changes.statusId !== undefined) {
    const status = statusesSelectors.selectById(state, changes.statusId);
    const invalid = validateStatusInList(status, task.primaryListId);
    if (invalid) return rejectWithValue(invalid);
  }
  const patch = { ...changes, ...(changes.title !== undefined ? { title: changes.title.trim() } : {}), updatedAt: now() };
  dispatch(taskPatched({ id, changes: patch }));
  return { ...task, ...patch };
});

export const archiveTask = createAsyncThunk<{ id: string }, { id: string }, ThunkCfg>(
  'tasks/archive',
  async ({ id }, { getState, dispatch, rejectWithValue }) => {
    await delay();
    const state = getState();
    if (state.session.simulateFailures) return rejectWithValue(networkFailure());
    const task = tasksSelectors.selectById(state, id);
    if (!task) return rejectWithValue(appError('NOT_FOUND', 'Task not found'));
    if (!canEditTasks(permissionEntities(state), state.session.currentUserId, task.primaryListId)) {
      return rejectWithValue(appError('FORBIDDEN', 'You do not have access to this task'));
    }
    const at = now();
    const subtaskIds = tasksSelectors
      .selectAll(state)
      .filter((t) => t.parentTaskId === id)
      .map((t) => t.id);
    dispatch(tasksPatched([id, ...subtaskIds].map((tid) => ({ id: tid, changes: { archivedAt: at, updatedAt: at } }))));
    if (state.ui.drawerTaskId === id) dispatch(closeDrawer());
    return { id };
  },
);

export const moveTask = createAsyncThunk<
  Task,
  { id: string; toListId: string; statusId: string; position: number },
  ThunkCfg
>('tasks/move', async ({ id, toListId, statusId, position }, { getState, dispatch, rejectWithValue }) => {
  await delay();
  const state = getState();
  if (state.session.simulateFailures) return rejectWithValue(networkFailure());
  const task = tasksSelectors.selectById(state, id);
  if (!task || task.archivedAt !== null) return rejectWithValue(appError('NOT_FOUND', 'Task not found'));
  const e = permissionEntities(state);
  const userId = state.session.currentUserId;
  if (!canEditTasks(e, userId, task.primaryListId) || !canEditTasks(e, userId, toListId)) {
    return rejectWithValue(appError('FORBIDDEN', 'You do not have access to one of these lists'));
  }
  const status = statusesSelectors.selectById(state, statusId);
  const invalid = validateStatusInList(status, toListId);
  if (invalid) return rejectWithValue(invalid);

  const at = now();
  const patches: Array<{ id: string; changes: Partial<Task> }> = [
    { id, changes: { primaryListId: toListId, statusId, position, updatedAt: at } },
  ];
  if (toListId !== task.primaryListId) {
    for (const sub of tasksSelectors.selectAll(state).filter((t) => t.parentTaskId === id)) {
      const mapped = remapStatus(state, sub.statusId, toListId);
      patches.push({ id: sub.id, changes: { primaryListId: toListId, statusId: mapped?.id ?? statusId, updatedAt: at } });
    }
  }
  dispatch(tasksPatched(patches));
  return { ...task, primaryListId: toListId, statusId, position, updatedAt: at };
});
