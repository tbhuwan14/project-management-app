export type ContainerType = 'workspace' | 'space' | 'folder' | 'list';
export type Visibility = 'public' | 'private';
export type StatusCategory = 'todo' | 'in_progress' | 'done';
export type Priority = 'urgent' | 'high' | 'normal' | 'low' | 'none';
export type PaletteColor = 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'purple';
export type GrantMode = 'allow' | 'deny';

export interface Container {
  id: string;
  name: string;
  type: ContainerType;
  parentId: string | null;
  position: number;
  visibility: Visibility;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Status {
  id: string;
  listId: string;
  name: string;
  category: StatusCategory;
  color: PaletteColor;
  position: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  primaryListId: string;
  statusId: string;
  priority: Priority;
  assigneeIds: string[];
  dueDate: string | null;
  position: number;
  parentTaskId: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  initials: string;
  color: PaletteColor;
  role: 'admin' | 'member';
}

export interface Grant {
  id: string;
  resourceId: string;
  userId: string;
  mode: GrantMode;
}

export type ErrorCode = 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION' | 'NETWORK';
export interface AppError {
  error: { code: ErrorCode; message: string };
}
export const appError = (code: ErrorCode, message: string): AppError => ({
  error: { code, message },
});
