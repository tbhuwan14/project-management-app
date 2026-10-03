import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import type { ContainerType } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import type { TreeNode } from '../../store/selectors';
import { selectList } from '../../store/slices/uiSlice';
import SiblingGroup from './SiblingGroup';
import { CHILD_TYPE, type NodeEdit } from './treeTypes';

const TYPE_ICON: Record<ContainerType, string> = { workspace: '◆', space: '▣', folder: '▸', list: '≡' };

// Hierarchy is bounded at four levels (workspace → space → folder → list),
// so indices 0-3 cover every real depth. Clamp defensively so a deeper-than-
// expected tree can never index past the end of the array.
const INDENT = ['pl-0', 'pl-3.5', 'pl-7', 'pl-10'] as const;
const indentClass = (depth: number): (typeof INDENT)[number] =>
  INDENT[Math.min(depth, INDENT.length - 1)];

interface Props {
  node: TreeNode;
  depth: number;
  canManage: boolean;
  edit: NodeEdit | null;
  onStartEdit: (edit: NodeEdit) => void;
  onCommitEdit: (value: string) => void;
  onCancelEdit: () => void;
  onArchive: (id: string) => void;
}

export default function TreeNodeItem(props: Props) {
  const { node, depth, canManage, edit, onStartEdit, onCommitEdit, onCancelEdit, onArchive } = props;
  const dispatch = useAppDispatch();
  const selectedListId = useAppSelector((s) => s.ui.selectedListId);
  const [expanded, setExpanded] = useState(true);
  const { container, children, passThrough } = node;
  const isList = container.type === 'list';
  const selected = isList && selectedListId === container.id;
  const childType = CHILD_TYPE[container.type];
  const renaming = edit?.kind === 'rename' && edit.nodeId === container.id;
  const adding = edit?.kind === 'add' && edit.nodeId === container.id;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: container.id,
    disabled: !canManage || passThrough,
  });

  const editInput = (defaultValue: string) => (
    <input
      autoFocus
      defaultValue={defaultValue}
      aria-label={edit?.kind === 'add' ? `New ${childType} name` : 'Rename'}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter') onCommitEdit(ev.currentTarget.value);
        if (ev.key === 'Escape') onCancelEdit();
      }}
      onBlur={onCancelEdit}
      className="w-full rounded border border-brand-500 px-1.5 py-0.5 text-sm outline-none"
    />
  );

  return (
    <div>
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className={`group flex items-center gap-1.5 rounded px-1.5 py-1 text-sm ${indentClass(depth)} ${
          selected ? 'bg-brand-50 font-medium text-brand-700' : 'hover:bg-slate-100'
        } ${passThrough ? 'opacity-50' : ''} ${isDragging ? 'opacity-40' : ''}`}
      >
        {children.length > 0 ? (
          <button
            aria-label={expanded ? 'Collapse' : 'Expand'}
            onClick={() => setExpanded((v) => !v)}
            className="w-4 text-slate-400 hover:text-slate-600"
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <span className="text-slate-400">{TYPE_ICON[container.type]}</span>
        {renaming ? (
          editInput(container.name)
        ) : (
          <button
            disabled={passThrough || !isList}
            onClick={() => isList && dispatch(selectList(container.id))}
            className={`min-w-0 flex-1 break-words text-left ${isList && !passThrough ? 'cursor-pointer' : 'cursor-default'}`}
          >
            {container.name}
          </button>
        )}
        {container.visibility === 'private' && (
          <span
            role="img"
            aria-label="Private"
            title="Private"
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
          />
        )}
        {canManage && !passThrough && !renaming && (
          <Menu as="div" className="relative shrink-0">
            <MenuButton
              aria-label={`Options for ${container.name}`}
              className={`rounded px-1 text-slate-400 hover:bg-slate-200 focus:opacity-100 focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 data-open:opacity-100 ${
                selected ? 'opacity-70' : 'opacity-0'
              }`}
            >
              ⋯
            </MenuButton>
            <MenuItems anchor="bottom start" className="z-50 w-40 rounded-card border border-slate-200 bg-white p-1 shadow-card">
              {childType && (
                <MenuItem>
                  <button
                    onClick={() => onStartEdit({ kind: 'add', nodeId: container.id, childType })}
                    className="w-full rounded px-2 py-1 text-left text-sm data-focus:bg-slate-100"
                  >
                    Add {childType}
                  </button>
                </MenuItem>
              )}
              <MenuItem>
                <button
                  onClick={() => onStartEdit({ kind: 'rename', nodeId: container.id })}
                  className="w-full rounded px-2 py-1 text-left text-sm data-focus:bg-slate-100"
                >
                  Rename
                </button>
              </MenuItem>
              {container.type !== 'workspace' && (
                <MenuItem>
                  <button
                    onClick={() => onArchive(container.id)}
                    className="w-full rounded px-2 py-1 text-left text-sm text-red-600 data-focus:bg-red-50"
                  >
                    Archive
                  </button>
                </MenuItem>
              )}
            </MenuItems>
          </Menu>
        )}
      </div>
      {adding && <div className={`${indentClass(depth + 1)} py-1 pr-2`}>{editInput('')}</div>}
      {expanded && children.length > 0 && (
        <SiblingGroup
          nodes={children}
          renderNode={(child) => (
            <TreeNodeItem key={child.container.id} {...props} node={child} depth={depth + 1} />
          )}
        />
      )}
    </div>
  );
}
