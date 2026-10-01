import {
  DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { ReactNode } from 'react';
import { useAppStore } from '../../store/hooks';
import type { TreeNode } from '../../store/selectors';
import { reorderContainerWithRollback } from '../../store/thunks/optimistic';
import { computeReorderPosition } from './reorder';

interface Props {
  nodes: TreeNode[];
  renderNode: (node: TreeNode) => ReactNode;
}

/**
 * Wraps one group of same-parent siblings in their own DndContext +
 * vertical SortableContext. Scoping a context per sibling group (rather
 * than one context for the whole tree) means a drag can never cross into a
 * different parent — same-parent reorder only, by construction.
 */
export default function SiblingGroup({ nodes, renderNode }: Props) {
  const store = useAppStore();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const position = computeReorderPosition(nodes, String(active.id), String(over.id));
    if (position === null) return;
    void reorderContainerWithRollback(store.dispatch, store.getState, {
      id: String(active.id),
      position,
    });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={nodes.map((n) => n.container.id)} strategy={verticalListSortingStrategy}>
        {nodes.map(renderNode)}
      </SortableContext>
    </DndContext>
  );
}
