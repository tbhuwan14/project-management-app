import { createSelector } from '@reduxjs/toolkit';
import { canManageContainers, canView, getVisibleContainers } from '../lib/permissions';
import type { Container, Priority, Status, Task, User } from '../types';
import {
  containersSelectors, grantsSelectors, permissionEntities, statusesSelectors, tasksSelectors,
  usersSelectors, type RootState,
} from './store';

export interface TreeNode {
  container: Container;
  children: TreeNode[];
  passThrough: boolean;
}

export const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, high: 1, normal: 2, low: 3, none: 4 };

export const selectCurrentUser = (state: RootState): User | undefined =>
  usersSelectors.selectById(state, state.session.currentUserId);

export const selectVisibleTree = createSelector(
  [
    containersSelectors.selectAll,
    grantsSelectors.selectAll,
    (state: RootState) => state.users.entities,
    (state: RootState) => state.session.currentUserId,
  ],
  (containers, grants, users, userId): TreeNode[] => {
    const e = { containers: Object.fromEntries(containers.map((c) => [c.id, c])), users, grants };
    const { viewableIds, passThroughIds } = getVisibleContainers(e, userId);
    const include = (c: Container) =>
      c.archivedAt === null && (viewableIds.has(c.id) || passThroughIds.has(c.id));
    const build = (parentId: string | null): TreeNode[] =>
      containers
        .filter((c) => c.parentId === parentId && include(c))
        .map((c) => ({ container: c, children: build(c.id), passThrough: passThroughIds.has(c.id) }));
    return build(null);
  },
);

export const selectAccessibleSelectedListId = (state: RootState): string | null => {
  const id = state.ui.selectedListId;
  if (!id) return null;
  return canView(permissionEntities(state), state.session.currentUserId, id) ? id : null;
};

export const selectListStatuses = createSelector(
  [statusesSelectors.selectAll, (_state: RootState, listId: string) => listId],
  (statuses, listId): Status[] => statuses.filter((s) => s.listId === listId),
);

const selectTopLevelTasks = createSelector(
  [tasksSelectors.selectAll, (_state: RootState, listId: string) => listId],
  (tasks, listId): Task[] =>
    tasks.filter((t) => t.primaryListId === listId && t.archivedAt === null && t.parentTaskId === null),
);

export const selectBoardColumns = createSelector(
  [selectTopLevelTasks, selectListStatuses],
  (tasks, statuses): Array<{ status: Status; tasks: Task[] }> =>
    statuses.map((status) => ({
      status,
      tasks: tasks.filter((t) => t.statusId === status.id),
    })),
);

export const selectListRows = createSelector(
  [selectTopLevelTasks, (state: RootState) => state.ui.listSort],
  (rows, sort): Task[] => {
    if (!sort) return rows;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sort.key === 'priority') return (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) * dir;
      if (a.dueDate === null && b.dueDate === null) return 0;
      if (a.dueDate === null) return 1; // nulls always last
      if (b.dueDate === null) return -1;
      return a.dueDate.localeCompare(b.dueDate) * dir;
    });
  },
);

export const selectSubtasks = createSelector(
  [tasksSelectors.selectAll, (_state: RootState, taskId: string) => taskId],
  (tasks, taskId): Task[] => tasks.filter((t) => t.parentTaskId === taskId && t.archivedAt === null),
);

export const selectCanManage = (state: RootState): boolean =>
  canManageContainers(permissionEntities(state), state.session.currentUserId);

export const selectVisibleLists = createSelector(
  [
    containersSelectors.selectAll,
    grantsSelectors.selectAll,
    (state: RootState) => state.users.entities,
    (state: RootState) => state.session.currentUserId,
  ],
  (containers, grants, users, userId): Container[] => {
    const e = { containers: Object.fromEntries(containers.map((c) => [c.id, c])), users, grants };
    return containers.filter(
      (c) => c.type === 'list' && c.archivedAt === null && canView(e, userId, c.id),
    );
  },
);
