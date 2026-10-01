import { arrayMove } from '@dnd-kit/sortable';
import { positionBetween } from '../../lib/ordering';
import type { TreeNode } from '../../store/selectors';

/**
 * Pure neighbour-computation for a same-parent sibling drag.
 *
 * `nodes` is the sibling group in its current (pre-drag) order. We mirror
 * dnd-kit's own `arrayMove(items, activeIndex, overIndex)` to get the
 * post-drop order, then read the positions of the moved node's new
 * neighbours and hand them to `positionBetween`. Going through `arrayMove`
 * means the lookup reads directly as "the elements either side of where the
 * node landed" — the post-drop order is produced for us, rather than asking
 * the reader to reason about index shifts in a filtered (active-removed)
 * array. (Both constructions land on the same neighbours in every case —
 * removing the active node and reinserting it at `overIndex` is exactly
 * what `arrayMove` does — so this is a clarity choice, not a correctness
 * fix.)
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
