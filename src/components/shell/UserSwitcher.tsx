import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectCurrentUser } from '../../store/selectors';
import { setCurrentUser } from '../../store/slices/sessionSlice';
import { usersSelectors } from '../../store/store';
import Avatar from '../ui/Avatar';

export default function UserSwitcher() {
  const dispatch = useAppDispatch();
  const current = useAppSelector(selectCurrentUser);
  const users = useAppSelector(usersSelectors.selectAll);
  if (!current) return null;
  return (
    <Menu as="div" className="relative">
      <MenuButton className="flex items-center gap-2 rounded-card px-2 py-1.5 hover:bg-slate-100 focus:outline-2 focus:outline-brand-500">
        <Avatar user={current} />
        <span className="text-sm font-medium">{current.name}</span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
          {current.role}
        </span>
      </MenuButton>
      <MenuItems anchor="bottom end" className="z-50 mt-1 w-56 rounded-card border border-slate-200 bg-white p-1 shadow-card focus:outline-none">
        {users.map((user) => (
          <MenuItem key={user.id}>
            <button
              onClick={() => dispatch(setCurrentUser(user.id))}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm data-focus:bg-slate-100"
            >
              <Avatar user={user} size="sm" />
              <span className="flex-1">{user.name}</span>
              <span className="text-[10px] uppercase text-slate-400">{user.role}</span>
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}
