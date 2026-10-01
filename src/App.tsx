import Sidebar from './components/sidebar/Sidebar';
import TopBar from './components/shell/TopBar';
import Toasts from './components/ui/Toasts';
import { useAppSelector } from './store/hooks';

function BootSkeleton() {
  return (
    <div className="flex h-screen animate-pulse">
      <div className="w-64 border-r border-slate-200 bg-slate-50 p-4">
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
      <aside className="w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-3">
        <Sidebar />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex flex-1 items-center justify-center text-slate-400">
          Select a list from the sidebar
        </main>
      </div>
      <Toasts />
    </div>
  );
}
