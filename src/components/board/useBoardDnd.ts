import {
  PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { useState } from 'react';
import { useAppStore } from '../../store/hooks';
import { moveTaskWithRollback } from '../../store/thunks/optimistic';
import type { Status, Task } from '../../types';
import { computeBoardDrop } from './boardDrop';

export function useBoardDnd(listId: string, columns: Array<{ status: Status; tasks: Task[] }>) {
  const store = useAppStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const onDragStart = (event: DragStartEvent) => {
    const task = columns.flatMap((c) => c.tasks).find((t) => t.id === event.active.id) ?? null;
    setActiveTask(task);
  };

  // An Escape-cancelled drag fires neither a drop nor onDragEnd's own
  // cleanup, so without this the overlay/active-card state would stick.
  const onDragCancel = () => setActiveTask(null);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;
    const task = columns.flatMap((c) => c.tasks).find((t) => t.id === active.id);
    if (!task) return;

    const drop = computeBoardDrop(columns, String(active.id), String(over.id));
    if (!drop) return;
    if (task.statusId === drop.statusId && task.position === drop.position) return;
    void moveTaskWithRollback(store.dispatch, store.getState, {
      id: task.id, toListId: listId, statusId: drop.statusId, position: drop.position,
    });
  };

  return { sensors, activeTask, onDragStart, onDragCancel, onDragEnd };
}
