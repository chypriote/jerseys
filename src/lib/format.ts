const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

/** 160420 -> "1 604,20 €" */
export function formatCents(cents: number): string {
	return euros.format(cents / 100);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A date as stored: "2024" stays "2024", "2024-05-12" -> "12 May 2024". */
export function formatDate(stored: string): string {
	const [year, month, day] = stored.split('-');
	if (!month || !day) return stored;
	return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
}
