import type { User } from '../../types';
import { AVATAR_BG } from './colors';

export default function Avatar({ user, size = 'md' }: { user: User; size?: 'sm' | 'md' }) {
  const dims = size === 'sm' ? 'h-5 w-5 text-[10px]' : 'h-7 w-7 text-xs';
  return (
    <span
      title={user.name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${dims} ${AVATAR_BG[user.color]}`}
    >
      {user.initials}
    </span>
  );
}
