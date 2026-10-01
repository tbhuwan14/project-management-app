import { arrayMove } from '@dnd-kit/sortable';
import { positionBetween } from '../../lib/ordering';
import type { Status, Task } from '../../types';

export interface BoardColumnData {
  status: Status;
  tasks: Task[];
}

export interface BoardDrop {
  statusId: string;
  position: number;
}

/**
 * Pure destination computation for a board drag.
 *
 * `columns` is the board's current (pre-drag) layout — each column's
 * `tasks` is its *unfiltered* array, still containing the active task when
 * it is the source column. Same-column reorders mirror the sidebar's
 * `computeReorderPosition` (src/components/sidebar/reorder.ts) exactly:
 * indices are read from the unfiltered array and `arrayMove` produces the
 * post-drop order, so the neighbour lookup is correct for both upward and
 * downward drags. See that file's doc comment for why indexing into an
 * active-removed array instead is a bug, not a style choice — an earlier
 * version of this handler did exactly that and shipped a one-slot-too-high
 * error on every downward drag.
 *
 * Returns `null` when the drag is a no-op (dropped on itself) or either id
 * cannot be resolved to a task/column.
 */
export function computeBoardDrop(
  columns: BoardColumnData[],
  activeId: string,
  overId: string,
): BoardDrop | null {
  if (activeId === overId) return null;

  const sourceColumn = columns.find((c) => c.tasks.some((t) => t.id === activeId));
  const activeTask = sourceColumn?.tasks.find((t) => t.id === activeId);
  if (!sourceColumn || !activeTask) return null;

  if (overId.startsWith('status:')) {
    const statusId = overId.slice('status:'.length);
    const destColumn = columns.find((c) => c.status.id === statusId);
    if (!destColumn) return null;
    // Dropped on the column's own droppable surface (including an empty
    // column) rather than on a specific card → append to the end.
    const siblings = destColumn.tasks.filter((t) => t.id !== activeId);
    const before = siblings[siblings.length - 1]?.position ?? null;
    return { statusId, position: positionBetween(before, null) };
  }

  const destColumn = columns.find((c) => c.tasks.some((t) => t.id === overId));
  if (!destColumn) return null;

  if (destColumn.status.id === sourceColumn.status.id) {
    // Same-column reorder: both activeId and overId are members of this
    // column's unfiltered `tasks` — mirror arrayMove exactly as the sidebar
    // does, rather than filtering the active task out first (that shifts
    // every over-index after the active task's original position down by
    // one, landing downward drops one slot too high).
    const activeIndex = destColumn.tasks.findIndex((t) => t.id === activeId);
    const overIndex = destColumn.tasks.findIndex((t) => t.id === overId);
    if (activeIndex < 0 || overIndex < 0) return null;
    const reordered = arrayMove(destColumn.tasks, activeIndex, overIndex);
    const i = reordered.findIndex((t) => t.id === activeId);
    const before = reordered[i - 1]?.position ?? null;
    const after = reordered[i + 1]?.position ?? null;
    return { statusId: destColumn.status.id, position: positionBetween(before, after) };
  }

  // Cross-column card drop: the active task is not a member of destColumn's
  // tasks, so destColumn.tasks is already the correct "array without the
  // active task" to index into — no filtering needed, and no divergence
  // from the same-column case's precondition (the array being indexed is
  // exactly the array the active task will land among).
  const overIndex = destColumn.tasks.findIndex((t) => t.id === overId);
  if (overIndex < 0) return null;
  const before = destColumn.tasks[overIndex - 1]?.position ?? null;
  const after = destColumn.tasks[overIndex]?.position ?? null;
  return { statusId: destColumn.status.id, position: positionBetween(before, after) };
}
