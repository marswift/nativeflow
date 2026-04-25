/**
 * Diamond pack definitions for one-time purchases.
 *
 * Each pack is a fixed bundle of diamonds at a JPY price.
 * Used by the checkout route and the rewards page UI.
 */

export type DiamondPack = {
  id: string
  diamonds: number
  priceJpy: number
}

export const DIAMOND_PACKS: DiamondPack[] = [
  { id: 'pack_50', diamonds: 50, priceJpy: 500 },
  { id: 'pack_120', diamonds: 120, priceJpy: 980 },
  { id: 'pack_300', diamonds: 300, priceJpy: 1980 },
]

export function getDiamondPack(packId: string): DiamondPack | undefined {
  return DIAMOND_PACKS.find((p) => p.id === packId)
}
