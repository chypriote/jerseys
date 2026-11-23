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

// --- Kit Main Pictures ---------------------------------------------------------------

export type KitType = 'home' | 'away' | 'third' | 'fourth' | 'cup' | 'special';

/** A Kit as the admin lists it. */
export interface KitSummary {
	id: number;
	teamName: string;
	/** Formatted: "2023-24" (Split) or "2024" (Calendar). */
	season: string;
	kitType: KitType;
}

export interface MainPictureImage {
	body: ReadableStream;
	contentType: string;
}

export interface UploadMainPictureInput {
	kitId: number;
	body: ArrayBuffer;
	contentType: string;
}

// --- Collection --------------------------------------------------------------

export type Version = 'fan' | 'player' | 'tracksuit';
export type Size = 'S' | 'M' | 'L';
export type Fit = 'too-small' | 'good' | 'too-big';
export type TeamKind = 'club' | 'national';

/** Dates are as stored: `YYYY` or `YYYY-MM-DD`. A null price or Store is unknown. */
export type Acquisition =
	| {
			kind: 'purchase';
			store: Store | null;
			priceCents: number | null;
			bought: string;
			sent: string | null;
			received: string | null;
	  }
	| { kind: 'gift'; date: string; giver: string | null };

/** A Kit with its Team and the Team's Country (a Club's League is its Country's League). */
export interface KitView {
	id: number;
	/** Formatted: "2023-24" (Split) or "2024" (Calendar). */
	season: string;
	kitType: KitType;
	mainPictureKey: string | null;
	mainPictureVersion: number;
	team: {
		id: number;
		name: string;
		kind: TeamKind;
		country: { id: number; name: string; continent: Continent };
	};
}

export interface CollectionJersey {
	id: number;
	version: Version;
	size: Size | null;
	fit: Fit | null;
	print: string | null;
	kit: KitView;
	acquisition: Acquisition;
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
	/** Every Jersey with its Kit, Team, Country and Acquisition, newest Acquisition first. */
	listCollection(): Promise<CollectionJersey[]>;
	/** The Main Picture image of a Kit, or null when it has none. */
	getMainPicture(kitId: number): Promise<MainPictureImage | null>;

	// Countries (Owner). A Country and its League are written together.
	// A name another Country has (any case) is refused.
	addCountry(token: string, input: CountryInput): Promise<Country>;
	editCountry(token: string, input: CountryInput & { id: number }): Promise<Country>;

	// Stores (Owner). A name another Store has (any case) is refused.
	addStore(token: string, name: string): Promise<Store>;
	renameStore(token: string, id: number, name: string): Promise<Store>;

	// Kit Main Pictures (Owner). A Main Picture set here is marked Owner-chosen and gets a new version.
	/** Kits with no Main Picture, by Team, then Season, then Kit Type. */
	listKitsWithoutMainPicture(token: string): Promise<KitSummary[]>;
	/** Uses an uploaded JPEG, PNG or WebP image (under 2 MB) as the Main Picture of the Kit. */
	uploadMainPicture(token: string, input: UploadMainPictureInput): Promise<void>;
	/** Fetches an image from an http(s) address (same checks as an upload) and uses it as the Main Picture. */
	uploadMainPictureFromUrl(token: string, input: { kitId: number; url: string }): Promise<void>;

	// Owner login
	login(password: string): Promise<LoginResult>;
	verifyToken(token: string): Promise<boolean>;
}

/** Thrown by every Owner-only operation when the token is missing or invalid. */
export interface UnauthorizedError extends Error {
	name: 'UnauthorizedError';
}
