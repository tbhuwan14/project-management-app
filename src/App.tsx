import Sidebar from './components/sidebar/Sidebar';
import MainView from './components/shell/MainView';
import TopBar from './components/shell/TopBar';
import TaskDrawer from './components/task/TaskDrawer';
import Toasts from './components/ui/Toasts';
import { useAppSelector } from './store/hooks';

function BootSkeleton() {
  return (
    <div className="flex h-screen animate-pulse">
      <div className="w-72 border-r border-slate-200 bg-slate-50 p-4">
        {[...Array(6)].map((_, i) => <div key={i} className="mb-3 h-4 rounded bg-slate-200" />)}
      </div>
      <div className="flex-1 p-6">
        <div className="mb-6 h-8 w-48 rounded bg-slate-200" />
        <div className="flex gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-64 w-72 rounded-card bg-slate-100" />)}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const booted = useAppSelector((s) => s.ui.booted);
  if (!booted) return <BootSkeleton />;
  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-14 shrink-0 items-center border-b border-slate-200 px-4">
          <span className="text-lg font-bold text-brand-600">Flowboard</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <Sidebar />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <MainView />
      </div>
      <TaskDrawer />
      <Toasts />
    </div>
  );
}
