/** "0 jerseys", "1 jersey", "3 jerseys". */
export const jerseyCount = (count: number | undefined) =>
	`${count ?? 0} ${count === 1 ? 'jersey' : 'jerseys'}`;
