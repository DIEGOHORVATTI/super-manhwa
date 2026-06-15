/**
 * "Million pixel" board geometry + pricing — pure, unit-testable. The board is a
 * COLS×ROWS grid of square blocks (each `BLOCK_PX` pixels). Advertisers buy an
 * axis-aligned rectangle of free blocks and pay per block.
 */
export const GRID = { cols: 100, rows: 100, blockPx: 10 } as const; // 1000×1000 = 1M px

/**
 * Price per square (the 10×10px block) in cents (env override). Default R$5,00 —
 * the square IS the unit. A full 100×100 board (10.000 squares) sells for
 * R$50.000. Minimum purchase is one square (R$5); drag to buy a bigger region.
 */
export const BLOCK_PRICE_CENTS = Math.max(
  1,
  Math.round(Number(process.env.PIXEL_BLOCK_PRICE_CENTS ?? 500)),
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

/** Validates bounds + min size, integer coords. No per-purchase cap. */
export function isValidRect(rect: Rect): boolean {
  const { x, y, w, h } = rect;
  if (![x, y, w, h].every((n) => Number.isInteger(n))) return false;
  if (w < 1 || h < 1) return false;
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

/** Convert block rect → CSS percentage box, so the board scales responsively. */
export function toPercentBox(rect: Rect) {
  return {
    left: `${(rect.x / GRID.cols) * 100}%`,
    top: `${(rect.y / GRID.rows) * 100}%`,
    width: `${(rect.w / GRID.cols) * 100}%`,
    height: `${(rect.h / GRID.rows) * 100}%`,
  };
}
