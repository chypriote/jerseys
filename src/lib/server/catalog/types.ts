/**
 * Public interface of the Catalog module: the one test seam.
 * Types only. Domain names follow GLOSSARY.md.
 */

export interface Store {
	id: number;
	name: string;
}

export type Continent = 'europe' | 'asia-oceania' | 'americas' | 'africa';
export type SeasonFormat = 'split' | 'calendar';

export interface League {
	id: number;
	name: string;
	seasonFormat: SeasonFormat;
}

/** A Country with its one League. */
export interface Country {
	id: number;
	name: string;
	continent: Continent;
	league: League;
}

/** What the Owner types for a Country and its League. */
export interface CountryInput {
	name: string;
	continent: Continent;
	leagueName: string;
	seasonFormat: SeasonFormat;
}

// --- Owner login -------------------------------------------------------------

export type LoginResult = { ok: true; token: string } | { ok: false; error: 'wrong-password' };

/**
 * Every rule and every D1 and R2 access lives behind this interface.
 * Write operations take the Owner token and fail with `UnauthorizedError` if it is invalid.
 */
export interface Catalog {
	// Reads (Viewer and Owner)
	listStores(): Promise<Store[]>;
	listCountries(): Promise<Country[]>;

	// Countries (Owner). A Country and its League are written together.
	// A name another Country has (any case) is refused.
	addCountry(token: string, input: CountryInput): Promise<Country>;
	editCountry(token: string, input: CountryInput & { id: number }): Promise<Country>;

	// Stores (Owner). A name another Store has (any case) is refused.
	addStore(token: string, name: string): Promise<Store>;
	renameStore(token: string, id: number, name: string): Promise<Store>;

	// Owner login
	login(password: string): Promise<LoginResult>;
	verifyToken(token: string): Promise<boolean>;
}

/** Thrown by every Owner-only operation when the token is missing or invalid. */
export interface UnauthorizedError extends Error {
	name: 'UnauthorizedError';
}
