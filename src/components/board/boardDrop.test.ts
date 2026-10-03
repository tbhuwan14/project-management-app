import type { Status, Task } from '../../types';
import { computeBoardDrop, type BoardColumnData } from './boardDrop';

const makeStatus = (id: string, position: number): Status => ({
  id, listId: 'l-1', name: id, category: 'todo', color: 'gray', position,
});

const makeTask = (id: string, statusId: string, position: number): Task => ({
  id,
  title: id,
  description: '',
  primaryListId: 'l-1',
  statusId,
  priority: 'none',
  assigneeIds: [],
  dueDate: null,
  position,
  parentTaskId: null,
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

// Mirrors the real seed's Sprint 1 "To Do" column (t-6 @ 6144, t-7 @ 7168),
// the exact fixture used in the task-12 fix-round bug report's worked
// example, plus a second column to exercise cross-column drops and a third,
// empty column to exercise the empty-column drop path.
const todo = makeStatus('todo', 1024);
const prog = makeStatus('prog', 2048);
const done = makeStatus('done', 3072);

const makeColumns = (): BoardColumnData[] => [
  { status: todo, tasks: [makeTask('t-6', 'todo', 6144), makeTask('t-7', 'todo', 7168)] },
  { status: prog, tasks: [makeTask('t-8', 'prog', 8192)] },
  { status: done, tasks: [] },
];

describe('computeBoardDrop', () => {
  test('upward within-column reorder places the card before its new neighbour', () => {
    // Drag t-7 (last) up onto t-6 (first): t-7 should land above t-6.
    const drop = computeBoardDrop(makeColumns(), 't-7', 't-6');
    expect(drop).toEqual({ statusId: 'todo', position: 3072 }); // positionBetween(null, 6144)
  });

  test('downward within-column reorder places the card after its new neighbour (Critical 1)', () => {
    // Drag t-6 (first) down onto t-7 (last): t-6 should land below t-7, not
    // above it. Before the fix this returned 3584 (positionBetween(null,
    // 7168)) — still above t-7 — because `overIndex` was computed against
    // an active-removed array. The correct destination is below t-7.
    const drop = computeBoardDrop(makeColumns(), 't-6', 't-7');
    expect(drop).toEqual({ statusId: 'todo', position: 8192 }); // positionBetween(7168, null)
  });

  test('cross-column drop onto a card inserts immediately before it', () => {
    const drop = computeBoardDrop(makeColumns(), 't-6', 't-8');
    expect(drop).toEqual({ statusId: 'prog', position: 4096 }); // positionBetween(null, 8192)
  });

  test('dropping on an empty column appends (only possible position)', () => {
    const drop = computeBoardDrop(makeColumns(), 't-6', 'status:done');
    expect(drop).toEqual({ statusId: 'done', position: 1024 }); // positionBetween(null, null)
  });

  test('dropping on a non-empty column container appends after the last card', () => {
    const drop = computeBoardDrop(makeColumns(), 't-8', 'status:todo');
    expect(drop).toEqual({ statusId: 'todo', position: 8192 }); // positionBetween(7168, null)
  });

  test('a self-drop is a no-op (Critical 2)', () => {
    // dnd-kit reports over.id === active.id when a card is picked up and
    // dropped back without leaving its own bounds (routine with a 5px
    // activation threshold). Before the fix, `others.findIndex` returned
    // -1 for this case, producing positionBetween(null, null) = 1024 — a
    // real, persisted move to the top of the column for any task not
    // already at position 1024.
    const drop = computeBoardDrop(makeColumns(), 't-6', 't-6');
    expect(drop).toBeNull();
  });

  test('an unknown id is a no-op', () => {
    const drop = computeBoardDrop(makeColumns(), 't-6', 'does-not-exist');
    expect(drop).toBeNull();
  });
});
