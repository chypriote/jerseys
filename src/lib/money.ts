/** "12,50" or "12.5" -> 1250. Null when it is not a price. */
export function eurosToCents(text: string): number | null {
	const cleaned = text.trim().replace(',', '.');
	if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
	return Math.round(Number(cleaned) * 100);
}

/** 1250 -> "12.50", the value of a `type="number"` input. */
export function centsToEuros(cents: number): string {
	return (cents / 100).toFixed(2);
}
