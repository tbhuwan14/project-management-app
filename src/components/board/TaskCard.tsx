import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatDue, isOverdue } from '../../lib/date';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectSubtasks } from '../../store/selectors';
import { openDrawer } from '../../store/slices/uiSlice';
import { usersSelectors } from '../../store/store';
import type { Task, User } from '../../types';
import Avatar from '../ui/Avatar';
import { PRIORITY_BADGE, PRIORITY_LABEL } from '../ui/colors';

export default function TaskCard({ task, overlay = false }: { task: Task; overlay?: boolean }) {
  const dispatch = useAppDispatch();
  // Select the stable entity dictionary and map outside the selector — mapping
  // inside useAppSelector would build a brand-new array on every store change,
  // causing re-render churn and react-redux's "selector returned a different
  // result" warning.
  const usersById = useAppSelector(usersSelectors.selectEntities);
  const users = task.assigneeIds
    .map((id) => usersById[id])
    .filter((u): u is User => u !== undefined);
  const subtaskCount = useAppSelector((s) => selectSubtasks(s, task.id).length);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: overlay,
  });

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      style={overlay ? undefined : { transform: CSS.Transform.toString(transform), transition }} // dnd-kit exception (README)
      data-testid={`card-${task.id}`}
      onClick={() => !overlay && dispatch(openDrawer(task.id))}
      className={`cursor-pointer rounded-card border border-slate-200 bg-white p-3 shadow-card transition hover:border-brand-500 ${
        isDragging ? 'opacity-40' : ''
      } ${overlay ? 'rotate-2 shadow-lg' : ''}`}
    >
      <p className="mb-2 text-sm font-medium leading-snug">{task.title}</p>
      <div className="flex items-center gap-2">
        {task.priority !== 'none' && (
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${PRIORITY_BADGE[task.priority]}`}>
            {PRIORITY_LABEL[task.priority]}
          </span>
        )}
        {task.dueDate && (
          <span className={`text-[11px] ${isOverdue(task.dueDate) ? 'font-semibold text-red-600' : 'text-slate-500'}`}>
            {formatDue(task.dueDate)}
          </span>
        )}
        {subtaskCount > 0 && <span className="text-[11px] text-slate-400">☑ {subtaskCount}</span>}
        <span className="ml-auto flex -space-x-1.5">
          {users.map((u) => <Avatar key={u.id} user={u} size="sm" />)}
        </span>
      </div>
    </div>
  );
}
