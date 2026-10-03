import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useEffect, useState } from 'react';
import { nextPosition } from '../../lib/ordering';
import { useAppDispatch, useAppSelector, useAppStore } from '../../store/hooks';
import { selectListStatuses, selectVisibleLists } from '../../store/selectors';
import { closeDrawer, addToast } from '../../store/slices/uiSlice';
import { archiveTask, moveTask, updateTask } from '../../store/thunks/taskThunks';
import { statusesSelectors, tasksSelectors, usersSelectors } from '../../store/store';
import type { Priority, Status } from '../../types';
import { PRIORITY_LABEL } from '../ui/colors';
import SubtaskList from './SubtaskList';

const PRIORITIES: Priority[] = ['urgent', 'high', 'normal', 'low', 'none'];
// Stable fallback reference: a fresh `[]` literal inside the selector below would be a
// new array on every call while no task is open, defeating useAppSelector's reference
// equality check (same discipline as Amendment 1 — read through selectors, never build
// a new array/function inside one).
const NO_STATUSES: Status[] = [];

export default function TaskDrawer() {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const taskId = useAppSelector((s) => s.ui.drawerTaskId);
  const task = useAppSelector((s) => (taskId ? tasksSelectors.selectById(s, taskId) : undefined));
  const statuses = useAppSelector((s) => (task ? selectListStatuses(s, task.primaryListId) : NO_STATUSES));
  const lists = useAppSelector(selectVisibleLists);
  const users = useAppSelector(usersSelectors.selectAll);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
    }
    // Re-sync local fields only when a *different* task opens, not on every
    // keystroke-driven store update to the currently open task.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  if (!task) return null;

  const commit = async (changes: Parameters<typeof updateTask>[0]['changes']) => {
    const res = await dispatch(updateTask({ id: task.id, changes }));
    if (updateTask.rejected.match(res)) {
      dispatch(addToast({ message: res.payload?.error.message ?? 'Update failed', tone: 'error' }));
      setTitle(task.title);
      setDescription(task.description);
    }
  };

  const moveToList = async (toListId: string) => {
    const state = store.getState();
    const current = statusesSelectors.selectById(state, task.statusId);
    const targets = selectListStatuses(state, toListId);
    const target = targets.find((s) => s.category === current?.category) ?? targets[0];
    if (!target) return;
    const siblings = tasksSelectors
      .selectAll(state)
      .filter((t) => t.primaryListId === toListId && t.statusId === target.id && t.archivedAt === null);
    // Dispatched directly, with NO optimistic pre-patch: moveTask's fromListId falls back
    // to task.primaryListId as read here, which is still the true source list. Patching
    // first would make that fallback read the already-mutated list, silently breaking the
    // thunk's source-side permission check and the cross-list subtask cascade.
    const res = await dispatch(moveTask({
      id: task.id, toListId, statusId: target.id,
      position: nextPosition(siblings.map((t) => t.position)),
    }));
    if (moveTask.rejected.match(res)) {
      dispatch(addToast({ message: res.payload?.error.message ?? 'Move failed', tone: 'error' }));
    }
  };

  const field = 'w-full rounded-card border border-slate-200 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none';
  const label = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500';

  return (
    <Dialog open onClose={() => dispatch(closeDrawer())} className="relative z-40">
      <div
        className="fixed inset-0 bg-black/20"
        aria-hidden="true"
        data-testid="drawer-overlay"
      />
      <div className="fixed inset-y-0 right-0 flex w-full max-w-md">
        <DialogPanel className="flex w-full flex-col gap-5 overflow-y-auto bg-white p-5 shadow-xl">
          <div className="flex items-start justify-between gap-2">
            <DialogTitle className="sr-only">Task details</DialogTitle>
            <input
              value={title}
              aria-label="Title"
              onChange={(ev) => setTitle(ev.target.value)}
              onBlur={() => title.trim() !== task.title && void commit({ title })}
              onKeyDown={(ev) => ev.key === 'Enter' && ev.currentTarget.blur()}
              className="w-full rounded border border-transparent px-1 py-0.5 text-lg font-semibold hover:border-slate-200 focus:border-brand-500 focus:outline-none"
            />
            <button
              aria-label="Close"
              onClick={() => dispatch(closeDrawer())}
              className="rounded px-2 py-1 text-slate-400 hover:bg-slate-100"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="drawer-status" className={label}>Status</label>
              <select
                id="drawer-status"
                value={task.statusId}
                onChange={(ev) => void commit({ statusId: ev.target.value })}
                className={field}
              >
                {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="drawer-priority" className={label}>Priority</label>
              <select
                id="drawer-priority"
                value={task.priority}
                onChange={(ev) => void commit({ priority: ev.target.value as Priority })}
                className={field}
              >
                {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="drawer-due" className={label}>Due date</label>
              <input
                id="drawer-due"
                type="date"
                value={task.dueDate ? task.dueDate.slice(0, 10) : ''}
                onChange={(ev) => void commit({ dueDate: ev.target.value ? `${ev.target.value}T17:00:00.000Z` : null })}
                className={field}
              />
            </div>
            <div>
              <label htmlFor="drawer-move" className={label}>Move to list</label>
              <select
                id="drawer-move"
                value={task.primaryListId}
                onChange={(ev) => void moveToList(ev.target.value)}
                className={field}
              >
                {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <span className={label}>Assignees</span>
            <div className="flex flex-wrap gap-3">
              {users.map((u) => (
                <label key={u.id} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={task.assigneeIds.includes(u.id)}
                    onChange={(ev) => void commit({
                      assigneeIds: ev.target.checked
                        ? [...task.assigneeIds, u.id]
                        : task.assigneeIds.filter((id) => id !== u.id),
                    })}
                    className="accent-brand-600"
                  />
                  {u.name}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="drawer-desc" className={label}>Description</label>
            <textarea
              id="drawer-desc"
              rows={4}
              value={description}
              onChange={(ev) => setDescription(ev.target.value)}
              onBlur={() => description !== task.description && void commit({ description })}
              className={field}
            />
          </div>

          <SubtaskList parent={task} />

          <button
            onClick={async () => {
              const res = await dispatch(archiveTask({ id: task.id }));
              if (archiveTask.rejected.match(res)) {
                dispatch(addToast({ message: res.payload?.error.message ?? 'Archive failed', tone: 'error' }));
              }
            }}
            className="mt-auto rounded-card border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            Archive task
          </button>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
