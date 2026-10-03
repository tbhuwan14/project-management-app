import { DndContext, DragOverlay, closestCorners } from '@dnd-kit/core';
import { useAppSelector } from '../../store/hooks';
import { selectBoardColumns } from '../../store/selectors';
import BoardColumn from './BoardColumn';
import TaskCard from './TaskCard';
import { useBoardDnd } from './useBoardDnd';

export default function BoardView({ listId }: { listId: string }) {
  const columns = useAppSelector((s) => selectBoardColumns(s, listId));
  const { sensors, activeTask, onDragStart, onDragCancel, onDragEnd } = useBoardDnd(listId, columns);
  const activeStatus = activeTask && columns.find((c) => c.status.id === activeTask.statusId)?.status;
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragCancel={onDragCancel}
      onDragEnd={onDragEnd}
    >
      <div role="region" aria-label="Board" className="flex h-full gap-3 overflow-x-auto p-4">
        {columns.map(({ status, tasks }) => (
          <BoardColumn key={status.id} listId={listId} status={status} tasks={tasks} />
        ))}
      </div>
      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} statusCategory={activeStatus?.category} overlay />}
      </DragOverlay>
    </DndContext>
  );
}
