import type { Container, Status, Task } from '../types';
import {
  validateContainerParent,
  validateStatusInList,
  validateSubtaskParent,
  validateTaskTitle,
} from './validation';

const container = (over: Partial<Container>): Container => ({
  id: 'c1', name: 'X', type: 'space', parentId: 'ws', position: 1024,
  visibility: 'public', archivedAt: null,
  createdAt: '2026-09-20T00:00:00.000Z', updatedAt: '2026-09-20T00:00:00.000Z',
  ...over,
});

describe('validateContainerParent', () => {
  test('workspace must have no parent', () => {
    expect(validateContainerParent('workspace', null)).toBeNull();
    expect(validateContainerParent('workspace', container({ type: 'space' }))?.error.code).toBe('VALIDATION');
  });
  test('list must live under folder', () => {
    expect(validateContainerParent('list', container({ type: 'folder' }))).toBeNull();
    expect(validateContainerParent('list', container({ type: 'space' }))?.error.code).toBe('VALIDATION');
    expect(validateContainerParent('list', null)?.error.code).toBe('VALIDATION');
  });
});

describe('validateTaskTitle', () => {
  test('rejects empty and whitespace-only', () => {
    expect(validateTaskTitle('')?.error.code).toBe('VALIDATION');
    expect(validateTaskTitle('   ')?.error.code).toBe('VALIDATION');
  });
  test('rejects > 500 chars, accepts 500', () => {
    expect(validateTaskTitle('x'.repeat(501))?.error.code).toBe('VALIDATION');
    expect(validateTaskTitle('x'.repeat(500))).toBeNull();
  });
});

describe('validateSubtaskParent', () => {
  const task = (over: Partial<Task>): Task => ({
    id: 't1', title: 'T', description: '', primaryListId: 'l1', statusId: 's1',
    priority: 'none', assigneeIds: [], dueDate: null, position: 1024,
    parentTaskId: null, archivedAt: null,
    createdAt: '2026-09-20T00:00:00.000Z', updatedAt: '2026-09-20T00:00:00.000Z',
    ...over,
  });
  test('missing parent → NOT_FOUND', () => {
    expect(validateSubtaskParent(undefined)?.error.code).toBe('NOT_FOUND');
  });
  test('parent that is itself a subtask → VALIDATION (max depth 1)', () => {
    expect(validateSubtaskParent(task({ parentTaskId: 'other' }))?.error.code).toBe('VALIDATION');
    expect(validateSubtaskParent(task({}))).toBeNull();
  });
});

describe('validateStatusInList', () => {
  const status: Status = { id: 's1', listId: 'l1', name: 'To Do', category: 'todo', color: 'gray', position: 1 };
  test('status must exist and belong to the list', () => {
    expect(validateStatusInList(undefined, 'l1')?.error.code).toBe('VALIDATION');
    expect(validateStatusInList(status, 'l2')?.error.code).toBe('VALIDATION');
    expect(validateStatusInList(status, 'l1')).toBeNull();
  });
});
