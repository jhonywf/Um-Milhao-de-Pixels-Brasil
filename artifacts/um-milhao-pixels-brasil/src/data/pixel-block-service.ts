import { demoPixelBlocks } from './mock-pixel-blocks';
import type { PixelBlock } from './pixel-blocks';

/**
 * Temporary data boundary for the wall.
 * A Supabase adapter can replace this function without changing the Canvas.
 */
export function getPixelBlocks(): PixelBlock[] {
  return demoPixelBlocks;
}
