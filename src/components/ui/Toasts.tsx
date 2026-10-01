import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { removeToast, type Toast } from '../../store/slices/uiSlice';

function ToastItem({ toast }: { toast: Toast }) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const timer = setTimeout(() => dispatch(removeToast(toast.id)), 4000);
    return () => clearTimeout(timer);
  }, [dispatch, toast.id]);
  const tone = toast.tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800';
  return (
    <div role="alert" className={`flex items-center gap-3 rounded-card border px-4 py-2.5 shadow-card ${tone}`}>
      <span className="text-sm">{toast.message}</span>
      <button
        aria-label="Dismiss"
        onClick={() => dispatch(removeToast(toast.id))}
        className="text-sm font-bold opacity-50 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
}

export default function Toasts() {
  const toasts = useAppSelector((s) => s.ui.toasts);
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => <ToastItem key={t.id} toast={t} />)}
    </div>
  );
}
