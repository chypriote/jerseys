/**
 * Public interface of the Catalog module: the one test seam.
 * Types only. Domain names follow GLOSSARY.md.
 */

export interface Store {
	id: number;
	name: string;
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
