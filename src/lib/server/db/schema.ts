import { sql } from 'drizzle-orm';
import { check, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

const VERSIONS = ['fan', 'player', 'tracksuit'] as const;

export const leagues = sqliteTable('league', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	/** Split: 2023-24. Calendar: 2024. */
	seasonFormat: text('season_format', { enum: ['split', 'calendar'] }).notNull()
});

export const countries = sqliteTable('country', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique(),
	continent: text('continent', {
		enum: ['europe', 'asia-oceania', 'americas', 'africa']
	}).notNull(),
	/** One League per Country. */
	leagueId: integer('league_id')
		.notNull()
		.unique()
		.references(() => leagues.id)
});

export const teams = sqliteTable(
	'team',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		name: text('name').notNull().unique(),
		kind: text('kind', { enum: ['club', 'national'] }).notNull(),
		/** A Club's League is its Country's League. */
		countryId: integer('country_id')
			.notNull()
			.references(() => countries.id)
	},
	(t) => [
		uniqueIndex('team_national_country_unique')
			.on(t.countryId)
			.where(sql`${t.kind} = 'national'`)
	]
);

export const kits = sqliteTable(
	'kit',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		teamId: integer('team_id')
			.notNull()
			.references(() => teams.id),
		seasonStartYear: integer('season_start_year').notNull(),
		/** Set for a Split Season only. */
		seasonEndYear: integer('season_end_year'),
		kitType: text('kit_type', {
			enum: ['home', 'away', 'third', 'fourth', 'cup', 'special']
		}).notNull(),
		/** Main Picture key in R2. */
		mainPictureKey: text('main_picture_key'),
		/** Bumped when the Main Picture changes, so that its cached URL changes too. */
		mainPictureVersion: integer('main_picture_version').notNull().default(0),
		/** True once the Owner picked, uploaded or pasted the Main Picture: a lookup keeps it. */
		mainPictureChosen: integer('main_picture_chosen', { mode: 'boolean' }).notNull().default(false)
	},
	// A Team's Seasons all follow one Season Format, so the start year names the Season.
	(t) => [uniqueIndex('kit_team_season_type_unique').on(t.teamId, t.seasonStartYear, t.kitType)]
);

/** Extra Pictures of a Kit, beyond its Main Picture. */
export const pictures = sqliteTable('picture', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	kitId: integer('kit_id')
		.notNull()
		.references(() => kits.id),
	/** R2 key. */
	key: text('key').notNull(),
	position: integer('position').notNull()
});

export const stores = sqliteTable('store', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique()
});

/** Dates are text: `YYYY` or `YYYY-MM-DD`. */
export const jerseys = sqliteTable('jersey', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	kitId: integer('kit_id')
		.notNull()
		.references(() => kits.id),
	version: text('version', { enum: VERSIONS }).notNull(),
	size: text('size', { enum: ['S', 'M', 'L'] }),
	fit: text('fit', { enum: ['too-small', 'good', 'too-big'] }),
	print: text('print'),
	acquisitionKind: text('acquisition_kind', { enum: ['purchase', 'gift'] }).notNull(),
	/** The Bought date for a Purchase. */
	acquisitionDate: text('acquisition_date').notNull(),
	/** Purchase only. */
	sentDate: text('sent_date'),
	/** Purchase only. */
	receivedDate: text('received_date'),
	/** Purchase only. */
	storeId: integer('store_id').references(() => stores.id),
	/** Purchase only, euro cents. Null for an unknown price. */
	priceCents: integer('price_cents'),
	/** Gift only, optional. */
	giver: text('giver')
});

export const wishlistItems = sqliteTable(
	'wishlist_item',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		/** One Wishlist Item per Kit. */
		kitId: integer('kit_id')
			.notNull()
			.unique()
			.references(() => kits.id),
		version: text('version', { enum: VERSIONS }),
		desire: integer('desire').notNull()
	},
	(t) => [check('wishlist_item_desire_range', sql`${t.desire} BETWEEN 1 AND 5`)]
);
