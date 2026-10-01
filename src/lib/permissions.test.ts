import type { Container, Grant, User } from '../types';
import { canEditTasks, canManageContainers, canView, getVisibleContainers } from './permissions';
import type { PermissionEntities } from './permissions';

const ts = '2026-09-20T00:00:00.000Z';
const c = (id: string, type: Container['type'], parentId: string | null, visibility: Container['visibility'] = 'public'): Container => ({
  id, name: id, type, parentId, position: 1024, visibility, archivedAt: null, createdAt: ts, updatedAt: ts,
});
const u = (id: string, role: User['role']): User => ({ id, name: id, initials: id.slice(0, 2).toUpperCase(), color: 'blue', role });
const g = (id: string, resourceId: string, userId: string, mode: Grant['mode']): Grant => ({ id, resourceId, userId, mode });

// ws → space (public) → folder → listA (public)
//                              → listB (private)
//    → spacePriv (private) → folderP → listP (public)
const entities: PermissionEntities = {
  containers: Object.fromEntries(
    [
      c('ws', 'workspace', null),
      c('space', 'space', 'ws'),
      c('folder', 'folder', 'space'),
      c('listA', 'list', 'folder'),
      c('listB', 'list', 'folder', 'private'),
      c('spacePriv', 'space', 'ws', 'private'),
      c('folderP', 'folder', 'spacePriv'),
      c('listP', 'list', 'folderP'),
    ].map((x) => [x.id, x]),
  ),
  users: { admin: u('admin', 'admin'), mem: u('mem', 'member') },
  grants: [],
};
const withGrants = (...grants: Grant[]): PermissionEntities => ({ ...entities, grants });

describe('canView', () => {
  test('admin sees everything including private', () => {
    expect(canView(entities, 'admin', 'listB')).toBe(true);
    expect(canView(entities, 'admin', 'listP')).toBe(true);
  });
  test('member sees public chain by default', () => {
    expect(canView(entities, 'mem', 'listA')).toBe(true);
  });
  test('deny on ancestor wins over default', () => {
    const e = withGrants(g('g1', 'space', 'mem', 'deny'));
    expect(canView(e, 'mem', 'listA')).toBe(false);
    expect(canView(e, 'mem', 'space')).toBe(false);
  });
  test('deny wins over allow on same chain', () => {
    const e = withGrants(g('g1', 'spacePriv', 'mem', 'allow'), g('g2', 'folderP', 'mem', 'deny'));
    expect(canView(e, 'mem', 'listP')).toBe(false);
  });
  test('private node requires allow on chain', () => {
    expect(canView(entities, 'mem', 'listB')).toBe(false);
    expect(canView(entities, 'mem', 'listP')).toBe(false);
    const e = withGrants(g('g1', 'listB', 'mem', 'allow'));
    expect(canView(e, 'mem', 'listB')).toBe(true);
  });
  test('allow on private ancestor covers descendants', () => {
    const e = withGrants(g('g1', 'spacePriv', 'mem', 'allow'));
    expect(canView(e, 'mem', 'listP')).toBe(true);
    expect(canView(e, 'mem', 'spacePriv')).toBe(true);
  });
  test('archived node is not viewable even for admin', () => {
    const e: PermissionEntities = {
      ...entities,
      containers: { ...entities.containers, listA: { ...entities.containers.listA!, archivedAt: ts } },
    };
    expect(canView(e, 'admin', 'listA')).toBe(false);
  });
});

describe('getVisibleContainers', () => {
  test('pass-through ancestors of an allowed deep node', () => {
    const e = withGrants(g('g1', 'listP', 'mem', 'allow'));
    const { viewableIds, passThroughIds } = getVisibleContainers(e, 'mem');
    expect(viewableIds.has('listP')).toBe(true);
    expect(viewableIds.has('spacePriv')).toBe(false);
    expect(passThroughIds.has('spacePriv')).toBe(true);
    expect(passThroughIds.has('folderP')).toBe(true);
  });
  test('member default: public subtree visible, private hidden', () => {
    const { viewableIds, passThroughIds } = getVisibleContainers(entities, 'mem');
    expect(viewableIds.has('listA')).toBe(true);
    expect(viewableIds.has('listB')).toBe(false);
    expect(passThroughIds.has('spacePriv')).toBe(false);
  });
});

describe('edit rights', () => {
  test('member can edit tasks in viewable list only', () => {
    expect(canEditTasks(entities, 'mem', 'listA')).toBe(true);
    expect(canEditTasks(entities, 'mem', 'listB')).toBe(false);
  });
  test('only admin manages containers', () => {
    expect(canManageContainers(entities, 'admin')).toBe(true);
    expect(canManageContainers(entities, 'mem')).toBe(false);
  });
});
