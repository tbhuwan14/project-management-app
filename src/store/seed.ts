import { POSITION_GAP } from '../lib/ordering';
import type { Container, Grant, Priority, Status, Task, User } from '../types';

const T0 = '2026-09-20T09:00:00.000Z';
const pos = (i: number) => (i + 1) * POSITION_GAP;

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
  ['l-backlog', 'todo', 'Set up CI pipeline', 'high', ['u-bob'], '2026-10-10T17:00:00.000Z'],
  ['l-backlog', 'todo', 'Design system audit', 'normal', ['u-carol'], null],
  ['l-backlog', 'todo', 'Spike: feature flags', 'low', [], '2026-10-20T17:00:00.000Z'],
  ['l-backlog', 'prog', 'API error taxonomy', 'normal', ['u-alice', 'u-bob'], '2026-09-28T17:00:00.000Z'],
  ['l-backlog', 'done', 'Pick bundler', 'none', ['u-bob'], '2026-09-15T17:00:00.000Z'],
  ['l-sprint', 'todo', 'Implement login screen', 'urgent', ['u-bob'], '2026-10-03T17:00:00.000Z'],
  ['l-sprint', 'todo', 'Rate-limit uploads', 'high', ['u-carol'], '2026-10-06T17:00:00.000Z'],
  ['l-sprint', 'prog', 'Migrate billing webhooks', 'urgent', ['u-alice'], '2026-09-29T17:00:00.000Z'],
  ['l-sprint', 'prog', 'Fix flaky e2e suite', 'normal', ['u-bob', 'u-carol'], null],
  ['l-sprint', 'review', 'Dark-launch search index', 'high', ['u-carol'], '2026-10-02T17:00:00.000Z'],
  ['l-sprint', 'done', 'Upgrade Node to 22', 'normal', ['u-bob'], '2026-09-25T17:00:00.000Z'],
  ['l-sprint', 'done', 'Remove legacy flags', 'low', [], null],
  ['l-content', 'todo', 'October newsletter draft', 'high', ['u-carol'], '2026-10-05T17:00:00.000Z'],
  ['l-content', 'todo', 'SEO keyword refresh', 'normal', [], '2026-10-12T17:00:00.000Z'],
  ['l-content', 'prog', 'Case study: Globex', 'normal', ['u-carol', 'u-alice'], '2026-10-08T17:00:00.000Z'],
  ['l-content', 'done', 'Social calendar Q4', 'low', ['u-carol'], '2026-09-26T17:00:00.000Z'],
  ['l-roadmap', 'todo', 'FY27 headcount plan', 'urgent', ['u-alice'], '2026-10-15T17:00:00.000Z'],
  ['l-roadmap', 'todo', 'Pricing v3 proposal', 'high', ['u-alice', 'u-carol'], '2026-10-22T17:00:00.000Z'],
  ['l-roadmap', 'prog', 'Partner strategy memo', 'normal', ['u-carol'], null],
  ['l-roadmap', 'done', 'Board deck September', 'high', ['u-alice'], '2026-09-24T17:00:00.000Z'],
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
