import type { Container } from '../../types';
import type { TreeNode } from '../../store/selectors';
import { computeReorderPosition } from './reorder';

const makeNode = (id: string, position: number): TreeNode => ({
  container: {
    id,
    name: id,
    type: 'list',
    parentId: 'p-1',
    position,
    visibility: 'public',
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  } satisfies Container,
  children: [],
  passThrough: false,
});

describe('computeReorderPosition', () => {
  const nodes = [makeNode('a', 1024), makeNode('b', 2048), makeNode('c', 3072)];

  test('dragging the first item down onto the last item places it after the last', () => {
    const position = computeReorderPosition(nodes, 'a', 'c');
    expect(position).toBe(4096);
  });

  test('dragging the first item down onto the middle item places it between middle and last', () => {
    const position = computeReorderPosition(nodes, 'a', 'b');
    expect(position).toBe(2560);
  });

  test('dragging the last item up onto the first item places it before the first', () => {
    const position = computeReorderPosition(nodes, 'c', 'a');
    expect(position).toBe(512);
  });

  test('dragging an item onto itself is a no-op', () => {
    const position = computeReorderPosition(nodes, 'b', 'b');
    expect(position).toBeNull();
  });

  test('an unknown id is a no-op', () => {
    const position = computeReorderPosition(nodes, 'a', 'does-not-exist');
    expect(position).toBeNull();
  });
});
