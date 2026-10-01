import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectCanManage, selectVisibleTree, type TreeNode } from '../../store/selectors';
import { addToast } from '../../store/slices/uiSlice';
import { archiveContainer, createContainer, renameContainer } from '../../store/thunks/containerThunks';
import SiblingGroup from './SiblingGroup';
import TreeNodeItem from './TreeNodeItem';
import { CHILD_TYPE, type NodeEdit } from './treeTypes';

export { CHILD_TYPE, type NodeEdit };

/**
 * Drops "dead end" branches from the rendered tree: a non-list node (space,
 * folder, workspace) that is itself viewable but whose only children are
 * denied to this user ends up with zero visible children — a real node with
 * nothing underneath and nothing the user can do about it. An admin can
 * still add structure under it, so we only hide it for users who can't
 * manage containers. Pass-through ancestors (dimmed, on the path to a
 * granted descendant) are never touched here — by construction they always
 * have at least one surviving child, and they must stay visible as
 * navigation context regardless.
 *
 * This only affects what Sidebar renders; selectVisibleTree itself (the
 * permission-model selector) is untouched.
 */
function pruneDeadEnds(nodes: TreeNode[], canManage: boolean): TreeNode[] {
  const result: TreeNode[] = [];
  for (const node of nodes) {
    const children = pruneDeadEnds(node.children, canManage);
    const isDeadEnd = node.container.type !== 'list' && !node.passThrough && !canManage && children.length === 0;
    if (isDeadEnd) continue;
    result.push(children === node.children ? node : { ...node, children });
  }
  return result;
}

export default function Sidebar() {
  const dispatch = useAppDispatch();
  const rawTree = useAppSelector(selectVisibleTree);
  const canManage = useAppSelector(selectCanManage);
  const tree = pruneDeadEnds(rawTree, canManage);
  const [edit, setEdit] = useState<NodeEdit | null>(null);

  const toastIfRejected = (res: { meta: { requestStatus: string }; payload?: unknown }) => {
    if (res.meta.requestStatus === 'rejected') {
      const message = (res.payload as { error?: { message?: string } } | undefined)?.error?.message ?? 'Action failed';
      dispatch(addToast({ message, tone: 'error' }));
    }
  };

  const commitEdit = async (value: string) => {
    if (!edit) return;
    const name = value.trim();
    setEdit(null);
    if (!name) return;
    if (edit.kind === 'rename') {
      toastIfRejected(await dispatch(renameContainer({ id: edit.nodeId, name })));
    } else {
      toastIfRejected(await dispatch(createContainer({ name, type: edit.childType, parentId: edit.nodeId })));
    }
  };

  const archive = async (id: string) => {
    toastIfRejected(await dispatch(archiveContainer({ id })));
  };

  return (
    <nav aria-label="Workspace tree" className="flex h-full flex-col gap-1 p-2">
      {tree.length > 0 ? (
        <SiblingGroup
          nodes={tree}
          renderNode={(node) => (
            <TreeNodeItem
              key={node.container.id}
              node={node}
              depth={0}
              canManage={canManage}
              edit={edit}
              onStartEdit={setEdit}
              onCommitEdit={commitEdit}
              onCancelEdit={() => setEdit(null)}
              onArchive={archive}
            />
          )}
        />
      ) : (
        <p className="p-2 text-sm text-slate-400">Nothing visible for this user</p>
      )}
    </nav>
  );
}
