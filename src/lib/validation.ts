import type { AppError, Container, ContainerType, Status, Task } from '../types';
import { appError } from '../types';

const VALID_PARENT: Record<ContainerType, ContainerType | null> = {
  workspace: null,
  space: 'workspace',
  folder: 'space',
  list: 'folder',
};

export const MAX_TITLE_LENGTH = 500;

export function validateContainerParent(type: ContainerType, parent: Container | null): AppError | null {
  const expected = VALID_PARENT[type];
  if (expected === null) {
    return parent === null ? null : appError('VALIDATION', 'A workspace cannot have a parent');
  }
  if (!parent || parent.type !== expected) {
    return appError('VALIDATION', `A ${type} must live inside a ${expected}`);
  }
  return null;
}

export function validateTaskTitle(title: string): AppError | null {
  const trimmed = title.trim();
  if (trimmed.length === 0) return appError('VALIDATION', 'Title is required');
  if (trimmed.length > MAX_TITLE_LENGTH) {
    return appError('VALIDATION', `Title must be at most ${MAX_TITLE_LENGTH} characters`);
  }
  return null;
}

export function validateSubtaskParent(parent: Task | undefined): AppError | null {
  if (!parent) return appError('NOT_FOUND', 'Parent task not found');
  if (parent.parentTaskId !== null) {
    return appError('VALIDATION', 'Subtasks can only be one level deep');
  }
  return null;
}

export function validateStatusInList(status: Status | undefined, listId: string): AppError | null {
  if (!status || status.listId !== listId) {
    return appError('VALIDATION', 'Status does not belong to this list');
  }
  return null;
}
