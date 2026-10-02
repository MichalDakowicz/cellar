import { useCallback, useMemo, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

import type { ProjectTile } from '@/components/cellar/ProjectCard';
import { folderOutline, folderRun, type GridCell, type Rect } from '@/lib/shelfGrid';

export type FolderOutlineShape = { id: string; d: string };

/**
 * The outline round each open folder, drawn from where its cells actually landed.
 *
 * Rows are as tall as the layout made them, not as tall as a formula guessed —
 * a tile whose name wraps, or a font scaled up, moves every row after it — so
 * each cell reports its own frame and the path follows. A folder whose cells have
 * not all reported yet has no outline for that frame rather than a wrong one.
 */
export function useFolderOutlines(cells: GridCell<ProjectTile>[], inset: number, radius: number) {
  const [rects, setRects] = useState<Record<string, Rect>>({});

  const measure = useCallback((key: string, event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setRects((prev) => {
      const old = prev[key];
      if (old && old.left === x && old.top === y && old.right === x + width && old.bottom === y + height) return prev;
      return { ...prev, [key]: { left: x, top: y, right: x + width, bottom: y + height } };
    });
  }, []);

  const outlines = useMemo(() => {
    const shapes: FolderOutlineShape[] = [];
    for (const cell of cells) {
      if (cell.kind !== 'folder' || !cell.open) continue;
      const run = folderRun(cells, cell.group.id).map((key) => rects[key]);
      if (run.some((rect) => !rect)) continue;
      shapes.push({ id: cell.group.id, d: folderOutline(run, inset, radius) });
    }
    return shapes;
  }, [cells, rects, inset, radius]);

  return { measure, outlines };
}
