import type { ShelfSection } from '@/lib/groups';
import type { Group, Project } from '@/types/cellar';

/**
 * The shelf as one grid. A group is a tile in it, not a band above it: closed it
 * is one cell, open its projects follow it cell by cell and a single outline is
 * drawn round the run. Everything here is arithmetic over that flat list — no
 * React, so the layout rules can be tested without a renderer.
 */

type Homed = Pick<Project, 'id' | 'groupId' | 'groupHome'>;

export type GridCell<T extends Homed> =
  | {
      kind: 'folder';
      key: string;
      group: Group;
      open: boolean;
      projects: T[];
      /** The folder's own id when open — the run its outline is drawn round. */
      folderId: string | null;
    }
  | {
      kind: 'project';
      key: string;
      project: T;
      /** Set for a project drawn inside an open folder, null for a loose one. */
      folderId: string | null;
      /** Name of that folder, so a tile pulled out of context still says where it lives. */
      crumb: string | null;
    };

/**
 * Sections to cells. Folders keep the order `shelfSections` gave them, a closed
 * one contributes only itself, an open one its projects straight after it, and
 * the loose projects close the grid.
 */
export function shelfCells<T extends Homed>(sections: (ShelfSection<T> & { open: boolean })[]): GridCell<T>[] {
  const cells: GridCell<T>[] = [];
  for (const section of sections) {
    if (section.type === 'loose') {
      for (const project of section.projects) {
        cells.push({ kind: 'project', key: `p:${project.id}`, project, folderId: null, crumb: null });
      }
      continue;
    }
    const { group, projects, open } = section;
    cells.push({ kind: 'folder', key: `f:${group.id}`, group, open, projects, folderId: open ? group.id : null });
    if (!open) continue;
    for (const project of projects) {
      cells.push({ kind: 'project', key: `p:${project.id}`, project, folderId: group.id, crumb: group.name });
    }
  }
  return cells;
}

/** Keys of every cell inside one open folder, the folder's own tile first. */
export function folderRun<T extends Homed>(cells: GridCell<T>[], folderId: string): string[] {
  return cells.filter((cell) => cell.folderId === folderId).map((cell) => cell.key);
}

/** 4:3 tiles, so the columns climb a step slower than a poster grid's would. */
export function columnsFor(width: number): number {
  if (width >= 1536) return 6;
  if (width >= 1280) return 5;
  if (width >= 1024) return 4;
  if (width >= 768) return 3;
  return 2;
}

export type Rect = { left: number; top: number; right: number; bottom: number };

type Point = [number, number];

/**
 * A closed SVG path round a run of grid cells: the union of their rectangles,
 * corners rounded.
 *
 * Cells in one row merge into a band; bands stack, and where two meet the join
 * sits halfway between them, so a run that starts mid-row and wraps traces a
 * stair rather than a box with a hole. `inset` pulls the line in from the cells'
 * outer edges (the cells carry their own padding, so an inset of 0 would run the
 * line through the gap between tiles).
 *
 * Empty string for no cells — the caller draws nothing.
 */
export function folderOutline(cells: Rect[], inset: number, radius: number): string {
  if (cells.length === 0) return '';

  const rows: Rect[] = [];
  for (const cell of [...cells].sort((a, b) => a.top - b.top || a.left - b.left)) {
    const row = rows.find((candidate) => Math.abs(candidate.top - cell.top) < 2);
    if (!row) {
      rows.push({ ...cell });
      continue;
    }
    row.left = Math.min(row.left, cell.left);
    row.right = Math.max(row.right, cell.right);
    row.bottom = Math.max(row.bottom, cell.bottom);
  }

  const band = rows.map((row) => ({
    left: row.left + inset,
    right: row.right - inset,
    top: row.top + inset,
    bottom: row.bottom - inset,
  }));
  for (let i = 0; i < band.length - 1; i++) {
    const seam = (rows[i].bottom + rows[i + 1].top) / 2;
    band[i].bottom = seam;
    band[i + 1].top = seam;
  }

  // Clockwise from the top-left: along the top, down the right edge band by
  // band, along the bottom, then back up the left edge.
  const walk: Point[] = [
    [band[0].left, band[0].top],
    [band[0].right, band[0].top],
  ];
  band.forEach((b, i) => {
    walk.push([b.right, b.bottom]);
    if (i < band.length - 1) walk.push([band[i + 1].right, b.bottom]);
  });
  const last = band[band.length - 1];
  walk.push([last.left, last.bottom]);
  for (let i = band.length - 1; i >= 0; i--) {
    walk.push([band[i].left, band[i].top]);
    if (i > 0) walk.push([band[i - 1].left, band[i].top]);
  }
  walk.pop(); // the start point again

  const corners = withoutStraights(withoutRepeats(walk));
  return roundedPath(corners, radius);
}

const same = (a: Point, b: Point) => a[0] === b[0] && a[1] === b[1];

function withoutRepeats(points: Point[]): Point[] {
  return points.filter((point, i) => !same(point, points[(i - 1 + points.length) % points.length]));
}

/** A vertex whose neighbours share its x or its y is not a corner. */
function withoutStraights(points: Point[]): Point[] {
  return points.filter((point, i) => {
    const before = points[(i - 1 + points.length) % points.length];
    const after = points[(i + 1) % points.length];
    return !((before[0] === point[0] && point[0] === after[0]) || (before[1] === point[1] && point[1] === after[1]));
  });
}

/** Each corner becomes a quadratic bend that starts and ends `radius` along its two edges. */
function roundedPath(corners: Point[], radius: number): string {
  const along = (from: Point, to: Point, distance: number): Point => {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const length = Math.hypot(dx, dy) || 1;
    const k = Math.min(distance, length / 2) / length;
    return [from[0] + dx * k, from[1] + dy * k];
  };
  const n = corners.length;
  let d = '';
  corners.forEach((corner, i) => {
    const start = along(corner, corners[(i - 1 + n) % n], radius);
    const end = along(corner, corners[(i + 1) % n], radius);
    d += `${i === 0 ? 'M' : 'L'}${start[0]} ${start[1]}Q${corner[0]} ${corner[1]} ${end[0]} ${end[1]}`;
  });
  return `${d}Z`;
}
