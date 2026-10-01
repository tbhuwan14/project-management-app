import { Switch } from '@headlessui/react';
import { clearPersisted } from '../../store/persistence';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setSimulateFailures } from '../../store/slices/sessionSlice';
import { appReset } from '../../store/store';
import UserSwitcher from './UserSwitcher';

export default function TopBar() {
  const dispatch = useAppDispatch();
  const simulateFailures = useAppSelector((s) => s.session.simulateFailures);
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-brand-600">Flowboard</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Switch
            checked={simulateFailures}
            onChange={(on) => dispatch(setSimulateFailures(on))}
            aria-label="Simulate failures"
            className="group inline-flex h-5 w-9 items-center rounded-full bg-slate-300 transition data-checked:bg-red-500"
          >
            <span className="h-4 w-4 translate-x-0.5 rounded-full bg-white transition group-data-checked:translate-x-4" />
          </Switch>
          <span>Simulate failures</span>
        </div>
        <button
          onClick={() => { clearPersisted(); dispatch(appReset()); }}
          className="rounded-card border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          Reset demo data
        </button>
        <UserSwitcher />
      </div>
    </header>
  );
}
