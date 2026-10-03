import type { PaletteColor, Priority } from '../../types';

export const AVATAR_BG: Record<PaletteColor, string> = {
  gray: 'bg-slate-500', blue: 'bg-blue-500', green: 'bg-emerald-500',
  amber: 'bg-amber-500', red: 'bg-red-500', purple: 'bg-purple-500',
};

export const STATUS_DOT: Record<PaletteColor, string> = {
  gray: 'bg-slate-400', blue: 'bg-blue-500', green: 'bg-emerald-500',
  amber: 'bg-amber-500', red: 'bg-red-500', purple: 'bg-purple-500',
};

export const STATUS_PILL: Record<PaletteColor, string> = {
  gray: 'bg-slate-100 text-slate-700', blue: 'bg-blue-100 text-blue-700',
  green: 'bg-emerald-100 text-emerald-700', amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700', purple: 'bg-purple-100 text-purple-700',
};

export const PRIORITY_BADGE: Record<Priority, string> = {
  urgent: 'bg-red-100 text-priority-urgent',
  high: 'bg-orange-100 text-priority-high',
  normal: 'bg-blue-100 text-priority-normal',
  low: 'bg-slate-100 text-priority-low',
  none: 'bg-slate-100 text-slate-400',
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: 'Urgent', high: 'High', normal: 'Normal', low: 'Low', none: '—',
};
