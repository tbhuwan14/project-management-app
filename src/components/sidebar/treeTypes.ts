import type { ContainerType } from '../../types';

// Shared by Sidebar.tsx and TreeNodeItem.tsx. Lives in its own module (rather
// than being exported from Sidebar.tsx and imported back into TreeNodeItem)
// so the two component files don't form a runtime import cycle — Sidebar
// renders TreeNodeItem, and TreeNodeItem needs these values/types.
export const CHILD_TYPE: Record<ContainerType, ContainerType | null> = {
  workspace: 'space',
  space: 'folder',
  folder: 'list',
  list: null,
};

export type NodeEdit =
  | { kind: 'rename'; nodeId: string }
  | { kind: 'add'; nodeId: string; childType: ContainerType };
