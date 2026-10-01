import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useState } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { addToast } from '../../store/slices/uiSlice';
import { createTask } from '../../store/thunks/taskThunks';
import type { Status, Task } from '../../types';
import { STATUS_DOT } from '../ui/colors';
import TaskCard from './TaskCard';

export default function BoardColumn({ listId, status, tasks }: { listId: string; status: Status; tasks: Task[] }) {
  const dispatch = useAppDispatch();
  const [adding, setAdding] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: `status:${status.id}` });

  const submit = async (title: string) => {
    setAdding(false);
    if (!title.trim()) return;
    const res = await dispatch(createTask({ listId, title, statusId: status.id }));
    if (createTask.rejected.match(res)) {
      dispatch(addToast({ message: res.payload?.error.message ?? 'Create failed', tone: 'error' }));
    }
  };

  return (
    <section
      ref={setNodeRef}
      aria-label={status.name}
      data-testid={`column-${status.id}`}
      className={`flex w-72 shrink-0 flex-col rounded-card border bg-slate-100/60 ${
        isOver ? 'border-brand-500 bg-brand-50' : 'border-transparent'
      }`}
    >
      <header className="flex items-center gap-2 px-3 py-2.5">
        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status.color]}`} />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">{status.name}</h3>
        <span className="text-xs text-slate-400">{tasks.length}</span>
      </header>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-10 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
          {tasks.map((task) => <TaskCard key={task.id} task={task} statusCategory={status.category} />)}
          {tasks.length === 0 && !isOver && (
            <p className="rounded border border-dashed border-slate-300 p-3 text-center text-xs text-slate-400">
              No tasks
            </p>
          )}
        </div>
      </SortableContext>
      <footer className="p-2">
        {adding ? (
          <input
            autoFocus
            aria-label="New task title"
            onKeyDown={(ev) => {
              if (ev.key === 'Enter') void submit(ev.currentTarget.value);
              if (ev.key === 'Escape') setAdding(false);
            }}
            onBlur={() => setAdding(false)}
            className="w-full rounded border border-brand-500 px-2 py-1.5 text-sm outline-none"
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full rounded px-2 py-1 text-left text-sm text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          >
            + Add task
          </button>
        )}
      </footer>
    </section>
  );
}
