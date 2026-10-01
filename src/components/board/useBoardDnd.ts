import {
  PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { useState } from 'react';
import { positionBetween } from '../../lib/ordering';
import { useAppStore } from '../../store/hooks';
import { moveTaskWithRollback } from '../../store/thunks/optimistic';
import type { Status, Task } from '../../types';

export function useBoardDnd(listId: string, columns: Array<{ status: Status; tasks: Task[] }>) {
  const store = useAppStore();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const findColumn = (overId: string): { status: Status; tasks: Task[] } | undefined => {
    if (overId.startsWith('status:')) {
      return columns.find((c) => c.status.id === overId.slice('status:'.length));
    }
    return columns.find((c) => c.tasks.some((t) => t.id === overId));
  };

  const onDragStart = (event: DragStartEvent) => {
    const task = columns.flatMap((c) => c.tasks).find((t) => t.id === event.active.id) ?? null;
    setActiveTask(task);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;
    const column = findColumn(String(over.id));
    const task = columns.flatMap((c) => c.tasks).find((t) => t.id === active.id);
    if (!column || !task) return;

    const others = column.tasks.filter((t) => t.id !== task.id);
    let before: number | null;
    let after: number | null;
    if (String(over.id).startsWith('status:')) {
      // Dropped on the column body itself (incl. an empty column) → append to the end.
      before = others[others.length - 1]?.position ?? null;
      after = null;
    } else {
      const overIndex = others.findIndex((t) => t.id === over.id);
      before = others[overIndex - 1]?.position ?? null;
      after = others[overIndex]?.position ?? null;
    }
    const position = positionBetween(before, after);
    if (task.statusId === column.status.id && task.position === position) return;
    void moveTaskWithRollback(store.dispatch, store.getState, {
      id: task.id, toListId: listId, statusId: column.status.id, position,
    });
  };

  return { sensors, activeTask, onDragStart, onDragEnd };
}
