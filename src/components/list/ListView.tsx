import { formatDue, isLate } from '../../lib/date';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectListRows, selectListStatuses } from '../../store/selectors';
import { openDrawer, setListSort, type ListSort } from '../../store/slices/uiSlice';
import { usersSelectors } from '../../store/store';
import Avatar from '../ui/Avatar';
import { PRIORITY_BADGE, PRIORITY_LABEL, STATUS_PILL } from '../ui/colors';

function SortHeader({ label, sortKey }: { label: string; sortKey: ListSort['key'] }) {
  const dispatch = useAppDispatch();
  const sort = useAppSelector((s) => s.ui.listSort);
  const active = sort?.key === sortKey;
  const next = (): ListSort | null => {
    if (!active) return { key: sortKey, dir: 'asc' };
    if (sort!.dir === 'asc') return { key: sortKey, dir: 'desc' };
    return null;
  };
  const ariaSort: 'ascending' | 'descending' | 'none' = !active ? 'none' : sort!.dir === 'asc' ? 'ascending' : 'descending';
  return (
    <th aria-sort={ariaSort} className="border-b border-slate-200 px-3 py-2">
      <button
        onClick={() => dispatch(setListSort(next()))}
        className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wide ${
          active ? 'text-brand-600' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        {label}
        {active && <span>{sort!.dir === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </th>
  );
}

export default function ListView({ listId }: { listId: string }) {
  const dispatch = useAppDispatch();
  const rows = useAppSelector((s) => selectListRows(s, listId));
  const statuses = useAppSelector((s) => selectListStatuses(s, listId));
  const users = useAppSelector(usersSelectors.selectEntities);
  const statusById = new Map(statuses.map((s) => [s.id, s]));

  if (rows.length === 0) {
    return <p className="p-10 text-center text-slate-400">No tasks in this list yet — add one from the board view.</p>;
  }

  return (
    <div className="overflow-auto p-4">
      <table className="w-full border-separate border-spacing-0 rounded-card bg-white shadow-card">
        <thead>
          <tr className="text-left">
            <th className="border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Title</th>
            <th className="border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
            <th className="border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Assignees</th>
            <SortHeader label="Priority" sortKey="priority" />
            <SortHeader label="Due date" sortKey="dueDate" />
          </tr>
        </thead>
        <tbody>
          {rows.map((task) => {
            const status = statusById.get(task.statusId);
            return (
              <tr
                key={task.id}
                data-testid={`row-${task.id}`}
                tabIndex={0}
                onClick={() => dispatch(openDrawer(task.id))}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    dispatch(openDrawer(task.id));
                  }
                }}
                className="cursor-pointer hover:bg-slate-50 focus:outline-2 focus:-outline-offset-2 focus:outline-brand-500"
              >
                <td className="border-b border-slate-100 px-3 py-2 text-sm font-medium">{task.title}</td>
                <td className="border-b border-slate-100 px-3 py-2">
                  {status && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_PILL[status.color]}`}>
                      {status.name}
                    </span>
                  )}
                </td>
                <td className="border-b border-slate-100 px-3 py-2">
                  <span className="flex -space-x-1.5">
                    {task.assigneeIds.map((id) => {
                      const u = users[id];
                      return u ? <Avatar key={id} user={u} size="sm" /> : null;
                    })}
                  </span>
                </td>
                <td className="border-b border-slate-100 px-3 py-2">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY_BADGE[task.priority]}`}>
                    {PRIORITY_LABEL[task.priority]}
                  </span>
                </td>
                <td className={`border-b border-slate-100 px-3 py-2 text-sm ${
                  task.dueDate && isLate(task.dueDate, status?.category ?? 'todo') ? 'font-semibold text-red-600' : 'text-slate-500'
                }`}>
                  {task.dueDate ? formatDue(task.dueDate) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
