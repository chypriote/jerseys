/**
 * Public interface of the Catalog module: the one test seam.
 * Types only. Domain names follow GLOSSARY.md.
 */

export interface Store {
	id: number;
	name: string;
}

// --- Kit Covers ---------------------------------------------------------------

export type KitType = 'home' | 'away' | 'third' | 'fourth' | 'cup' | 'special';

/** A Kit as the admin lists it. */
export interface KitSummary {
	id: number;
	teamName: string;
	/** Formatted: "2023-24" (Split) or "2024" (Calendar). */
	season: string;
	kitType: KitType;
}

export interface CoverImage {
	body: ReadableStream;
	contentType: string;
}

export interface UploadCoverInput {
	kitId: number;
	body: ArrayBuffer;
	contentType: string;
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
	/** The Cover image of a Kit, or null when it has none. */
	getCover(kitId: number): Promise<CoverImage | null>;

	// Stores (Owner). A name another Store has (any case) is refused.
	addStore(token: string, name: string): Promise<Store>;
	renameStore(token: string, id: number, name: string): Promise<Store>;

	// Kit Covers (Owner). A Cover set here is marked Owner-chosen and gets a new version.
	/** Kits with no Cover, by Team, then Season, then Kit Type. */
	listKitsWithoutCover(token: string): Promise<KitSummary[]>;
	/** Uses an uploaded JPEG, PNG or WebP image (under 2 MB) as the Cover of the Kit. */
	uploadCover(token: string, input: UploadCoverInput): Promise<void>;
	/** Fetches an image from an http(s) address (same checks as an upload) and uses it as the Cover. */
	uploadCoverFromUrl(token: string, input: { kitId: number; url: string }): Promise<void>;

	// Owner login
	login(password: string): Promise<LoginResult>;
	verifyToken(token: string): Promise<boolean>;
}

/** Thrown by every Owner-only operation when the token is missing or invalid. */
export interface UnauthorizedError extends Error {
	name: 'UnauthorizedError';
}
