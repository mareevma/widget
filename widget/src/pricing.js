/**
 * Find quantity multiplier from tiers.
 * @param {Array<{min_qty: number, max_qty: number|null, multiplier: number}>} tiers
 * @param {number} quantity
 * @returns {number}
 */
export function getMultiplier(tiers, quantity) {
  if (!tiers || tiers.length === 0) return 1;
  for (const tier of tiers) {
    if (quantity >= tier.min_qty && (tier.max_qty === null || quantity <= tier.max_qty)) {
      return Number(tier.multiplier);
    }
  }
  return 1;
}

/**
 * Calculate price using v2 formula:
 *   subtotal = basePrice + frontPrintPrice + backPrintPrice
 *   unitPrice = subtotal × multiplier(qty)
 *   total = unitPrice × quantity
 *
 * @param {{basePrice: number, frontPrintPrice: number, backPrintPrice: number, quantity: number, tiers: Array}} params
 * @returns {{unitPrice: number, total: number, multiplier: number, subtotal: number}}
 */
export function calculatePrice({ basePrice, frontPrintPrice, backPrintPrice, quantity, tiers }) {
  const subtotal = basePrice + frontPrintPrice + backPrintPrice;
  const multiplier = getMultiplier(tiers, quantity);
  const unitPrice = Math.round(subtotal * multiplier);
  const total = unitPrice * quantity;
  return { unitPrice, total, multiplier, subtotal };
}
