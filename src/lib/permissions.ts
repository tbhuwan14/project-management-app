import type { Container, Grant, User } from '../types';

export interface PermissionEntities {
  containers: Record<string, Container | undefined>;
  users: Record<string, User | undefined>;
  grants: Grant[];
}

/** node-first chain: [node, parent, ..., workspace]. Stops on missing parents. */
function chainOf(e: PermissionEntities, containerId: string): Container[] {
  const chain: Container[] = [];
  let current = e.containers[containerId];
  while (current) {
    chain.push(current);
    current = current.parentId ? e.containers[current.parentId] : undefined;
  }
  return chain;
}

function isAdmin(e: PermissionEntities, userId: string): boolean {
  return e.users[userId]?.role === 'admin';
}

export function canView(e: PermissionEntities, userId: string, containerId: string): boolean {
  const chain = chainOf(e, containerId);
  if (chain.length === 0) return false;
  if (chain.some((n) => n.archivedAt !== null)) return false;
  if (isAdmin(e, userId)) return true;

  const chainIds = new Set(chain.map((n) => n.id));
  const userGrants = e.grants.filter((g) => g.userId === userId && chainIds.has(g.resourceId));
  if (userGrants.some((g) => g.mode === 'deny')) return false;

  const hasPrivate = chain.some((n) => n.visibility === 'private');
  if (!hasPrivate) return true;
  return userGrants.some((g) => g.mode === 'allow');
}

export function canEditTasks(e: PermissionEntities, userId: string, listId: string): boolean {
  return canView(e, userId, listId);
}

export function canManageContainers(e: PermissionEntities, userId: string): boolean {
  return isAdmin(e, userId);
}

/**
 * viewableIds: nodes the user can open. passThroughIds: ancestors shown in the
 * tree purely as navigation context for a viewable descendant.
 */
export function getVisibleContainers(
  e: PermissionEntities,
  userId: string,
): { viewableIds: Set<string>; passThroughIds: Set<string> } {
  const viewableIds = new Set<string>();
  const passThroughIds = new Set<string>();
  for (const id of Object.keys(e.containers)) {
    if (canView(e, userId, id)) viewableIds.add(id);
  }
  for (const id of viewableIds) {
    for (const ancestor of chainOf(e, id).slice(1)) {
      if (!viewableIds.has(ancestor.id)) passThroughIds.add(ancestor.id);
    }
  }
  return { viewableIds, passThroughIds };
}
