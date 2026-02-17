/**
 * Get price from tiered pricing based on quantity.
 * @param {Array<{min_qty: number, max_qty: number|null, price: number}>} tiers
 * @param {number} quantity
 * @returns {number}
 */
export function getTieredPrice(tiers, quantity) {
  if (!tiers || tiers.length === 0) return 0;
  for (const tier of tiers) {
    if (quantity >= tier.min_qty && (tier.max_qty === null || quantity <= tier.max_qty)) {
      return tier.price;
    }
  }
  return 0;
}

/**
 * Calculate total price based on pricing rules and user selection.
 * @param {Array} rules - pricing_rules from Supabase
 * @param {{categoryId: number, optionIds: number[], quantity: number}} selection
 * @returns {{unitPrice: number, total: number}}
 */
export function calculatePrice(rules, selection) {
  let unitPrice = 0;

  // Category base price
  const categoryRule = rules.find(
    (r) => r.category_id === selection.categoryId && r.option_id === null
  );
  if (categoryRule) {
    if (categoryRule.price_type === 'tiered' && categoryRule.tiers) {
      unitPrice += getTieredPrice(categoryRule.tiers, selection.quantity);
    } else {
      unitPrice += Number(categoryRule.base_price);
    }
  }

  // Option prices
  for (const optionId of selection.optionIds) {
    const rule = rules.find((r) => r.option_id === optionId);
    if (rule) {
      if (rule.price_type === 'tiered' && rule.tiers) {
        unitPrice += getTieredPrice(rule.tiers, selection.quantity);
      } else {
        unitPrice += Number(rule.base_price);
      }
    }
  }

  return {
    unitPrice,
    total: unitPrice * selection.quantity,
  };
}
