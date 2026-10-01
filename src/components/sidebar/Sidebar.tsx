import { useState } from 'react';
import type { ContainerType } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectCanManage, selectVisibleTree } from '../../store/selectors';
import { addToast } from '../../store/slices/uiSlice';
import { archiveContainer, createContainer, renameContainer } from '../../store/thunks/containerThunks';
import TreeNodeItem from './TreeNodeItem';

export const CHILD_TYPE: Record<ContainerType, ContainerType | null> = {
  workspace: 'space',
  space: 'folder',
  folder: 'list',
  list: null,
};

export type NodeEdit =
  | { kind: 'rename'; nodeId: string }
  | { kind: 'add'; nodeId: string; childType: ContainerType };

export default function Sidebar() {
  const dispatch = useAppDispatch();
  const tree = useAppSelector(selectVisibleTree);
  const canManage = useAppSelector(selectCanManage);
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
      {tree.map((node) => (
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
      ))}
      {tree.length === 0 && <p className="p-2 text-sm text-slate-400">Nothing visible for this user</p>}
    </nav>
  );
}
