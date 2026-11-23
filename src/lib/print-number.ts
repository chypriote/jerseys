/** The name of a Print: everything before its number ("NICOLAS 4" gives "NICOLAS"). */
export function printName(print: string | null | undefined): string | null {
	return print?.replace(/\s*\d+\s*$/, '').trim() || null;
}

/** The shirt number of a Print: its trailing digits ("NICOLAS 4" gives "4"). */
export function printNumber(print: string | null | undefined): string | null {
	return print?.match(/(\d+)\s*$/)?.[1] ?? null;
}
