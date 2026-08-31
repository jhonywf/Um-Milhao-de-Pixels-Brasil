import type { PixelBlock } from './pixel-blocks';

/**
 * Temporary data boundary for the wall.
 * The production Supabase adapter will replace this empty state with real
 * reserved/sold blocks without changing the Canvas interaction code.
 */
export function getPixelBlocks(): PixelBlock[] {
  return [];
}
