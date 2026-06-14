/**
 * "Million pixel" board geometry + pricing — pure, unit-testable. The board is a
 * COLS×ROWS grid of square blocks (each `BLOCK_PX` pixels). Advertisers buy an
 * axis-aligned rectangle of free blocks and pay per block.
 */
export const GRID = { cols: 100, rows: 100, blockPx: 10 } as const; // 1000×1000 px
export const MAX_BLOCKS_PER_SIDE = 20; // cap a single purchase

/** Price per block in cents (env override). Default R$10,00 / 10×10 block. */
export const BLOCK_PRICE_CENTS = Math.max(
  1,
  Math.round(Number(process.env.PIXEL_BLOCK_PRICE_CENTS ?? 1000)),
);

export interface Rect {
  x: number; // block coords (0-based)
  y: number;
  w: number; // in blocks
  h: number;
}

export function priceCents(rect: Rect): number {
  return rect.w * rect.h * BLOCK_PRICE_CENTS;
}

/** Validates bounds + min/max size, integer coords. */
export function isValidRect(rect: Rect): boolean {
  const { x, y, w, h } = rect;
  if (![x, y, w, h].every((n) => Number.isInteger(n))) return false;
  if (w < 1 || h < 1 || w > MAX_BLOCKS_PER_SIDE || h > MAX_BLOCKS_PER_SIDE) return false;
  if (x < 0 || y < 0) return false;
  if (x + w > GRID.cols || y + h > GRID.rows) return false;
  return true;
}

/** Axis-aligned overlap test between two rectangles. */
export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** True when `rect` doesn't collide with any already-taken rectangle. */
export function isFree(rect: Rect, taken: readonly Rect[]): boolean {
  return !taken.some((t) => overlaps(rect, t));
}

/** Convert block rect → CSS pixel box for rendering. */
export function toPixelBox(rect: Rect) {
  return {
    left: rect.x * GRID.blockPx,
    top: rect.y * GRID.blockPx,
    width: rect.w * GRID.blockPx,
    height: rect.h * GRID.blockPx,
  };
}
