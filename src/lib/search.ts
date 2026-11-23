/** True when every word of `query` is found in one of the `fields`, ignoring case. */
export function matchesSearch(query: string, ...fields: string[]): boolean {
	const text = fields.join(' ').toLowerCase();
	return query
		.toLowerCase()
		.split(/\s+/)
		.every((word) => text.includes(word));
}
