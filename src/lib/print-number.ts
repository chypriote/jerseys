/** The shirt number of a Print: its trailing digits ("NICOLAS 4" gives "4"). */
export function printNumber(print: string | null | undefined): string | null {
	return print?.match(/(\d+)\s*$/)?.[1] ?? null;
}
