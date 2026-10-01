import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectListStatuses, selectSubtasks } from '../../store/selectors';
import { addToast } from '../../store/slices/uiSlice';
import { archiveTask, createTask, updateTask } from '../../store/thunks/taskThunks';
import { statusesSelectors } from '../../store/store';
import type { Task } from '../../types';

export default function SubtaskList({ parent }: { parent: Task }) {
  const dispatch = useAppDispatch();
  const subtasks = useAppSelector((s) => selectSubtasks(s, parent.id));
  const statuses = useAppSelector((s) => selectListStatuses(s, parent.primaryListId));
  // Amendment: select the entities dictionary once (stable reference from the entity
  // adapter) and look categories up from it, rather than returning a brand-new curried
  // function from useAppSelector on every render.
  const statusEntities = useAppSelector(statusesSelectors.selectEntities);
  const [adding, setAdding] = useState(false);

  const doneStatus = statuses.find((s) => s.category === 'done');
  const todoStatus = statuses.find((s) => s.category === 'todo') ?? statuses[0];

  const toggle = async (sub: Task, done: boolean) => {
    const target = done ? doneStatus : todoStatus;
    if (!target) return;
    const res = await dispatch(updateTask({ id: sub.id, changes: { statusId: target.id } }));
    if (updateTask.rejected.match(res)) {
      dispatch(addToast({ message: res.payload?.error.message ?? 'Update failed', tone: 'error' }));
    }
  };

  const add = async (title: string) => {
    setAdding(false);
    if (!title.trim()) return;
    const res = await dispatch(createTask({ listId: parent.primaryListId, title, parentTaskId: parent.id }));
    if (createTask.rejected.match(res)) {
      dispatch(addToast({ message: res.payload?.error.message ?? 'Create failed', tone: 'error' }));
    }
  };

  return (
    <div>
      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Subtasks {subtasks.length > 0 && `(${subtasks.length})`}
      </h4>
      <ul className="space-y-1">
        {subtasks.map((sub) => {
          const done = statusEntities[sub.statusId]?.category === 'done';
          return (
            <li key={sub.id} className="group flex items-center gap-2 rounded px-1 py-0.5 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={done}
                onChange={(ev) => void toggle(sub, ev.target.checked)}
                aria-label={`Toggle ${sub.title}`}
                className="accent-brand-600"
              />
              <span className={`flex-1 text-sm ${done ? 'text-slate-400 line-through' : ''}`}>{sub.title}</span>
              <button
                aria-label={`Remove ${sub.title}`}
                onClick={() => void dispatch(archiveTask({ id: sub.id }))}
                className="invisible text-xs text-slate-400 hover:text-red-600 group-hover:visible"
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>
      {adding ? (
        <input
          autoFocus
          aria-label="New subtask title"
          onKeyDown={(ev) => {
            if (ev.key === 'Enter') void add(ev.currentTarget.value);
            if (ev.key === 'Escape') setAdding(false);
          }}
          onBlur={() => setAdding(false)}
          className="mt-1 w-full rounded border border-brand-500 px-2 py-1 text-sm outline-none"
        />
      ) : (
        <button onClick={() => setAdding(true)} className="mt-1 text-sm text-slate-400 hover:text-brand-600">
          + Add subtask
        </button>
      )}
    </div>
  );
}
