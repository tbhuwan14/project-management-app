import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectAccessibleSelectedListId } from '../../store/selectors';
import { setViewMode } from '../../store/slices/uiSlice';
import { containersSelectors } from '../../store/store';
import BoardView from '../board/BoardView';

export default function MainView() {
  const dispatch = useAppDispatch();
  const listId = useAppSelector(selectAccessibleSelectedListId);
  const list = useAppSelector((s) => (listId ? containersSelectors.selectById(s, listId) : undefined));
  const viewMode = useAppSelector((s) => s.ui.viewMode);

  if (!listId || !list) {
    return (
      <main className="flex flex-1 items-center justify-center text-slate-400">
        Select a list from the sidebar
      </main>
    );
  }

  const tab = (mode: 'board' | 'list', label: string) => (
    <button
      onClick={() => dispatch(setViewMode(mode))}
      aria-pressed={viewMode === mode}
      className={`rounded-card px-3 py-1 text-sm ${
        viewMode === mode ? 'bg-brand-600 font-medium text-white' : 'text-slate-500 hover:bg-slate-100'
      }`}
    >
      {label}
    </button>
  );

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
        <h2 className="text-base font-semibold">{list.name}</h2>
        <div className="flex gap-1">{tab('board', 'Board')}{tab('list', 'List')}</div>
      </div>
      {viewMode === 'board' ? <BoardView listId={listId} /> : <div className="p-4 text-slate-400">List view</div>}
    </main>
  );
}
