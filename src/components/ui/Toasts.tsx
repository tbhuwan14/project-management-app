import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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

/**
 * Mounts the toast layer as its own direct child of <body>.
 *
 * Headless UI's Dialog (the task drawer) calls `useInertOthers` while it is open with
 * `disallowed: () => [mainTreeNode.closest('body > *:not(#headlessui-portal-root)')]`,
 * which sets `aria-hidden` AND the `inert` property on the single body child that holds
 * the React root. Anything rendered inside the app tree — toasts included — is therefore
 * unannounced, unfocusable and unclickable for as long as the drawer is open.
 *
 * Headless UI's own <Portal> is NOT a fix: it renders into `#headlessui-portal-root`, and
 * `useInertOthers`' `allowed` branch walks up from the Dialog's portal and inerts every
 * sibling inside that root — so a second portal there is inert too.
 *
 * A separate body child escapes both branches, and `useRootContainers` (which backs the
 * Dialog's outside-click and focus-trap containers) automatically treats every body child
 * that is neither the main tree node nor the portal root as a legitimate container, so
 * clicking a toast neither closes the drawer nor gets focus yanked back into it.
 */
function useToastRoot(): HTMLDivElement {
  const [root] = useState(() => document.createElement('div'));
  useEffect(() => {
    document.body.appendChild(root);
    return () => root.remove();
  }, [root]);
  return root;
}

export default function Toasts() {
  const toasts = useAppSelector((s) => s.ui.toasts);
  const root = useToastRoot();
  return createPortal(
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => <ToastItem key={t.id} toast={t} />)}
    </div>,
    root,
  );
}
