import { POSITION_GAP } from '../lib/ordering';
import type { Container, Grant, Priority, Status, Task, User } from '../types';

const T0 = '2026-09-20T09:00:00.000Z';
const pos = (i: number) => (i + 1) * POSITION_GAP;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * ISO due-date timestamp `n` days from the real "now", pinned to 17:00 UTC —
 * the same time-of-day every seed due date uses. Due dates are computed
 * relative to the real clock (instead of hardcoded absolute dates) so the
 * demo's mix of overdue / due-soon / upcoming tasks — and the test suite
 * that asserts on it — never rot as real time passes. Each call site below
 * passes the day offset the row's date used to hardcode, measured from
 * 2026-09-30 (the implicit "today" that spread was designed around: the
 * day before 2026-10-01, the earliest "due soon" date, and one day after
 * 2026-09-29, the nearest "overdue" one) — so the spread and the relative
 * ordering between tasks is unchanged.
 */
export function daysFromNow(n: number): string {
  const due = new Date(Date.now() + n * DAY_MS);
  due.setUTCHours(17, 0, 0, 0);
  return due.toISOString();
}

export const seedUsers: User[] = [
  { id: 'u-alice', name: 'Alice Admin', initials: 'AA', color: 'purple', role: 'admin' },
  { id: 'u-bob', name: 'Bob Builder', initials: 'BB', color: 'blue', role: 'member' },
  { id: 'u-carol', name: 'Carol Chen', initials: 'CC', color: 'green', role: 'member' },
];

const container = (
  id: string, name: string, type: Container['type'], parentId: string | null,
  i: number, visibility: Container['visibility'] = 'public',
): Container => ({
  id, name, type, parentId, position: pos(i), visibility,
  archivedAt: null, createdAt: T0, updatedAt: T0,
});

export const seedContainers: Container[] = [
  container('ws-1', 'Acme Inc', 'workspace', null, 0),
  container('sp-eng', 'Engineering', 'space', 'ws-1', 0),
  container('sp-mkt', 'Marketing', 'space', 'ws-1', 1, 'private'),
  container('f-q4', 'Q4 Launch', 'folder', 'sp-eng', 0),
  container('f-web', 'Website Revamp', 'folder', 'sp-mkt', 0),
  container('l-backlog', 'Backlog', 'list', 'f-q4', 0),
  container('l-sprint', 'Sprint 1', 'list', 'f-q4', 1),
  container('l-content', 'Content Calendar', 'list', 'f-web', 0),
  container('l-roadmap', 'Leadership Roadmap', 'list', 'f-web', 1, 'private'),
];

/**
 * Default todo/in_progress/done status set for a list. Every list — seeded or
 * created later through the UI — must own one of these (containerThunks.createContainer
 * reuses this exact helper so a UI-created list is indistinguishable from a seeded one).
 */
export const statusTriple = (listId: string): Status[] => [
  { id: `${listId}-todo`, listId, name: 'To Do', category: 'todo', color: 'gray', position: pos(0) },
  { id: `${listId}-prog`, listId, name: 'In Progress', category: 'in_progress', color: 'blue', position: pos(1) },
  { id: `${listId}-done`, listId, name: 'Done', category: 'done', color: 'green', position: pos(2) },
];

export const seedStatuses: Status[] = [
  ...statusTriple('l-backlog'),
  ...statusTriple('l-sprint'),
  // Sprint 1 demonstrates per-list custom statuses with an extra column:
  { id: 'l-sprint-review', listId: 'l-sprint', name: 'In Review', category: 'in_progress', color: 'amber', position: pos(1) + POSITION_GAP / 2 },
  ...statusTriple('l-content'),
  ...statusTriple('l-roadmap'),
];

// [listId, statusSuffix, title, priority, assignees, dueDate]
type Row = [string, string, string, Priority, string[], string | null];
const rows: Row[] = [
  ['l-backlog', 'todo', 'Set up CI pipeline', 'high', ['u-bob'], daysFromNow(10)],
  ['l-backlog', 'todo', 'Design system audit', 'normal', ['u-carol'], null],
  ['l-backlog', 'todo', 'Spike: feature flags', 'low', [], daysFromNow(20)],
  ['l-backlog', 'prog', 'API error taxonomy', 'normal', ['u-alice', 'u-bob'], daysFromNow(-2)],
  ['l-backlog', 'done', 'Pick bundler', 'none', ['u-bob'], daysFromNow(-15)],
  ['l-sprint', 'todo', 'Implement login screen', 'urgent', ['u-bob'], daysFromNow(3)],
  ['l-sprint', 'todo', 'Rate-limit uploads', 'high', ['u-carol'], daysFromNow(6)],
  ['l-sprint', 'prog', 'Migrate billing webhooks', 'urgent', ['u-alice'], daysFromNow(-1)],
  ['l-sprint', 'prog', 'Fix flaky e2e suite', 'normal', ['u-bob', 'u-carol'], null],
  ['l-sprint', 'review', 'Dark-launch search index', 'high', ['u-carol'], daysFromNow(2)],
  ['l-sprint', 'done', 'Upgrade Node to 22', 'normal', ['u-bob'], daysFromNow(-5)],
  ['l-sprint', 'done', 'Remove legacy flags', 'low', [], null],
  ['l-content', 'todo', 'October newsletter draft', 'high', ['u-carol'], daysFromNow(5)],
  ['l-content', 'todo', 'SEO keyword refresh', 'normal', [], daysFromNow(12)],
  ['l-content', 'prog', 'Case study: Globex', 'normal', ['u-carol', 'u-alice'], daysFromNow(8)],
  ['l-content', 'done', 'Social calendar Q4', 'low', ['u-carol'], daysFromNow(-4)],
  ['l-roadmap', 'todo', 'FY27 headcount plan', 'urgent', ['u-alice'], daysFromNow(15)],
  ['l-roadmap', 'todo', 'Pricing v3 proposal', 'high', ['u-alice', 'u-carol'], daysFromNow(22)],
  ['l-roadmap', 'prog', 'Partner strategy memo', 'normal', ['u-carol'], null],
  ['l-roadmap', 'done', 'Board deck September', 'high', ['u-alice'], daysFromNow(-6)],
];

export const seedTasks: Task[] = rows.map(([listId, suffix, title, priority, assigneeIds, dueDate], i) => ({
  id: `t-${i + 1}`,
  title,
  description: `Details for "${title}" live here. Edit freely — this is seed data.`,
  primaryListId: listId,
  statusId: `${listId}-${suffix}`,
  priority,
  assigneeIds,
  dueDate,
  position: pos(i),
  parentTaskId: null,
  archivedAt: null,
  createdAt: T0,
  updatedAt: T0,
}));

export const seedGrants: Grant[] = [
  { id: 'g-1', resourceId: 'sp-mkt', userId: 'u-bob', mode: 'deny' },
  { id: 'g-2', resourceId: 'l-roadmap', userId: 'u-carol', mode: 'allow' },
  { id: 'g-3', resourceId: 'f-q4', userId: 'u-carol', mode: 'deny' },
];
