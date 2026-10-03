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
 * still add structure under it, so a directly-viewable dead end is only
 * hidden from users who can't manage containers.
 *
 * Pass-through ancestors (dimmed, on the path to a granted descendant) are
 * only ever justified by a surviving descendant — that invariant holds for
 * the *raw* tree (selectVisibleTree only marks a node pass-through when it
 * is an ancestor of some viewable id), but pruning a childless dead end out
 * of the middle of a chain can leave a pass-through node with nothing left
 * to lead to. Recursion here already prunes bottom-up — children are fully
 * resolved before a node is judged — so re-checking a pass-through node's
 * emptiness *after* its children are pruned reaches a fixpoint in this same
 * single traversal: a stranded pass-through node is removed here, which can
 * in turn strand its own pass-through parent, which is caught on the way
 * back up the recursion, and so on to the root.
 *
 * This only affects what Sidebar renders; selectVisibleTree itself (the
 * permission-model selector) is untouched.
 */
function pruneDeadEnds(nodes: TreeNode[], canManage: boolean): TreeNode[] {
  const result: TreeNode[] = [];
  for (const node of nodes) {
    const children = pruneDeadEnds(node.children, canManage);
    const childless = node.container.type !== 'list' && children.length === 0;
    // A pass-through node with nothing left beneath it has nothing left to
    // navigate to, regardless of who's looking. A directly-viewable dead end
    // is only hidden from users who can't manage containers.
    const isDeadEnd = childless && (node.passThrough || !canManage);
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
