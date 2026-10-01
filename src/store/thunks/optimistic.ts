import type { AppError } from '../../types';
import { containerPatched, containerUpserted } from '../slices/containersSlice';
import { taskPatched, taskUpserted } from '../slices/tasksSlice';
import { addToast } from '../slices/uiSlice';
import { containersSelectors, tasksSelectors, type AppDispatch, type RootState } from '../store';
import { reorderContainer } from './containerThunks';
import { moveTask } from './taskThunks';

export interface MoveArgs {
  id: string;
  toListId: string;
  statusId: string;
  position: number;
}

/** Optimistically applies the move, then confirms via thunk; rolls back + toasts on rejection. */
export async function moveTaskWithRollback(
  dispatch: AppDispatch,
  getState: () => RootState,
  args: MoveArgs,
): Promise<AppError | null> {
  const snapshot = tasksSelectors.selectById(getState(), args.id);
  if (!snapshot) return null;
  dispatch(taskPatched({
    id: args.id,
    changes: { primaryListId: args.toListId, statusId: args.statusId, position: args.position },
  }));
  const result = await dispatch(moveTask(args));
  if (moveTask.rejected.match(result)) {
    dispatch(taskUpserted(snapshot));
    const error = result.payload ?? { error: { code: 'NETWORK' as const, message: 'Move failed' } };
    dispatch(addToast({ message: error.error.message, tone: 'error' }));
    return error;
  }
  return null;
}

export async function reorderContainerWithRollback(
  dispatch: AppDispatch,
  getState: () => RootState,
  args: { id: string; position: number },
): Promise<AppError | null> {
  const snapshot = containersSelectors.selectById(getState(), args.id);
  if (!snapshot) return null;
  dispatch(containerPatched({ id: args.id, changes: { position: args.position } }));
  const result = await dispatch(reorderContainer(args));
  if (reorderContainer.rejected.match(result)) {
    dispatch(containerUpserted(snapshot));
    const error = result.payload ?? { error: { code: 'NETWORK' as const, message: 'Reorder failed' } };
    dispatch(addToast({ message: error.error.message, tone: 'error' }));
    return error;
  }
  return null;
}
