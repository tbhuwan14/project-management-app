import { arrayMove } from '@dnd-kit/sortable';
import { positionBetween } from '../../lib/ordering';
import type { TreeNode } from '../../store/selectors';

/**
 * Pure neighbour-computation for a same-parent sibling drag.
 *
 * `nodes` is the sibling group in its current (pre-drag) order. We mirror
 * dnd-kit's own `arrayMove(items, activeIndex, overIndex)` to get the
 * post-drop order, then read the positions of the moved node's new
 * neighbours and hand them to `positionBetween`. This is correct for drags
 * in both directions — unlike naively reusing `overIndex` as the insertion
 * index into the array with the active node removed, which only works when
 * dragging upward.
 *
 * Returns `null` when the drag is a no-op (dropped on itself, or either id
 * is not found in `nodes`).
 */
export function computeReorderPosition(
  nodes: TreeNode[],
  activeId: string,
  overId: string,
): number | null {
  if (activeId === overId) return null;
  const activeIndex = nodes.findIndex((n) => n.container.id === activeId);
  const overIndex = nodes.findIndex((n) => n.container.id === overId);
  if (activeIndex < 0 || overIndex < 0) return null;

  const reordered = arrayMove(nodes, activeIndex, overIndex);
  const i = reordered.findIndex((n) => n.container.id === activeId);
  const before = reordered[i - 1]?.container.position ?? null;
  const after = reordered[i + 1]?.container.position ?? null;
  return positionBetween(before, after);
}
