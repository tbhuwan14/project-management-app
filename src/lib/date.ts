import type { StatusCategory } from '../types';

const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export const formatDue = (iso: string): string => formatter.format(new Date(iso));

export const isOverdue = (iso: string): boolean => new Date(iso).getTime() < Date.now();

/**
 * A task only reads as "late" when it is both past its due date AND not yet
 * done — a completed task keeps its due date for reference but should never
 * render in the overdue-red treatment. Shared by the board card and the list
 * row so the two surfaces can never drift apart on this rule.
 */
export const isLate = (dueDate: string | null, statusCategory: StatusCategory): boolean =>
  dueDate !== null && statusCategory !== 'done' && isOverdue(dueDate);
