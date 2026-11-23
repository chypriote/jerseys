import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCatalog } from './index';
import type { ImportRows } from './types';
import searchLyon from './fixtures/thesportsdb/searchteams-lyon.json';
import searchJapan from './fixtures/thesportsdb/searchteams-japan.json';
import searchNone from './fixtures/thesportsdb/searchteams-none.json';
import equipmentLyon from './fixtures/thesportsdb/lookupequipment-lyon.json';
import equipmentJapan from './fixtures/thesportsdb/lookupequipment-japan.json';
import equipmentNone from './fixtures/thesportsdb/lookupequipment-none.json';

describe('Catalog', () => {
	it('has the Official Store from day one', async () => {
		const catalog = createCatalog(env);
		expect(await catalog.listStores()).toEqual([{ id: 1, name: 'Official Store' }]);
	});
});

function base64url(bytes: Uint8Array | string) {
	const raw = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
	return btoa(String.fromCharCode(...raw))
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replaceAll('=', '');
}

async function signJwt(payload: object, secret: string) {
	const head = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
	const body = base64url(JSON.stringify(payload));
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${head}.${body}`));
	return `${head}.${body}.${base64url(new Uint8Array(sig))}`;
}

describe('Owner login', () => {
	const catalog = createCatalog(env);

	it('refuses a wrong password', async () => {
		expect(await catalog.login('nope')).toEqual({ ok: false, error: 'wrong-password' });
	});

	it('issues a token for the right password that verifies', async () => {
		const result = await catalog.login('test-password');
		expect(result.ok).toBe(true);
		if (result.ok) expect(await catalog.verifyToken(result.token)).toBe(true);
	});

	it('refuses an empty password', async () => {
		expect(await catalog.login('')).toEqual({ ok: false, error: 'wrong-password' });
	});

	it('issues an HS256 token that lasts 90 days', async () => {
		const result = await catalog.login('test-password');
		if (!result.ok) throw new Error('login failed');
		const [head, body] = result.token
			.split('.')
			.slice(0, 2)
			.map((part) => JSON.parse(atob(part.replaceAll('-', '+').replaceAll('_', '/'))));
		expect(head.alg).toBe('HS256');
		expect(body.exp - body.iat).toBe(60 * 60 * 24 * 90);
	});

	it('rejects garbage, tampered, wrongly signed and expired tokens', async () => {
		const result = await catalog.login('test-password');
		if (!result.ok) throw new Error('login failed');
		const exp = Math.floor(Date.now() / 1000);
		expect(await catalog.verifyToken('')).toBe(false);
		expect(await catalog.verifyToken('a.b.c')).toBe(false);
		expect(await catalog.verifyToken(result.token.slice(0, -2) + 'xx')).toBe(false);
		expect(await catalog.verifyToken(await signJwt({ exp: exp + 3600 }, 'other-secret'))).toBe(
			false
		);
		expect(await catalog.verifyToken(await signJwt({ exp: exp - 10 }, 'test-jwt-secret'))).toBe(
			false
		);
		expect(await catalog.verifyToken(await signJwt({ exp: exp + 3600 }, 'test-jwt-secret'))).toBe(
			true
		);
	});

	it('refuses every write without a valid token', async () => {
		const bad = 'not-a-token';
		const country = {
			name: 'Wales',
			continent: 'europe',
			leagueName: 'Cymru Premier',
			seasonFormat: 'split'
		} as const;
		const calls = [
			() => catalog.addStore(bad, 'Shop'),
			() => catalog.renameStore(bad, 1, 'Shop'),
			() => catalog.addCountry(bad, country),
			() => catalog.editCountry(bad, { ...country, id: 1 }),
			() => catalog.listKitsWithoutMainPicture(bad),
			() =>
				catalog.uploadMainPicture(bad, {
					kitId: 1,
					body: new ArrayBuffer(1),
					contentType: 'image/png'
				}),
			() =>
				catalog.uploadMainPictureFromUrl(bad, { kitId: 1, url: 'https://images.example/a.png' }),
			() => catalog.listPictureCandidates(bad, 1),
			() => catalog.searchTeams(bad, 'Lyon'),
			() => catalog.setTeamSource(bad, { teamId: 1, sourceTeamId: '133713' }),
			() =>
				catalog.pickMainPicture(bad, { kitId: 1, candidateId: 'https://r2.thesportsdb.com/a.png' }),
			() => catalog.lookupNext(bad, { size: 1 }),
			() =>
				catalog.addJersey(bad, {
					team: { teamId: 1 },
					season: '2024',
					kitType: 'home',
					version: 'fan',
					size: null,
					fit: null,
					acquisition: { kind: 'gift', date: '2024' }
				}),
			() =>
				catalog.editJersey(bad, {
					id: 1,
					team: { teamId: 1 },
					season: '2024',
					kitType: 'home',
					version: 'fan',
					size: null,
					fit: null,
					acquisition: { kind: 'gift', date: '2024' }
				}),
			() =>
				catalog.addWishlistItem(bad, {
					team: { teamId: 1 },
					season: '2024',
					kitType: 'home',
					version: null
				}),
			() =>
				catalog.gotIt(bad, {
					wishlistItemId: 1,
					jersey: {
						version: 'fan',
						size: 'M',
						fit: 'good',
						acquisition: { kind: 'gift', date: '2024' }
					}
				}),
			() => catalog.drop(bad, 1),
			() =>
				catalog.addPicture(bad, { kitId: 1, body: new ArrayBuffer(1), contentType: 'image/png' }),
			() => catalog.editTeam(bad, { teamId: 1, name: 'Lyon', kind: 'club', countryId: 1 }),
			() => catalog.editKit(bad, { kitId: 1, season: '2024', kitType: 'home' }),
			() => catalog.importRows(bad, { countries: [], jerseys: [], wishlist: [] })
		];
		for (const call of calls) {
			await expect(call()).rejects.toMatchObject({ name: 'UnauthorizedError' });
		}
	});
});

describe('Stores', () => {
	const catalog = createCatalog(env);
	let token: string;

	beforeEach(async () => {
		await env.DB.prepare("DELETE FROM store WHERE name != 'Official Store'").run();
		const result = await catalog.login('test-password');
		if (!result.ok) throw new Error('login failed');
		token = result.token;
	});

	it('adds Stores, trimmed, and lists them by name', async () => {
		const fnac = await catalog.addStore(token, '  Classic Football Shirts ');
		expect(fnac.name).toBe('Classic Football Shirts');
		await catalog.addStore(token, 'adidas');
		expect((await catalog.listStores()).map((s) => s.name)).toEqual([
			'adidas',
			'Classic Football Shirts',
			'Official Store'
		]);
		expect(await catalog.listStores()).toContainEqual(fnac);
	});

	it('refuses a Store name that exists, in any case, with a readable error', async () => {
		await catalog.addStore(token, 'Kitbag');
		await expect(catalog.addStore(token, ' kitbag ')).rejects.toThrow(
			'A store named “kitbag” already exists'
		);
		await expect(catalog.addStore(token, 'official store')).rejects.toThrow(
			'A store named “official store” already exists'
		);
		expect((await catalog.listStores()).map((s) => s.name)).toEqual(['Kitbag', 'Official Store']);
	});

	it('refuses an empty Store name', async () => {
		await expect(catalog.addStore(token, '   ')).rejects.toThrow('Store name is required');
	});

	it('renames a Store, and lets a rename change only the case', async () => {
		const shop = await catalog.addStore(token, 'kitbag');
		expect(await catalog.renameStore(token, shop.id, ' Kitbag ')).toEqual({
			id: shop.id,
			name: 'Kitbag'
		});
		await catalog.renameStore(token, shop.id, 'Subside Sports');
		expect(await catalog.listStores()).toEqual([
			{ id: 1, name: 'Official Store' },
			{ id: shop.id, name: 'Subside Sports' }
		]);
	});

	it('refuses a rename to a name another Store has, or of an unknown Store', async () => {
		const shop = await catalog.addStore(token, 'Kitbag');
		await expect(catalog.renameStore(token, shop.id, 'Official store')).rejects.toThrow(
			'A store named “Official store” already exists'
		);
		await expect(catalog.renameStore(token, 9999, 'Elsewhere')).rejects.toThrow('Unknown store');
		expect((await catalog.listStores()).map((s) => s.name)).toEqual(['Kitbag', 'Official Store']);
	});
});

describe('Countries', () => {
	const catalog = createCatalog(env);
	let token: string;

	beforeEach(async () => {
		await env.DB.batch([
			env.DB.prepare('DELETE FROM country'),
			env.DB.prepare('DELETE FROM league')
		]);
		const result = await catalog.login('test-password');
		if (!result.ok) throw new Error('login failed');
		token = result.token;
	});

	it('adds a Country with its League, trimmed, and lists Countries by name', async () => {
		const france = await catalog.addCountry(token, {
			name: ' France ',
			continent: 'europe',
			leagueName: ' Ligue 1 ',
			seasonFormat: 'split'
		});
		expect(france).toMatchObject({
			name: 'France',
			continent: 'europe',
			league: { name: 'Ligue 1', seasonFormat: 'split' }
		});
		await catalog.addCountry(token, {
			name: 'Brazil',
			continent: 'americas',
			leagueName: 'Brasileirão',
			seasonFormat: 'calendar'
		});
		const listed = await catalog.listCountries();
		expect(listed.map((c) => c.name)).toEqual(['Brazil', 'France']);
		expect(listed).toContainEqual(france);
		expect(listed[0].league).toMatchObject({ name: 'Brasileirão', seasonFormat: 'calendar' });
	});

	it('refuses a Country name that exists, in any case, with a readable error', async () => {
		await catalog.addCountry(token, {
			name: 'Japan',
			continent: 'asia-oceania',
			leagueName: 'J1 League',
			seasonFormat: 'calendar'
		});
		await expect(
			catalog.addCountry(token, {
				name: ' japan ',
				continent: 'asia-oceania',
				leagueName: 'Other League',
				seasonFormat: 'split'
			})
		).rejects.toThrow('A country named “japan” already exists');
		const listed = await catalog.listCountries();
		expect(listed.map((c) => c.league.name)).toEqual(['J1 League']);
	});

	it('edits a Country, its Continent and its League, and lets an edit change only the case', async () => {
		const added = await catalog.addCountry(token, {
			name: 'australia',
			continent: 'europe',
			leagueName: 'A League',
			seasonFormat: 'calendar'
		});
		const edited = await catalog.editCountry(token, {
			id: added.id,
			name: ' Australia ',
			continent: 'asia-oceania',
			leagueName: ' A-League Men ',
			seasonFormat: 'split'
		});
		expect(edited).toEqual({
			id: added.id,
			name: 'Australia',
			continent: 'asia-oceania',
			league: { id: added.league.id, name: 'A-League Men', seasonFormat: 'split' }
		});
		expect(await catalog.listCountries()).toEqual([edited]);
	});

	it('refuses an edit to a name another Country has, or of an unknown Country', async () => {
		const input = { continent: 'europe', leagueName: 'League', seasonFormat: 'split' } as const;
		await catalog.addCountry(token, { ...input, name: 'Spain' });
		const italy = await catalog.addCountry(token, { ...input, name: 'Italy' });
		await expect(
			catalog.editCountry(token, { ...input, id: italy.id, name: 'SPAIN' })
		).rejects.toThrow('A country named “SPAIN” already exists');
		await expect(catalog.editCountry(token, { ...input, id: 9999, name: 'Wales' })).rejects.toThrow(
			'Unknown country'
		);
		expect((await catalog.listCountries()).map((c) => c.name)).toEqual(['Italy', 'Spain']);
	});

	it('refuses an unknown Continent or Season Format, and empty names', async () => {
		const input = {
			name: 'Atlantis',
			continent: 'europe',
			leagueName: 'Deep League',
			seasonFormat: 'split'
		} as const;
		const bad = (extra: object) => ({ ...input, ...extra }) as never;
		await expect(catalog.addCountry(token, bad({ continent: 'antarctica' }))).rejects.toThrow(
			'Continent must be one of Europe, Asia & Oceania, Americas, Africa'
		);
		await expect(catalog.addCountry(token, bad({ seasonFormat: 'weekly' }))).rejects.toThrow(
			'Season Format must be Season or Calendar'
		);
		await expect(catalog.addCountry(token, bad({ name: ' ' }))).rejects.toThrow(
			'Country name is required'
		);
		await expect(catalog.addCountry(token, bad({ leagueName: '' }))).rejects.toThrow(
			'League name is required'
		);
		const spain = await catalog.addCountry(token, { ...input, name: 'Spain' });
		await expect(
			catalog.editCountry(token, bad({ id: spain.id, continent: 'oceania' }))
		).rejects.toThrow('Continent must be one of');
		expect(await catalog.listCountries()).toEqual([spain]);
	});
});

// --- Kit Main Pictures ---------------------------------------------------------------

/** No Kit create path exists yet: Kits are inserted straight into D1. */
async function insertKit(kit: {
	team: string;
	kind?: 'club' | 'national';
	start: number;
	end?: number;
	kitType: string;
	mainPictureKey?: string;
	country?: string;
	league?: string;
}) {
	const country = kit.country ?? `Country of ${kit.team}`;
	const league = kit.league ?? `League of ${kit.team}`;
	await env.DB.batch([
		env.DB.prepare(
			'INSERT OR IGNORE INTO league (id, name, season_format) VALUES ((SELECT id FROM league WHERE name = ?1), ?1, ?2)'
		).bind(league, kit.end ? 'split' : 'calendar'),
		env.DB.prepare(
			"INSERT OR IGNORE INTO country (name, continent, league_id) VALUES (?1, 'europe', (SELECT id FROM league WHERE name = ?2))"
		).bind(country, league),
		env.DB.prepare(
			'INSERT OR IGNORE INTO team (name, kind, country_id) VALUES (?1, ?2, (SELECT id FROM country WHERE name = ?3))'
		).bind(kit.team, kit.kind ?? 'club', country)
	]);
	const row = await env.DB.prepare(
		'INSERT INTO kit (team_id, season_start_year, season_end_year, kit_type, main_picture_key) VALUES ((SELECT id FROM team WHERE name = ?1), ?2, ?3, ?4, ?5) RETURNING id'
	)
		.bind(kit.team, kit.start, kit.end ?? null, kit.kitType, kit.mainPictureKey ?? null)
		.first<{ id: number }>();
	return row!.id;
}

/** The Main Picture fields of a Kit, read from D1: no Catalog read returns them yet. */
const mainPictureOf = (kitId: number) =>
	env.DB.prepare(
		'SELECT main_picture_key, main_picture_version, main_picture_chosen FROM kit WHERE id = ?'
	)
		.bind(kitId)
		.first<{
			main_picture_key: string | null;
			main_picture_version: number;
			main_picture_chosen: number;
		}>();

describe('Kit Main Pictures', () => {
	const catalog = createCatalog(env);
	let token: string;

	beforeEach(async () => {
		await env.DB.batch([
			env.DB.prepare('DELETE FROM wishlist_item'),
			env.DB.prepare('DELETE FROM jersey'),
			env.DB.prepare('DELETE FROM kit'),
			env.DB.prepare('DELETE FROM team'),
			env.DB.prepare('DELETE FROM country'),
			env.DB.prepare('DELETE FROM league')
		]);
		const listed = await env.COVERS.list();
		await Promise.all(listed.objects.map((o) => env.COVERS.delete(o.key)));
		const result = await catalog.login('test-password');
		if (!result.ok) throw new Error('login failed');
		token = result.token;
	});

	it('lists the Kits with no Main Picture by Team, then Season, with the Season formatted', async () => {
		const away = await insertKit({
			team: 'Olympique Lyonnais',
			start: 2023,
			end: 2024,
			kitType: 'away'
		});
		const home = await insertKit({
			team: 'Olympique Lyonnais',
			start: 1999,
			end: 2000,
			kitType: 'home'
		});
		const japan = await insertKit({
			team: 'Japan',
			kind: 'national',
			start: 2024,
			kitType: 'home'
		});
		await insertKit({
			team: 'Japan',
			kind: 'national',
			start: 2022,
			kitType: 'away',
			mainPictureKey: 'main-pictures/x'
		});
		expect(await catalog.listKitsWithoutMainPicture(token)).toEqual([
			{ id: japan, teamName: 'Japan', season: '2024', kitType: 'home' },
			{ id: home, teamName: 'Olympique Lyonnais', season: '1999-00', kitType: 'home' },
			{ id: away, teamName: 'Olympique Lyonnais', season: '2023-24', kitType: 'away' }
		]);
	});

	const image = (size: number) => new Uint8Array(size).fill(7).buffer;

	it('uploads a Main Picture to R2, marks it chosen, bumps its version and serves it', async () => {
		const kit = await insertKit({ team: 'Japan', kind: 'national', start: 2024, kitType: 'home' });
		expect(await catalog.getMainPicture(kit)).toBeNull();
		await catalog.uploadMainPicture(token, {
			kitId: kit,
			body: image(10),
			contentType: 'image/png'
		});
		expect(await mainPictureOf(kit)).toEqual({
			main_picture_key: `main-pictures/${kit}`,
			main_picture_version: 1,
			main_picture_chosen: 1
		});
		const picture = await catalog.getMainPicture(kit);
		expect(picture?.contentType).toBe('image/png');
		expect((await new Response(picture!.body).arrayBuffer()).byteLength).toBe(10);
		expect(await catalog.listKitsWithoutMainPicture(token)).toEqual([]);

		await catalog.uploadMainPicture(token, {
			kitId: kit,
			body: image(20),
			contentType: 'image/webp'
		});
		expect((await mainPictureOf(kit))?.main_picture_version).toBe(2);
		expect((await catalog.getMainPicture(kit))?.contentType).toBe('image/webp');
		expect(await catalog.getMainPicture(99999)).toBeNull();
	});

	it('refuses an upload of another type, of 2 MB or more, empty, or for an unknown Kit', async () => {
		const kit = await insertKit({ team: 'Japan', kind: 'national', start: 2024, kitType: 'home' });
		const upload = (over: object) =>
			catalog.uploadMainPicture(token, {
				kitId: kit,
				body: image(10),
				contentType: 'image/png',
				...over
			});
		await expect(upload({ contentType: 'image/svg+xml' })).rejects.toThrow(
			'Use a JPEG, PNG or WebP image'
		);
		await expect(upload({ body: image(2 * 1024 * 1024) })).rejects.toThrow(
			'The image must be under 2 MB'
		);
		await expect(upload({ body: image(0) })).rejects.toThrow('The image must be under 2 MB');
		await expect(upload({ kitId: 99999 })).rejects.toThrow('Unknown kit');
		expect(await mainPictureOf(kit)).toEqual({
			main_picture_key: null,
			main_picture_version: 0,
			main_picture_chosen: 0
		});
		await upload({ body: image(2 * 1024 * 1024 - 1), contentType: 'image/jpeg' });
		expect((await mainPictureOf(kit))?.main_picture_chosen).toBe(1);
	});

	describe('from an address', () => {
		let pulls: number;

		// Fake image host at the fetch boundary: no live calls in tests.
		beforeEach(() => {
			pulls = 0;
			vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
				const url = new URL(new Request(input as RequestInfo, init).url);
				if (url.host !== 'images.example') throw new Error(`Unexpected fetch to ${url.href}`);
				const png = { headers: { 'content-type': 'image/png' } };
				if (url.pathname === '/big.png') return new Response(new Uint8Array(2 * 1024 * 1024), png);
				if (url.pathname === '/endless.png') {
					return new Response(
						new ReadableStream({
							pull(controller) {
								pulls++;
								controller.enqueue(new Uint8Array(512 * 1024));
							}
						}),
						png
					);
				}
				if (url.pathname === '/page.html') {
					return new Response('<html>', { headers: { 'content-type': 'text/html' } });
				}
				if (url.pathname === '/missing.png') return new Response('no', { status: 404 });
				return new Response('url-bytes', { headers: { 'content-type': 'image/webp; charset=x' } });
			});
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		const paste = (kitId: number, url: string) =>
			catalog.uploadMainPictureFromUrl(token, { kitId, url });

		it('fetches the image and stores it as a chosen Main Picture with a new version', async () => {
			const kit = await insertKit({
				team: 'Japan',
				kind: 'national',
				start: 2024,
				kitType: 'home'
			});
			await paste(kit, 'https://images.example/kit.webp');
			expect(await mainPictureOf(kit)).toEqual({
				main_picture_key: `main-pictures/${kit}`,
				main_picture_version: 1,
				main_picture_chosen: 1
			});
			const picture = await catalog.getMainPicture(kit);
			expect(picture?.contentType).toBe('image/webp');
			expect(await new Response(picture!.body).text()).toBe('url-bytes');
		});

		it('refuses bad addresses, other types, images of 2 MB or more and failed fetches', async () => {
			const kit = await insertKit({
				team: 'Japan',
				kind: 'national',
				start: 2024,
				kitType: 'home'
			});
			await expect(paste(kit, 'nonsense')).rejects.toThrow('This is not a web address');
			await expect(paste(kit, 'ftp://images.example/a.png')).rejects.toThrow(
				'Use an http or https address'
			);
			await expect(paste(kit, 'https://images.example/page.html')).rejects.toThrow(
				'Use a JPEG, PNG or WebP image'
			);
			await expect(paste(kit, 'https://images.example/big.png')).rejects.toThrow(
				'The image must be under 2 MB'
			);
			await expect(paste(kit, 'https://images.example/endless.png')).rejects.toThrow(
				'The image must be under 2 MB'
			);
			expect(pulls).toBeLessThan(10);
			await expect(paste(kit, 'https://images.example/missing.png')).rejects.toThrow(
				'The address answered 404'
			);
			await expect(paste(99999, 'https://images.example/kit.webp')).rejects.toThrow('Unknown kit');
			expect(await mainPictureOf(kit)).toEqual({
				main_picture_key: null,
				main_picture_version: 0,
				main_picture_chosen: 0
			});
		});
	});
});

// --- Picture candidates from TheSportsDB ---------------------------------------------

/** A 1×1 PNG, as TheSportsDB serves kit pictures. */
const PNG = Uint8Array.from(
	atob(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
	),
	(c) => c.charCodeAt(0)
);

describe('Picture candidates', () => {
	const catalog = createCatalog(env, { lookupIntervalMs: 0 });
	let token: string;

	/** Fake TheSportsDB at the fetch boundary: saved answers keyed by search text and Team id. */
	let searches: Record<string, unknown>;
	let equipment: Record<string, unknown>;
	let calls: { url: URL; at: number }[];
	let failing: boolean;
	const sportsDbCalls = (file: string) => calls.filter((c) => c.url.pathname.endsWith(file));

	beforeEach(async () => {
		await env.DB.batch([
			env.DB.prepare('DELETE FROM wishlist_item'),
			env.DB.prepare('DELETE FROM jersey'),
			env.DB.prepare('DELETE FROM kit'),
			env.DB.prepare('DELETE FROM team'),
			env.DB.prepare('DELETE FROM country'),
			env.DB.prepare('DELETE FROM league')
		]);
		const listed = await env.COVERS.list();
		await Promise.all(listed.objects.map((o) => env.COVERS.delete(o.key)));
		const result = await catalog.login('test-password');
		if (!result.ok) throw new Error('login failed');
		token = result.token;

		searches = { 'Olympique Lyonnais': searchLyon, Lyon: searchLyon, Japan: searchJapan };
		equipment = { '133713': equipmentLyon, '134502': equipmentJapan };
		calls = [];
		failing = false;
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
			const url = new URL(new Request(input as RequestInfo, init).url);
			calls.push({ url, at: Date.now() });
			if (url.host === 'www.thesportsdb.com') {
				if (failing) return new Response('Too Many Requests', { status: 429 });
				if (url.pathname === '/api/v1/json/test-sportsdb-key/searchteams.php') {
					return Response.json(searches[url.searchParams.get('t') ?? ''] ?? searchNone);
				}
				if (url.pathname === '/api/v1/json/test-sportsdb-key/lookupequipment.php') {
					return Response.json(equipment[url.searchParams.get('id') ?? ''] ?? equipmentNone);
				}
			}
			if (url.host === 'r2.thesportsdb.com') {
				const png = { headers: { 'content-type': 'image/png' } };
				if (url.pathname.endsWith('/big.png')) {
					return new Response(new Uint8Array(2 * 1024 * 1024), png);
				}
				if (url.pathname.endsWith('/page.png')) {
					return new Response('<html>', { headers: { 'content-type': 'text/html' } });
				}
				if (url.pathname.endsWith('/missing.png')) return new Response('', { status: 404 });
				return new Response(PNG, png);
			}
			throw new Error(`Unexpected fetch to ${url.href}`);
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	const lyon = (over: { start?: number; kitType?: string } = {}) =>
		insertKit({
			team: 'Olympique Lyonnais',
			start: over.start ?? 2023,
			end: (over.start ?? 2023) + 1,
			kitType: over.kitType ?? 'home',
			country: 'France',
			league: 'Ligue 1'
		});

	const equipmentUrl = (name: string) =>
		`https://r2.thesportsdb.com/images/media/team/equipment/${name}.png`;

	it('finds the TheSportsDB Team, stores it, and lists the Kit Season first', async () => {
		const kit = await lyon();
		const listing = await catalog.listPictureCandidates(token, kit);
		expect(listing.sourceTeamId).toBe('133713');
		expect(listing.candidates.map((c) => [c.season, c.kitType])).toEqual([
			['2023-24', 'home'],
			['2023-24', 'away'],
			['2023-24', 'third'],
			['2024-25', 'home'],
			['2022-23', 'home'],
			['2022-23', 'away']
		]);
		expect(listing.candidates[0]).toEqual({
			id: equipmentUrl('2tpd4i1689433133'),
			imageUrl: equipmentUrl('2tpd4i1689433133'),
			season: '2023-24',
			kitType: 'home'
		});
		expect(sportsDbCalls('searchteams.php')[0].url.searchParams.get('t')).toBe(
			'Olympique Lyonnais'
		);
	});

	it('skips the Team search once the TheSportsDB Team is stored', async () => {
		const kit = await lyon();
		await catalog.listPictureCandidates(token, kit);
		const other = await lyon({ start: 2022 });
		const listing = await catalog.listPictureCandidates(token, other);
		expect(sportsDbCalls('searchteams.php')).toHaveLength(1);
		expect(sportsDbCalls('lookupequipment.php')).toHaveLength(2);
		expect(listing.candidates.slice(0, 2).map((c) => c.season)).toEqual(['2022-23', '2022-23']);
	});

	it('matches a Calendar Season to a one-year TheSportsDB Season', async () => {
		const kit = await insertKit({
			team: 'Japan',
			kind: 'national',
			start: 2024,
			kitType: 'away',
			country: 'Japan'
		});
		const listing = await catalog.listPictureCandidates(token, kit);
		expect(listing.sourceTeamId).toBe('134502');
		expect(listing.candidates.map((c) => [c.season, c.kitType])).toEqual([
			['2024', 'home'],
			['2024', 'away'],
			['2022', 'home'],
			['2022', 'away']
		]);
	});

	describe('Team match', () => {
		const hit = (over: object) => ({
			idTeam: '1',
			strTeam: 'Olympique Lyonnais',
			strTeamAlternate: '',
			strSport: 'Soccer',
			strLeague: 'French Ligue 1',
			strCountry: 'Elsewhere',
			...over
		});
		let start = 2000;
		/** The TheSportsDB Team found for a new Lyon Kit when the search answers `hits`. */
		const matched = async (hits: object[]) => {
			searches['Olympique Lyonnais'] = { teams: hits };
			await env.DB.prepare('UPDATE team SET source_team_id = NULL').run();
			const kit = await lyon({ start: start++ });
			return (await catalog.listPictureCandidates(token, kit)).sourceTeamId;
		};

		it('keeps Soccer hits only', async () => {
			expect(await matched([hit({ idTeam: '9', strSport: 'Rugby', strCountry: 'France' })])).toBe(
				null
			);
			expect(sportsDbCalls('lookupequipment.php')).toHaveLength(0);
		});

		it('compares names without case, accents or outer spaces, on the name and alternate names', async () => {
			expect(await matched([hit({ idTeam: '2', strTeam: 'OLYMPIQUE LYONNAIS ' })])).toBe('2');
			expect(
				await matched([
					hit({ idTeam: '3', strTeam: 'OL', strTeamAlternate: 'Lyon, Olympique Lyonnaìs' })
				])
			).toBe('3');
		});

		it('prefers the hit whose Country or League matches', async () => {
			const hits = [hit({ idTeam: '4' }), hit({ idTeam: '5', strCountry: 'france' })];
			expect(await matched(hits)).toBe('5');
			expect(
				await matched([hit({ idTeam: '6' }), hit({ idTeam: '7', strLeague: 'Ligue 1' })])
			).toBe('7');
		});

		it('gives no match when no hit agrees', async () => {
			expect(await matched([hit({ strTeam: 'Lyon Duchère' })])).toBe(null);
			expect(await matched([hit({ idTeam: '4' }), hit({ idTeam: '5' })])).toBe(null);
			expect(await matched([])).toBe(null);
		});

		it('matches a National Team to a national-team hit only', async () => {
			const japan = (over: object) => hit({ strTeam: 'Japan', strCountry: 'Japan', ...over });
			const nationalKit = () =>
				insertKit({
					team: 'Japan',
					kind: 'national',
					start: start++,
					kitType: 'home',
					country: 'Japan'
				});
			searches.Japan = { teams: [japan({ idTeam: '8', strLeague: 'Japanese J1 League' })] };
			expect((await catalog.listPictureCandidates(token, await nationalKit())).sourceTeamId).toBe(
				null
			);
			searches.Japan = {
				teams: [
					japan({ idTeam: '8', strLeague: 'Japanese J1 League' }),
					japan({ idTeam: '10', strLeague: 'International Friendlies' })
				]
			};
			expect((await catalog.listPictureCandidates(token, await nationalKit())).sourceTeamId).toBe(
				'10'
			);
		});
	});

	it('searches Soccer Teams by typed text, with the key in the path', async () => {
		expect(await catalog.searchTeams(token, '  Lyon ')).toEqual([
			{ id: '133713', name: 'Lyon', country: 'France', league: 'French Ligue 1' },
			{ id: '140152', name: 'Lyon Women', country: 'France', league: 'French Division 1 Feminine' }
		]);
		expect(sportsDbCalls('searchteams.php')[0].url.href).toBe(
			'https://www.thesportsdb.com/api/v1/json/test-sportsdb-key/searchteams.php?t=Lyon'
		);
		expect(await catalog.searchTeams(token, 'Nobody FC')).toEqual([]);
		expect(await catalog.searchTeams(token, '   ')).toEqual([]);
		expect(sportsDbCalls('searchteams.php')).toHaveLength(2);
	});

	it('replaces the TheSportsDB Team of a Team, and the candidates follow it', async () => {
		const kit = await lyon();
		const { teamId } = await catalog.listPictureCandidates(token, kit);
		await catalog.setTeamSource(token, { teamId, sourceTeamId: '134502' });
		const listing = await catalog.listPictureCandidates(token, kit);
		expect(listing.sourceTeamId).toBe('134502');
		expect(listing.candidates.map((c) => c.season)).toEqual(['2024', '2024', '2022', '2022']);
		expect(sportsDbCalls('searchteams.php')).toHaveLength(1);
		await expect(
			catalog.setTeamSource(token, { teamId: 99999, sourceTeamId: '1' })
		).rejects.toThrow('Unknown team');
		await expect(catalog.setTeamSource(token, { teamId, sourceTeamId: ' ' })).rejects.toThrow(
			/^Choose a TheSportsDB team$/
		);
	});

	it('picks a candidate: its image goes to R2 as a chosen Main Picture with a new version', async () => {
		const kit = await lyon();
		const [first] = (await catalog.listPictureCandidates(token, kit)).candidates;
		await catalog.pickMainPicture(token, { kitId: kit, candidateId: first.id });
		expect(await mainPictureOf(kit)).toEqual({
			main_picture_key: `main-pictures/${kit}`,
			main_picture_version: 1,
			main_picture_chosen: 1
		});
		const picture = await catalog.getMainPicture(kit);
		expect(picture?.contentType).toBe('image/png');
		expect(new Uint8Array(await new Response(picture!.body).arrayBuffer())).toEqual(PNG);
		await catalog.pickMainPicture(token, { kitId: kit, candidateId: first.id });
		expect((await mainPictureOf(kit))?.main_picture_version).toBe(2);
	});

	it('refuses a candidate from another host, of another type, of 2 MB or more, or missing', async () => {
		const kit = await lyon();
		const pick = (candidateId: string, kitId = kit) =>
			catalog.pickMainPicture(token, { kitId, candidateId });
		await expect(pick('https://images.example/a.png')).rejects.toThrow('Unknown candidate');
		await expect(pick('http://r2.thesportsdb.com/a.png')).rejects.toThrow('Unknown candidate');
		await expect(pick('nonsense')).rejects.toThrow('Unknown candidate');
		await expect(pick(equipmentUrl('page'))).rejects.toThrow('Use a JPEG, PNG or WebP image');
		await expect(pick(equipmentUrl('big'))).rejects.toThrow('The image must be under 2 MB');
		await expect(pick(equipmentUrl('missing'))).rejects.toThrow('TheSportsDB answered 404');
		await expect(pick(equipmentUrl('ok'), 99999)).rejects.toThrow('Unknown kit');
		expect(await mainPictureOf(kit)).toEqual({
			main_picture_key: null,
			main_picture_version: 0,
			main_picture_chosen: 0
		});
	});

	it('reports a TheSportsDB error and stores no Team', async () => {
		const kit = await lyon();
		failing = true;
		await expect(catalog.listPictureCandidates(token, kit)).rejects.toThrow(
			'TheSportsDB answered 429'
		);
		await expect(catalog.listPictureCandidates(token, 99999)).rejects.toThrow('Unknown kit');
		failing = false;
		expect((await catalog.listPictureCandidates(token, kit)).sourceTeamId).toBe('133713');
	});

	it('sends at most one TheSportsDB request per interval, images included', async () => {
		const slow = createCatalog(env, { lookupIntervalMs: 60 });
		const kit = await lyon();
		const [first] = (await slow.listPictureCandidates(token, kit)).candidates;
		await slow.pickMainPicture(token, { kitId: kit, candidateId: first.id });
		const times = calls.map((c) => c.at);
		expect(times).toHaveLength(3);
		expect(times[1] - times[0]).toBeGreaterThanOrEqual(55);
		expect(times[2] - times[1]).toBeGreaterThanOrEqual(55);
	});

	it('waits for the TheSportsDB interval for a pasted TheSportsDB image address', async () => {
		const slow = createCatalog(env, { lookupIntervalMs: 60 });
		const kit = await lyon();
		await slow.listPictureCandidates(token, kit);
		await slow.uploadMainPictureFromUrl(token, { kitId: kit, url: equipmentUrl('pasted') });
		const times = calls.map((c) => c.at);
		expect(times).toHaveLength(3);
		expect(times[2] - times[1]).toBeGreaterThanOrEqual(55);
		expect((await mainPictureOf(kit))?.main_picture_chosen).toBe(1);
	});

	describe('lookup in batches', () => {
		it('marks a Kit looked up with no Main Picture when the matching image is refused', async () => {
			equipment['133713'] = {
				equipment: [
					{ strSeason: '2023-2024', strType: '1st', strEquipment: equipmentUrl('big') },
					{ strSeason: '2023-2024', strType: '2nd', strEquipment: equipmentUrl('page') }
				]
			};
			const home = await lyon();
			const away = await lyon({ kitType: 'away' });
			expect(await catalog.lookupNext(token, { size: 10 })).toEqual({ total: 2, done: 2 });
			for (const kit of [home, away]) {
				expect((await mainPictureOf(kit))?.main_picture_key).toBe(null);
			}
		});

		it('stores the matching picture as a Main Picture the Owner did not choose', async () => {
			const kit = await lyon();
			expect(await catalog.lookupNext(token, { size: 5 })).toEqual({ total: 1, done: 1 });
			expect(await mainPictureOf(kit)).toEqual({
				main_picture_key: `main-pictures/${kit}`,
				main_picture_version: 1,
				main_picture_chosen: 0
			});
			expect(sportsDbCalls('2tpd4i1689433133.png')).toHaveLength(1);
		});

		it('matches Away, Third and Fourth to 2nd, 3rd and 4th, and never Cup or Special', async () => {
			equipment['133713'] = {
				equipment: [
					...equipmentLyon.equipment,
					{
						strSeason: '2023-2024',
						strType: '4th',
						strEquipment: equipmentUrl('fourth')
					}
				]
			};
			const away = await lyon({ kitType: 'away' });
			const third = await lyon({ kitType: 'third' });
			const fourth = await lyon({ kitType: 'fourth' });
			const cup = await lyon({ kitType: 'cup' });
			const special = await lyon({ kitType: 'special' });
			expect(await catalog.lookupNext(token, { size: 10 })).toEqual({ total: 5, done: 5 });
			expect(sportsDbCalls('.png').map((c) => c.url.pathname.split('/').at(-1))).toEqual([
				'y0wcw71689433160.png',
				'5qb1ec1694430205.png',
				'fourth.png'
			]);
			for (const kit of [away, third, fourth]) {
				expect((await mainPictureOf(kit))?.main_picture_version).toBe(1);
			}
			for (const kit of [cup, special]) {
				expect((await mainPictureOf(kit))?.main_picture_key).toBe(null);
			}
		});

		it('matches a Calendar Season, and leaves the Main Picture empty with no Season match', async () => {
			const japan = (start: number) =>
				insertKit({
					team: 'Japan',
					kind: 'national',
					start,
					kitType: 'home',
					country: 'Japan',
					league: 'J1 League'
				});
			const matched = await japan(2024);
			const unmatched = await japan(2018);
			await catalog.lookupNext(token, { size: 10 });
			expect((await mainPictureOf(matched))?.main_picture_key).toBe(`main-pictures/${matched}`);
			expect(await mainPictureOf(unmatched)).toEqual({
				main_picture_key: null,
				main_picture_version: 0,
				main_picture_chosen: 0
			});
		});

		it('leaves the Main Picture empty when no TheSportsDB Team matches', async () => {
			const kit = await insertKit({ team: 'Nowhere FC', start: 2023, end: 2024, kitType: 'home' });
			expect(await catalog.lookupNext(token, { size: 10 })).toEqual({ total: 1, done: 1 });
			expect((await mainPictureOf(kit))?.main_picture_key).toBe(null);
			expect(sportsDbCalls('lookupequipment.php')).toHaveLength(0);
		});

		it('takes only Kits not looked up yet, and counts across batches', async () => {
			await lyon();
			await lyon({ kitType: 'away' });
			await lyon({ kitType: 'cup' });
			expect(await catalog.lookupNext(token, { size: 2 })).toEqual({ total: 3, done: 2 });
			expect(await catalog.lookupNext(token, { size: 2 })).toEqual({ total: 3, done: 3 });
			const before = calls.length;
			expect(await catalog.lookupNext(token, { size: 2 })).toEqual({ total: 3, done: 3 });
			expect(calls).toHaveLength(before);
		});

		it('counts a Kit with an Owner-chosen Main Picture as done and never looks it up', async () => {
			const kit = await lyon();
			await catalog.uploadMainPicture(token, {
				kitId: kit,
				body: PNG.buffer,
				contentType: 'image/png'
			});
			const before = await mainPictureOf(kit);
			expect(await catalog.lookupNext(token, { size: 5 })).toEqual({ total: 1, done: 1 });
			expect(calls).toHaveLength(0);
			expect(await mainPictureOf(kit)).toEqual(before);
		});

		describe('rerun', () => {
			const lookUpEverything = async () => {
				let progress = await catalog.lookupNext(token, { size: 1, rerun: true });
				while (progress.done < progress.total) {
					progress = await catalog.lookupNext(token, {
						size: 1,
						rerun: true,
						after: progress.after
					});
				}
				return progress;
			};

			it('looks up again every Kit whose Main Picture the Owner did not choose', async () => {
				const home = await lyon();
				const cup = await lyon({ kitType: 'cup' });
				await catalog.lookupNext(token, { size: 10 });
				const before = calls.length;
				expect(await catalog.lookupNext(token, { size: 10 })).toEqual({ total: 2, done: 2 });
				expect(calls).toHaveLength(before);

				const first = await catalog.lookupNext(token, { size: 1, rerun: true });
				expect(first).toEqual({ total: 2, done: 1, after: home });
				expect(await catalog.lookupNext(token, { size: 1, rerun: true, after: home })).toEqual({
					total: 2,
					done: 2,
					after: cup
				});
				expect(await mainPictureOf(home)).toMatchObject({
					main_picture_version: 2,
					main_picture_chosen: 0
				});
				expect((await mainPictureOf(cup))?.main_picture_key).toBe(null);
			});

			it('keeps an Owner-chosen Main Picture', async () => {
				const chosen = await lyon();
				const other = await lyon({ kitType: 'away' });
				await catalog.uploadMainPicture(token, {
					kitId: chosen,
					body: new Uint8Array([...PNG, 1]).buffer,
					contentType: 'image/png'
				});
				expect(await lookUpEverything()).toMatchObject({ total: 1, done: 1 });
				expect(await mainPictureOf(chosen)).toEqual({
					main_picture_key: `main-pictures/${chosen}`,
					main_picture_version: 1,
					main_picture_chosen: 1
				});
				const kept = await catalog.getMainPicture(chosen);
				expect(new Uint8Array(await new Response(kept!.body).arrayBuffer())).toEqual(
					new Uint8Array([...PNG, 1])
				);
				expect((await mainPictureOf(other))?.main_picture_version).toBe(1);
			});
		});

		it('stops at a 429 with no retry and reports the progress so far', async () => {
			const first = await lyon();
			const second = await lyon({ kitType: 'away' });
			await lyon({ kitType: 'third' });
			let answered = 0;
			const fake = vi.mocked(globalThis.fetch).getMockImplementation()!;
			vi.mocked(globalThis.fetch).mockImplementation(async (input, init) => {
				// The first Kit takes 3 requests (search, equipment, image); the second's equipment is refused.
				failing = ++answered > 3;
				return fake(input, init);
			});
			expect(await catalog.lookupNext(token, { size: 3 })).toEqual({
				total: 3,
				done: 1,
				rateLimited: true
			});
			expect(calls).toHaveLength(4);
			expect((await mainPictureOf(first))?.main_picture_version).toBe(1);
			expect((await mainPictureOf(second))?.main_picture_key).toBe(null);
		});
	});
});

async function insertJersey(
	kitId: number,
	jersey: {
		version?: string;
		size?: string;
		fit?: string;
		print?: string;
		kind?: 'purchase' | 'gift';
		date: string;
		sent?: string;
		received?: string;
		storeId?: number;
		priceCents?: number;
		giver?: string;
	}
) {
	const row = await env.DB.prepare(
		`INSERT INTO jersey (kit_id, version, size, fit, print, acquisition_kind, acquisition_date,
			sent_date, received_date, store_id, price_cents, giver)
		VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12) RETURNING id`
	)
		.bind(
			kitId,
			jersey.version ?? 'fan',
			jersey.size ?? null,
			jersey.fit ?? null,
			jersey.print ?? null,
			jersey.kind ?? 'purchase',
			jersey.date,
			jersey.sent ?? null,
			jersey.received ?? null,
			jersey.storeId ?? null,
			jersey.priceCents ?? null,
			jersey.giver ?? null
		)
		.first<{ id: number }>();
	return row!.id;
}

describe('Collection', () => {
	const catalog = createCatalog(env);

	beforeEach(async () => {
		await env.DB.batch([
			env.DB.prepare('DELETE FROM wishlist_item'),
			env.DB.prepare('DELETE FROM jersey'),
			env.DB.prepare('DELETE FROM kit'),
			env.DB.prepare('DELETE FROM team'),
			env.DB.prepare('DELETE FROM country'),
			env.DB.prepare('DELETE FROM league')
		]);
	});

	it('is empty with no Jerseys', async () => {
		expect(await catalog.listCollection()).toEqual([]);
	});

	it('lists Jerseys with their Kit, Team, Country and Acquisition, newest first', async () => {
		const lille = await insertKit({
			team: 'Lille',
			start: 2021,
			end: 2022,
			kitType: 'third',
			mainPictureKey: 'main-pictures/x'
		});
		const japan = await insertKit({
			team: 'Japan',
			kind: 'national',
			start: 2024,
			kitType: 'special'
		});
		const bought = await insertJersey(lille, {
			version: 'player',
			size: 'L',
			fit: 'good',
			print: 'NICOLAS 4',
			date: '2021-10-04',
			received: '2021-10-20',
			storeId: 1,
			priceCents: 10300
		});
		const gift = await insertJersey(japan, {
			print: 'ニコラス 4',
			kind: 'gift',
			date: '2024',
			giver: 'Mum'
		});

		const collection = await catalog.listCollection();

		expect(collection.map((j) => j.id)).toEqual([gift, bought]);
		const country = (await catalog.listCountries()).find((c) => c.name === 'Country of Lille')!;
		expect(collection[1]).toEqual({
			id: bought,
			version: 'player',
			size: 'L',
			fit: 'good',
			print: 'NICOLAS 4',
			kit: {
				id: lille,
				season: '2021-22',
				kitType: 'third',
				mainPictureKey: 'main-pictures/x',
				mainPictureVersion: 0,
				team: {
					id: expect.any(Number),
					name: 'Lille',
					kind: 'club',
					country: { id: country.id, name: 'Country of Lille', continent: 'europe' }
				}
			},
			acquisition: {
				kind: 'purchase',
				store: { id: 1, name: 'Official Store' },
				priceCents: 10300,
				bought: '2021-10-04',
				sent: null,
				received: '2021-10-20'
			}
		});
		expect(collection[0]).toMatchObject({
			size: null,
			fit: null,
			kit: { season: '2024', kitType: 'special', mainPictureKey: null, team: { kind: 'national' } },
			acquisition: { kind: 'gift', date: '2024', giver: 'Mum' }
		});
	});

	it('shows two Jerseys of one Kit as two Jerseys of the same Kit', async () => {
		const kit = await insertKit({ team: 'Roma', start: 2023, end: 2024, kitType: 'home' });
		await insertJersey(kit, { date: '2023-10-02', priceCents: 2096, storeId: 1 });
		await insertJersey(kit, { version: 'player', date: '2024-04-26' });

		const collection = await catalog.listCollection();

		expect(collection).toHaveLength(2);
		expect(collection[0].kit).toEqual(collection[1].kit);
		expect(collection[0].acquisition).toMatchObject({
			kind: 'purchase',
			store: null,
			priceCents: null
		});
	});
});

async function insertWishlistItem(kitId: number, item: { version?: string }) {
	const row = await env.DB.prepare(
		'INSERT INTO wishlist_item (kit_id, version) VALUES (?1, ?2) RETURNING id'
	)
		.bind(kitId, item.version ?? null)
		.first<{ id: number }>();
	return row!.id;
}

describe('Wishlist', () => {
	const catalog = createCatalog(env);

	beforeEach(async () => {
		await env.DB.batch([
			env.DB.prepare('DELETE FROM wishlist_item'),
			env.DB.prepare('DELETE FROM jersey'),
			env.DB.prepare('DELETE FROM kit'),
			env.DB.prepare('DELETE FROM team'),
			env.DB.prepare('DELETE FROM country'),
			env.DB.prepare('DELETE FROM league')
		]);
	});

	it('is empty with no Wishlist Items', async () => {
		expect(await catalog.listWishlist()).toEqual([]);
	});

	it('lists Wishlist Items with their Kit, Team, Country, newest Season first', async () => {
		const milan = await insertKit({
			team: 'Milan',
			start: 1988,
			end: 1989,
			kitType: 'home',
			mainPictureKey: 'main-pictures/m'
		});
		const brazil = await insertKit({
			team: 'Brazil',
			kind: 'national',
			start: 1970,
			kitType: 'away'
		});
		const any = await insertWishlistItem(milan, {});
		const player = await insertWishlistItem(brazil, { version: 'player' });

		const wishlist = await catalog.listWishlist();

		expect(wishlist.map((item) => item.id)).toEqual([any, player]);
		const country = (await catalog.listCountries()).find((c) => c.name === 'Country of Milan')!;
		expect(wishlist[0]).toEqual({
			id: any,
			version: null,
			kit: {
				id: milan,
				season: '1988-89',
				kitType: 'home',
				mainPictureKey: 'main-pictures/m',
				mainPictureVersion: 0,
				team: {
					id: expect.any(Number),
					name: 'Milan',
					kind: 'club',
					country: { id: country.id, name: 'Country of Milan', continent: 'europe' }
				}
			}
		});
		expect(wishlist[1]).toMatchObject({
			version: 'player',
			kit: { season: '1970', kitType: 'away', mainPictureKey: null, team: { kind: 'national' } }
		});
	});
});

describe('Coverage', () => {
	const catalog = createCatalog(env);

	beforeEach(async () => {
		await env.DB.batch([
			env.DB.prepare('DELETE FROM wishlist_item'),
			env.DB.prepare('DELETE FROM jersey'),
			env.DB.prepare('DELETE FROM kit'),
			env.DB.prepare('DELETE FROM team'),
			env.DB.prepare('DELETE FROM country'),
			env.DB.prepare('DELETE FROM league')
		]);
	});

	it('lists every Country by name, none covered without Jerseys', async () => {
		await insertKit({ team: 'Lille', country: 'France', start: 2021, end: 2022, kitType: 'home' });
		await insertKit({
			team: 'Japan',
			kind: 'national',
			country: 'Japan',
			start: 2024,
			kitType: 'home'
		});

		expect(await catalog.listCoverage()).toEqual([
			{ id: expect.any(Number), name: 'France', covered: false },
			{ id: expect.any(Number), name: 'Japan', covered: false }
		]);
	});

	it('covers the Country of a National Team Nico owns a Jersey of', async () => {
		const japan = await insertKit({
			team: 'Japan',
			kind: 'national',
			country: 'Japan',
			start: 2024,
			kitType: 'home'
		});
		await insertKit({ team: 'Lille', country: 'France', start: 2021, end: 2022, kitType: 'home' });
		await insertJersey(japan, { kind: 'gift', date: '2024' });

		expect(await catalog.listCoverage()).toMatchObject([
			{ name: 'France', covered: false },
			{ name: 'Japan', covered: true }
		]);
	});

	it('covers the Country of the League of a Club Nico owns a Jersey of', async () => {
		const lille = await insertKit({
			team: 'Lille',
			country: 'France',
			league: 'Ligue 1',
			start: 2021,
			end: 2022,
			kitType: 'home'
		});
		await insertKit({
			team: 'Japan',
			kind: 'national',
			country: 'Japan',
			start: 2024,
			kitType: 'home'
		});
		await insertJersey(lille, { date: '2021-10-04' });
		await insertJersey(lille, { date: '2022-01-04' });

		expect(await catalog.listCoverage()).toMatchObject([
			{ name: 'France', covered: true },
			{ name: 'Japan', covered: false }
		]);
	});
});

/** A new Kit runs the Main Picture lookup: this fake TheSportsDB finds no Team, so nothing goes out. */
function stubSportsDbWithoutTeams() {
	vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
		const url = new URL(new Request(input as RequestInfo, init).url);
		if (url.host === 'www.thesportsdb.com') return Response.json(searchNone);
		throw new Error(`Unexpected fetch to ${url.href}`);
	});
}

describe('Add and edit a Jersey', () => {
	const catalog = createCatalog(env, { lookupIntervalMs: 0 });
	let token: string;
	let france: number;

	const purchase = {
		kind: 'purchase',
		storeId: 1,
		priceCents: 8990,
		bought: '2024-05-12'
	} as const;
	const jersey = { version: 'fan', size: 'M', fit: 'good', acquisition: purchase } as const;

	afterEach(() => {
		vi.restoreAllMocks();
	});

	beforeEach(async () => {
		stubSportsDbWithoutTeams();
		await env.DB.batch([
			env.DB.prepare('DELETE FROM wishlist_item'),
			env.DB.prepare('DELETE FROM jersey'),
			env.DB.prepare('DELETE FROM kit'),
			env.DB.prepare('DELETE FROM team'),
			env.DB.prepare('DELETE FROM country'),
			env.DB.prepare('DELETE FROM league')
		]);
		const result = await catalog.login('test-password');
		if (!result.ok) throw new Error('login failed');
		token = result.token;
		france = (
			await catalog.addCountry(token, {
				name: 'France',
				continent: 'europe',
				leagueName: 'Ligue 1',
				seasonFormat: 'split'
			})
		).id;
	});

	it('adds a Jersey of a new Club, with its Kit', async () => {
		const added = await catalog.addJersey(token, {
			...jersey,
			team: { name: ' Lyon ', kind: 'club', countryId: france },
			season: '2023-24',
			kitType: 'home',
			print: ' NICOLAS 4 '
		});

		expect(added).toMatchObject({
			version: 'fan',
			size: 'M',
			fit: 'good',
			print: 'NICOLAS 4',
			kit: {
				season: '2023-24',
				kitType: 'home',
				team: { name: 'Lyon', kind: 'club', country: { id: france, name: 'France' } }
			},
			acquisition: {
				kind: 'purchase',
				store: { id: 1, name: 'Official Store' },
				priceCents: 8990,
				bought: '2024-05-12',
				sent: null,
				received: null
			}
		});
		expect(await catalog.listCollection()).toEqual([added]);
		expect(await catalog.listTeams()).toEqual([
			{
				id: added.kit.team.id,
				name: 'Lyon',
				kind: 'club',
				seasonFormat: 'split',
				country: { id: france, name: 'France', continent: 'europe' }
			}
		]);
	});

	const lyon = () => ({ name: 'Lyon', kind: 'club' as const, countryId: france });
	const kitCount = async () =>
		(await env.DB.prepare('SELECT count(*) AS n FROM kit').first<{ n: number }>())!.n;

	it('reuses the Kit for a second Jersey of the same Team, Season and Kit Type', async () => {
		const first = await catalog.addJersey(token, {
			...jersey,
			team: lyon(),
			season: '2023-24',
			kitType: 'home'
		});
		const second = await catalog.addJersey(token, {
			...jersey,
			version: 'player',
			team: { teamId: first.kit.team.id },
			season: '2023-24',
			kitType: 'home'
		});
		const away = await catalog.addJersey(token, {
			...jersey,
			team: { teamId: first.kit.team.id },
			season: '2023-24',
			kitType: 'away'
		});

		expect(second.kit).toEqual(first.kit);
		expect(away.kit.id).not.toBe(first.kit.id);
		expect(await kitCount()).toBe(2);
		expect(await catalog.listTeams()).toHaveLength(1);
	});

	it('refuses a new Team whose name another Team has, in any case', async () => {
		await catalog.addJersey(token, { ...jersey, team: lyon(), season: '2023-24', kitType: 'home' });
		await expect(
			catalog.addJersey(token, {
				...jersey,
				team: { ...lyon(), name: 'LYON' },
				season: '2023-24',
				kitType: 'away'
			})
		).rejects.toThrow('A team named “LYON” already exists');
	});

	it('refuses a second National Team for one Country, and an unknown Team or Country', async () => {
		const national = { name: 'France', kind: 'national' as const, countryId: france };
		const added = await catalog.addJersey(token, {
			...jersey,
			team: national,
			season: '2024',
			kitType: 'home'
		});
		expect(added.kit.team).toMatchObject({ name: 'France', kind: 'national' });

		await expect(
			catalog.addJersey(token, {
				...jersey,
				team: { ...national, name: 'Les Bleus' },
				season: '2024',
				kitType: 'away'
			})
		).rejects.toThrow('France already has a National Team: France');
		await expect(
			catalog.addJersey(token, {
				...jersey,
				team: { teamId: 999999 },
				season: '2024',
				kitType: 'home'
			})
		).rejects.toThrow('Unknown team');
		await expect(
			catalog.addJersey(token, {
				...jersey,
				team: { ...lyon(), countryId: 999999 },
				season: '2024-25',
				kitType: 'home'
			})
		).rejects.toThrow('Unknown country');
		expect(await kitCount()).toBe(1);
	});

	it('checks the Season against the Season Format, and creates nothing when it fails', async () => {
		const club = { ...jersey, team: lyon(), kitType: 'home' } as const;
		await expect(catalog.addJersey(token, { ...club, season: '2024' })).rejects.toThrow(
			'Season must be two years in a row, like 2024-25'
		);
		await expect(catalog.addJersey(token, { ...club, season: '2024-26' })).rejects.toThrow(
			'Season must be two years in a row, like 2024-25'
		);
		expect(await catalog.listTeams()).toEqual([]);

		const national = { ...club, team: { name: 'France', kind: 'national', countryId: france } };
		await expect(
			catalog.addJersey(token, { ...national, season: '2024-25' } as never)
		).rejects.toThrow('Season must be one year, like 2024');

		const split = await catalog.addJersey(token, { ...club, season: '1999-00' });
		expect(split.kit.season).toBe('1999-00');
		const calendar = await catalog.addJersey(token, { ...national, season: '2024' } as never);
		expect(calendar.kit.season).toBe('2024');
	});

	it('takes Sent and Received dates on a Purchase, and year-only dates', async () => {
		const added = await catalog.addJersey(token, {
			...jersey,
			team: lyon(),
			season: '2023-24',
			kitType: 'home',
			acquisition: { ...purchase, bought: '2009', sent: '2009-03-01', received: ' 2009 ' }
		});
		expect(added.acquisition).toEqual({
			kind: 'purchase',
			store: { id: 1, name: 'Official Store' },
			priceCents: 8990,
			bought: '2009',
			sent: '2009-03-01',
			received: '2009'
		});
	});

	it('keeps a Gift without Store or price, with an optional giver', async () => {
		const gift = await catalog.addJersey(token, {
			...jersey,
			size: null,
			fit: null,
			team: lyon(),
			season: '2023-24',
			kitType: 'home',
			acquisition: { kind: 'gift', date: '2015', giver: ' Mum ' }
		});
		expect(gift).toMatchObject({
			size: null,
			fit: null,
			print: null,
			acquisition: { kind: 'gift', date: '2015', giver: 'Mum' }
		});
		const anonymous = await catalog.addJersey(token, {
			...jersey,
			team: { teamId: gift.kit.team.id },
			season: '2023-24',
			kitType: 'home',
			acquisition: { kind: 'gift', date: '2016-12-25', giver: '  ' }
		});
		expect(anonymous.acquisition).toEqual({ kind: 'gift', date: '2016-12-25', giver: null });
	});

	it('refuses a bad Acquisition with a readable error', async () => {
		const add = (acquisition: unknown) =>
			catalog.addJersey(token, {
				...jersey,
				team: lyon(),
				season: '2023-24',
				kitType: 'home',
				acquisition: acquisition as never
			});
		await expect(add({ ...purchase, storeId: 999999 })).rejects.toThrow('A Purchase needs a Store');
		await expect(add({ ...purchase, priceCents: undefined })).rejects.toThrow(
			'A Purchase needs a price in euros'
		);
		await expect(add({ ...purchase, priceCents: 12.5 })).rejects.toThrow(
			'A Purchase needs a price in euros'
		);
		await expect(add({ ...purchase, bought: '' })).rejects.toThrow(
			'Bought date must be YYYY or YYYY-MM-DD'
		);
		await expect(add({ ...purchase, bought: '12/05/2024' })).rejects.toThrow(
			'Bought date must be YYYY or YYYY-MM-DD'
		);
		await expect(add({ ...purchase, bought: '2024-05' })).rejects.toThrow(
			'Bought date must be YYYY or YYYY-MM-DD'
		);
		await expect(add({ ...purchase, sent: '2024-02-31' })).rejects.toThrow(
			'Sent date is not a real date'
		);
		await expect(add({ ...purchase, received: '24' })).rejects.toThrow(
			'Received date must be YYYY or YYYY-MM-DD'
		);
		await expect(add({ kind: 'gift', date: '' })).rejects.toThrow(
			'Gift date must be YYYY or YYYY-MM-DD'
		);
		await expect(add({ kind: 'swap', date: '2024' })).rejects.toThrow(
			'Acquisition must be a Purchase or a Gift'
		);
		expect(await catalog.listTeams()).toEqual([]);
	});

	it('refuses a bad Kit Type, Version, Size or Fit', async () => {
		const add = (extra: object) =>
			catalog.addJersey(token, {
				...jersey,
				team: lyon(),
				season: '2023-24',
				kitType: 'home',
				...extra
			} as never);
		await expect(add({ kitType: 'goalkeeper' })).rejects.toThrow('Kit Type must be');
		await expect(add({ version: 'retro' })).rejects.toThrow(
			'Version must be Fan, Player or Tracksuit'
		);
		await expect(add({ size: 'XL' })).rejects.toThrow('Size must be S, M or L');
		await expect(add({ fit: 'tight' })).rejects.toThrow('Fit must be Too small, Good or Too big');
	});

	it('edits a Jersey, and moves it to the Kit of its new Team, Season and Kit Type', async () => {
		const added = await catalog.addJersey(token, {
			...jersey,
			team: lyon(),
			season: '2023-24',
			kitType: 'home',
			print: 'NICOLAS 4'
		});
		const other = await catalog.addJersey(token, {
			...jersey,
			team: { teamId: added.kit.team.id },
			season: '2022-23',
			kitType: 'away'
		});

		const edited = await catalog.editJersey(token, {
			id: added.id,
			team: { teamId: added.kit.team.id },
			season: '2022-23',
			kitType: 'away',
			version: 'player',
			size: 'L',
			fit: 'too-big',
			print: '',
			acquisition: { kind: 'gift', date: '2023', giver: 'Dad' }
		});

		expect(edited).toEqual({
			id: added.id,
			version: 'player',
			size: 'L',
			fit: 'too-big',
			print: null,
			kit: other.kit,
			acquisition: { kind: 'gift', date: '2023', giver: 'Dad' }
		});

		const moved = await catalog.editJersey(token, {
			...jersey,
			id: added.id,
			team: { name: 'France', kind: 'national', countryId: france },
			season: '2024',
			kitType: 'home'
		});
		expect(moved.kit).toMatchObject({ season: '2024', team: { name: 'France', kind: 'national' } });
		expect(moved.acquisition).toMatchObject({ kind: 'purchase', priceCents: 8990 });
		expect((await catalog.listCollection()).map((j) => j.kit.team.name).sort()).toEqual([
			'France',
			'Lyon'
		]);
	});

	it('refuses to edit an unknown Jersey', async () => {
		await expect(
			catalog.editJersey(token, {
				...jersey,
				id: 999999,
				team: lyon(),
				season: '2023-24',
				kitType: 'home'
			})
		).rejects.toThrow('Unknown jersey');
		expect(await catalog.listTeams()).toEqual([]);
	});

	it('lists Teams by name, a National Team with the Calendar format', async () => {
		await catalog.addCountry(token, {
			name: 'Japan',
			continent: 'asia-oceania',
			leagueName: 'J1 League',
			seasonFormat: 'calendar'
		});
		const japan = (await catalog.listCountries()).find((c) => c.name === 'Japan')!.id;
		const add = (team: object, season: string) =>
			catalog.addJersey(token, { ...jersey, team, season, kitType: 'home' } as never);
		await add({ name: 'Vissel Kobe', kind: 'club', countryId: japan }, '2024');
		await add({ name: 'France', kind: 'national', countryId: france }, '2024');
		await add({ name: 'ajaccio', kind: 'club', countryId: france }, '2024-25');

		expect((await catalog.listTeams()).map((t) => [t.name, t.seasonFormat])).toEqual([
			['ajaccio', 'split'],
			['France', 'calendar'],
			['Vissel Kobe', 'calendar']
		]);
	});
});

describe('Add a Wishlist Item', () => {
	const catalog = createCatalog(env, { lookupIntervalMs: 0 });
	let token: string;
	let france: number;

	afterEach(() => {
		vi.restoreAllMocks();
	});

	beforeEach(async () => {
		stubSportsDbWithoutTeams();
		await env.DB.batch([
			env.DB.prepare('DELETE FROM wishlist_item'),
			env.DB.prepare('DELETE FROM jersey'),
			env.DB.prepare('DELETE FROM kit'),
			env.DB.prepare('DELETE FROM team'),
			env.DB.prepare('DELETE FROM country'),
			env.DB.prepare('DELETE FROM league')
		]);
		const result = await catalog.login('test-password');
		if (!result.ok) throw new Error('login failed');
		token = result.token;
		france = (
			await catalog.addCountry(token, {
				name: 'France',
				continent: 'europe',
				leagueName: 'Ligue 1',
				seasonFormat: 'split'
			})
		).id;
	});

	const lyon = () => ({ name: 'Lyon', kind: 'club' as const, countryId: france });

	it('adds a Wishlist Item of a new Club, with its Team and Kit', async () => {
		const result = await catalog.addWishlistItem(token, {
			team: { name: ' Lyon ', kind: 'club', countryId: france },
			season: '2023-24',
			kitType: 'away',
			version: null
		});

		expect(result).toMatchObject({
			status: 'added',
			item: {
				version: null,
				kit: {
					season: '2023-24',
					kitType: 'away',
					team: { name: 'Lyon', kind: 'club', country: { id: france, name: 'France' } }
				}
			}
		});
		if (result.status !== 'added') throw new Error('not added');
		expect(await catalog.listWishlist()).toEqual([result.item]);
		expect((await catalog.listTeams()).map((t) => t.name)).toEqual(['Lyon']);
	});

	it('refuses a second Wishlist Item for one Kit, and writes nothing', async () => {
		const first = await catalog.addWishlistItem(token, {
			team: lyon(),
			season: '2023-24',
			kitType: 'home',
			version: 'fan'
		});
		if (first.status !== 'added') throw new Error('not added');

		await expect(
			catalog.addWishlistItem(token, {
				team: { teamId: first.item.kit.team.id },
				season: '2023-24',
				kitType: 'home',
				version: 'player'
			})
		).rejects.toThrow('Lyon 2023-24 Home is already on the Wishlist');
		expect(await catalog.listWishlist()).toEqual([first.item]);
	});

	it('answers Already owned for a Kit with a Jersey, and saves with Add anyway', async () => {
		const owned = await catalog.addJersey(token, {
			team: lyon(),
			season: '2023-24',
			kitType: 'home',
			version: 'fan',
			size: 'M',
			fit: 'good',
			acquisition: { kind: 'gift', date: '2024' }
		});
		const input = {
			team: { teamId: owned.kit.team.id },
			season: '2023-24',
			kitType: 'home',
			version: 'player'
		} as const;

		expect(await catalog.addWishlistItem(token, input)).toEqual({ status: 'already-owned' });
		expect(await catalog.listWishlist()).toEqual([]);

		const result = await catalog.addWishlistItem(token, { ...input, addAnyway: true });
		expect(result).toMatchObject({ status: 'added', item: { version: 'player' } });
		if (result.status !== 'added') throw new Error('not added');
		expect(result.item.kit).toEqual(owned.kit);
	});

	it('requires a known Version, and writes nothing', async () => {
		const input = { team: lyon(), season: '2023-24', kitType: 'home', version: null } as const;
		await expect(
			catalog.addWishlistItem(token, { ...input, version: 'retro' } as never)
		).rejects.toThrow('Version must be Any, Fan, Player or Tracksuit');
		expect(await catalog.listTeams()).toEqual([]);
		expect(await catalog.listWishlist()).toEqual([]);
	});
});

describe('Got it and Drop', () => {
	const catalog = createCatalog(env, { lookupIntervalMs: 0 });
	let token: string;
	let france: number;

	afterEach(() => {
		vi.restoreAllMocks();
	});

	beforeEach(async () => {
		stubSportsDbWithoutTeams();
		await env.DB.batch([
			env.DB.prepare('DELETE FROM wishlist_item'),
			env.DB.prepare('DELETE FROM jersey'),
			env.DB.prepare('DELETE FROM kit'),
			env.DB.prepare('DELETE FROM team'),
			env.DB.prepare('DELETE FROM country'),
			env.DB.prepare('DELETE FROM league')
		]);
		const result = await catalog.login('test-password');
		if (!result.ok) throw new Error('login failed');
		token = result.token;
		france = (
			await catalog.addCountry(token, {
				name: 'France',
				continent: 'europe',
				leagueName: 'Ligue 1',
				seasonFormat: 'split'
			})
		).id;
	});

	async function wanted() {
		const result = await catalog.addWishlistItem(token, {
			team: { name: 'Lyon', kind: 'club', countryId: france },
			season: '2023-24',
			kitType: 'away',
			version: 'player'
		});
		if (result.status !== 'added') throw new Error('not added');
		return result.item;
	}

	it('Got it removes the Wishlist Item and adds a Jersey of the same Kit', async () => {
		const item = await wanted();

		const jersey = await catalog.gotIt(token, {
			wishlistItemId: item.id,
			jersey: {
				version: 'fan',
				size: 'L',
				fit: 'too-big',
				print: ' Cherki 18 ',
				acquisition: { kind: 'gift', date: '2024-12-25', giver: 'Léa' }
			}
		});

		expect(jersey).toMatchObject({
			version: 'fan',
			size: 'L',
			fit: 'too-big',
			print: 'Cherki 18',
			acquisition: { kind: 'gift', date: '2024-12-25', giver: 'Léa' }
		});
		expect(jersey.kit).toEqual(item.kit);
		expect(await catalog.listCollection()).toEqual([jersey]);
		expect(await catalog.listWishlist()).toEqual([]);
	});

	it('Got it with an invalid Jersey changes nothing', async () => {
		const item = await wanted();
		const jersey = {
			version: 'fan',
			size: 'M',
			fit: 'good',
			acquisition: { kind: 'purchase', storeId: 1, priceCents: 8999, bought: '2024-13-01' }
		} as const;

		await expect(catalog.gotIt(token, { wishlistItemId: item.id, jersey })).rejects.toThrow(
			'Bought date is not a real date'
		);
		await expect(
			catalog.gotIt(token, { wishlistItemId: item.id, jersey: { ...jersey, size: 'XL' } as never })
		).rejects.toThrow('Size must be S, M or L');
		expect(await catalog.listWishlist()).toEqual([item]);
		expect(await catalog.listCollection()).toEqual([]);
	});

	it('Got it on an unknown Wishlist Item adds nothing', async () => {
		await expect(
			catalog.gotIt(token, {
				wishlistItemId: 999,
				jersey: {
					version: 'fan',
					size: 'M',
					fit: 'good',
					acquisition: { kind: 'gift', date: '2024' }
				}
			})
		).rejects.toThrow('Unknown wishlist item');
		expect(await catalog.listCollection()).toEqual([]);
	});

	it('Drop removes the Wishlist Item and keeps the Kit', async () => {
		const item = await wanted();

		await catalog.drop(token, item.id);

		expect(await catalog.listWishlist()).toEqual([]);
		expect(await catalog.listKitsWithoutMainPicture(token)).toEqual([
			{ id: item.kit.id, teamName: 'Lyon', season: '2023-24', kitType: 'away' }
		]);
	});
});

describe('Main Picture of a new Kit', () => {
	const catalog = createCatalog(env, { lookupIntervalMs: 0, lookupTimeoutMs: 100 });
	let token: string;
	let france: number;
	/** Fake TheSportsDB: 'ok' answers the Lyon fixtures, 'error' answers 500, 'hang' never answers. */
	let sportsDb: 'ok' | 'error' | 'hang';
	let calls: URL[];
	let logged: ReturnType<typeof vi.spyOn>;

	const purchase = {
		kind: 'purchase',
		storeId: 1,
		priceCents: 8990,
		bought: '2024-05-12'
	} as const;
	const jersey = { version: 'fan', size: 'M', fit: 'good', acquisition: purchase } as const;
	const lyonKit = () =>
		({
			team: { name: 'Lyon', kind: 'club', countryId: france },
			season: '2023-24',
			kitType: 'home'
		}) as const;
	const wish = { version: null } as const;

	beforeEach(async () => {
		await env.DB.batch([
			env.DB.prepare('DELETE FROM wishlist_item'),
			env.DB.prepare('DELETE FROM jersey'),
			env.DB.prepare('DELETE FROM kit'),
			env.DB.prepare('DELETE FROM team'),
			env.DB.prepare('DELETE FROM country'),
			env.DB.prepare('DELETE FROM league')
		]);
		const listed = await env.COVERS.list();
		await Promise.all(listed.objects.map((o) => env.COVERS.delete(o.key)));
		const result = await catalog.login('test-password');
		if (!result.ok) throw new Error('login failed');
		token = result.token;
		france = (
			await catalog.addCountry(token, {
				name: 'France',
				continent: 'europe',
				leagueName: 'Ligue 1',
				seasonFormat: 'split'
			})
		).id;

		sportsDb = 'ok';
		calls = [];
		logged = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
			const url = new URL(new Request(input as RequestInfo, init).url);
			calls.push(url);
			if (sportsDb === 'hang') return new Promise<Response>(() => {});
			if (sportsDb === 'error') return new Response('Server Error', { status: 500 });
			if (url.host === 'www.thesportsdb.com') {
				if (url.pathname.endsWith('/searchteams.php')) {
					return Response.json(url.searchParams.get('t') === 'Lyon' ? searchLyon : searchNone);
				}
				if (url.pathname.endsWith('/lookupequipment.php')) {
					return Response.json(
						url.searchParams.get('id') === '133713' ? equipmentLyon : equipmentNone
					);
				}
			}
			if (url.host === 'r2.thesportsdb.com') {
				return new Response(PNG, { headers: { 'content-type': 'image/png' } });
			}
			throw new Error(`Unexpected fetch to ${url.href}`);
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('looks up the Main Picture of the Kit a new Jersey creates', async () => {
		const added = await catalog.addJersey(token, { ...jersey, ...lyonKit() });
		expect(await mainPictureOf(added.kit.id)).toEqual({
			main_picture_key: `main-pictures/${added.kit.id}`,
			main_picture_version: 1,
			main_picture_chosen: 0
		});
		const stored = await env.COVERS.get(`main-pictures/${added.kit.id}`);
		expect(new Uint8Array(await stored!.arrayBuffer())).toEqual(PNG);
	});

	it('looks up the Main Picture of the Kit a new Wishlist Item creates', async () => {
		const result = await catalog.addWishlistItem(token, { ...lyonKit(), ...wish });
		if (result.status !== 'added') throw new Error('not added');
		expect((await mainPictureOf(result.item.kit.id))?.main_picture_key).toBe(
			`main-pictures/${result.item.kit.id}`
		);
	});

	for (const failure of ['error', 'hang'] as const) {
		it(`saves the Jersey and the Wishlist Item when TheSportsDB fails (${failure})`, async () => {
			sportsDb = failure;
			const added = await catalog.addJersey(token, { ...jersey, ...lyonKit() });
			expect(await catalog.listCollection()).toEqual([added]);
			expect((await mainPictureOf(added.kit.id))?.main_picture_key).toBe(null);

			const result = await catalog.addWishlistItem(token, {
				...lyonKit(),
				team: { teamId: added.kit.team.id },
				kitType: 'away',
				...wish
			});
			if (result.status !== 'added') throw new Error('not added');
			expect(await catalog.listWishlist()).toEqual([result.item]);
			expect((await mainPictureOf(result.item.kit.id))?.main_picture_key).toBe(null);
			expect(logged).toHaveBeenCalledTimes(2);
		});
	}

	const photo = { body: PNG.slice().buffer as ArrayBuffer, contentType: 'image/png' };

	it('stores a Main picture sent with a new Jersey, chosen, and runs no lookup', async () => {
		const added = await catalog.addJersey(token, { ...jersey, ...lyonKit(), mainPicture: photo });
		expect(await mainPictureOf(added.kit.id)).toEqual({
			main_picture_key: `main-pictures/${added.kit.id}`,
			main_picture_version: 1,
			main_picture_chosen: 1
		});
		expect(calls).toEqual([]);
	});

	it('stores a Main picture sent with a Wishlist Item on a Kit that has none', async () => {
		const kit = await insertKit({
			team: 'Japan',
			kind: 'national',
			start: 2024,
			kitType: 'away',
			country: 'Japan'
		});
		const team = (await env.DB.prepare('SELECT id FROM team').first<{ id: number }>())!.id;
		await catalog.addWishlistItem(token, {
			team: { teamId: team },
			season: '2024',
			kitType: 'away',
			...wish,
			mainPicture: photo
		});
		expect(await mainPictureOf(kit)).toMatchObject({ main_picture_chosen: 1 });
		expect(calls).toEqual([]);
	});

	it('refuses a Main picture of another type or of 2 MB, and saves nothing', async () => {
		const bad = [
			[
				{ body: PNG.slice().buffer as ArrayBuffer, contentType: 'image/gif' },
				'Use a JPEG, PNG or WebP image'
			],
			[
				{ body: new ArrayBuffer(2 * 1024 * 1024), contentType: 'image/png' },
				'The image must be under 2 MB'
			]
		] as const;
		for (const [mainPicture, message] of bad) {
			await expect(
				catalog.addJersey(token, { ...jersey, ...lyonKit(), mainPicture })
			).rejects.toThrow(message);
			await expect(
				catalog.addWishlistItem(token, { ...lyonKit(), ...wish, mainPicture })
			).rejects.toThrow(message);
		}
		expect(await catalog.listTeams()).toEqual([]);
		expect(await catalog.listCollection()).toEqual([]);
		expect(await catalog.listWishlist()).toEqual([]);
		expect((await env.COVERS.list()).objects).toEqual([]);
		expect(calls).toEqual([]);
	});

	it('lists the Kits that have a Main Picture, for the forms', async () => {
		const added = await catalog.addJersey(token, { ...jersey, ...lyonKit() });
		sportsDb = 'error';
		await catalog.addJersey(token, {
			...jersey,
			...lyonKit(),
			team: { teamId: added.kit.team.id },
			kitType: 'away'
		});
		expect(await catalog.listPicturedKits()).toEqual([
			{ teamId: added.kit.team.id, season: '2023-24', kitType: 'home' }
		]);
	});

	it('runs no lookup for a save on an existing Kit', async () => {
		const first = await catalog.addJersey(token, { ...jersey, ...lyonKit() });
		calls = [];
		const kit = {
			team: { teamId: first.kit.team.id },
			season: '2023-24',
			kitType: 'home'
		} as const;
		const second = await catalog.addJersey(token, { ...jersey, ...kit });
		await catalog.editJersey(token, { ...jersey, ...kit, id: second.id, version: 'player' });
		await catalog.addWishlistItem(token, { ...kit, ...wish, addAnyway: true });
		expect(second.kit.id).toBe(first.kit.id);
		expect(calls).toEqual([]);
	});
});

describe('Kit Pictures', () => {
	const catalog = createCatalog(env);
	let token: string;
	let kit: number;

	const image = (size: number) => new Uint8Array(size).fill(7).buffer;

	async function clear() {
		await env.DB.batch([
			env.DB.prepare('DELETE FROM picture'),
			env.DB.prepare('DELETE FROM wishlist_item'),
			env.DB.prepare('DELETE FROM jersey'),
			env.DB.prepare('DELETE FROM kit'),
			env.DB.prepare('DELETE FROM team'),
			env.DB.prepare('DELETE FROM country'),
			env.DB.prepare('DELETE FROM league')
		]);
		const listed = await env.COVERS.list();
		await Promise.all(listed.objects.map((o) => env.COVERS.delete(o.key)));
	}

	beforeEach(async () => {
		await clear();
		kit = await insertKit({ team: 'Japan', kind: 'national', start: 2024, kitType: 'home' });
		const result = await catalog.login('test-password');
		if (!result.ok) throw new Error('login failed');
		token = result.token;
	});

	// Other describes delete Kits, which a Picture row would block.
	afterEach(clear);

	it('adds Pictures to a Kit with the next position and lists them in that order', async () => {
		expect(await catalog.listPictures(kit)).toEqual([]);
		const back = await catalog.addPicture(token, {
			kitId: kit,
			body: image(10),
			contentType: 'image/png'
		});
		const crest = await catalog.addPicture(token, {
			kitId: kit,
			body: image(20),
			contentType: 'image/webp'
		});
		expect(back.position).toBe(1);
		expect(crest.position).toBe(2);
		expect(await catalog.listPictures(kit)).toEqual([back, crest]);
		const other = await insertKit({
			team: 'Japan',
			kind: 'national',
			start: 2022,
			kitType: 'away'
		});
		expect(await catalog.listPictures(other)).toEqual([]);
	});

	it('serves a Picture image by its id', async () => {
		const added = await catalog.addPicture(token, {
			kitId: kit,
			body: image(10),
			contentType: 'image/webp'
		});
		const picture = await catalog.getPicture(added.id);
		expect(picture?.contentType).toBe('image/webp');
		expect((await new Response(picture!.body).arrayBuffer()).byteLength).toBe(10);
		expect(await catalog.getPicture(99999)).toBeNull();
	});

	it('refuses a Picture of another type, of 2 MB or more, empty, or for an unknown Kit', async () => {
		const add = (over: object) =>
			catalog.addPicture(token, { kitId: kit, body: image(10), contentType: 'image/png', ...over });
		await expect(add({ contentType: 'image/svg+xml' })).rejects.toThrow(
			'Use a JPEG, PNG or WebP image'
		);
		await expect(add({ body: image(2 * 1024 * 1024) })).rejects.toThrow(
			'The image must be under 2 MB'
		);
		await expect(add({ body: image(0) })).rejects.toThrow('The image must be under 2 MB');
		await expect(add({ kitId: 99999 })).rejects.toThrow('Unknown kit');
		expect(await catalog.listPictures(kit)).toEqual([]);
		expect((await env.COVERS.list()).objects).toEqual([]);
	});

	describe('from an address', () => {
		beforeEach(() => {
			vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
				const url = new URL(new Request(input as RequestInfo, init).url);
				if (url.host !== 'images.example') throw new Error(`Unexpected fetch to ${url.href}`);
				if (url.pathname === '/page.html') {
					return new Response('<html>', { headers: { 'content-type': 'text/html' } });
				}
				return new Response(new Uint8Array(10), { headers: { 'content-type': 'image/png' } });
			});
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('fetches the image and adds it as the next Picture', async () => {
			const added = await catalog.addPictureFromUrl(token, {
				kitId: kit,
				url: 'https://images.example/back.png'
			});
			expect(added.position).toBe(1);
			expect(await catalog.listPictures(kit)).toEqual([added]);
			const picture = await catalog.getPicture(added.id);
			expect(picture?.contentType).toBe('image/png');
		});

		it('refuses an address that is not an image, and adds nothing', async () => {
			await expect(
				catalog.addPictureFromUrl(token, { kitId: kit, url: 'https://images.example/page.html' })
			).rejects.toThrow('Use a JPEG, PNG or WebP image');
			expect(await catalog.listPictures(kit)).toEqual([]);
		});

		it('refuses to add a Picture from an address without a valid token', async () => {
			await expect(
				catalog.addPictureFromUrl('not-a-token', {
					kitId: kit,
					url: 'https://images.example/back.png'
				})
			).rejects.toMatchObject({ name: 'UnauthorizedError' });
		});
	});

	it('refuses to add a Picture without a valid token', async () => {
		await expect(
			catalog.addPicture('not-a-token', { kitId: kit, body: image(10), contentType: 'image/png' })
		).rejects.toMatchObject({ name: 'UnauthorizedError' });
		expect(await catalog.listPictures(kit)).toEqual([]);
	});
});

// --- Teams and Kits admin -------------------------------------------------------------

describe('Teams and Kits admin', () => {
	const catalog = createCatalog(env);
	let token: string;

	beforeEach(async () => {
		await env.DB.batch([
			env.DB.prepare('DELETE FROM wishlist_item'),
			env.DB.prepare('DELETE FROM jersey'),
			env.DB.prepare('DELETE FROM picture'),
			env.DB.prepare('DELETE FROM kit'),
			env.DB.prepare('DELETE FROM team'),
			env.DB.prepare('DELETE FROM country'),
			env.DB.prepare('DELETE FROM league')
		]);
		const result = await catalog.login('test-password');
		if (!result.ok) throw new Error('login failed');
		token = result.token;
	});

	it('lists every Kit by Team, Season and Kit Type, with its Main Picture', async () => {
		const lyonAway = await insertKit({ team: 'Lyon', start: 2023, end: 2024, kitType: 'away' });
		const japan = await insertKit({
			team: 'Japan',
			kind: 'national',
			start: 2022,
			kitType: 'home',
			mainPictureKey: 'main-pictures/x'
		});
		const lyonHome = await insertKit({ team: 'Lyon', start: 2023, end: 2024, kitType: 'home' });
		const lyonOld = await insertKit({ team: 'Lyon', start: 2021, end: 2022, kitType: 'third' });
		const kits = await catalog.listKits();
		expect(kits.map((k) => [k.id, k.team.name, k.season, k.kitType])).toEqual([
			[japan, 'Japan', '2022', 'home'],
			[lyonOld, 'Lyon', '2021-22', 'third'],
			[lyonHome, 'Lyon', '2023-24', 'home'],
			[lyonAway, 'Lyon', '2023-24', 'away']
		]);
		expect(kits[0].mainPictureKey).toBe('main-pictures/x');
		expect(kits[1].mainPictureKey).toBeNull();
		expect(kits[0].team).toMatchObject({ kind: 'national', country: { name: 'Country of Japan' } });
	});

	const country = (name: string, seasonFormat: 'split' | 'calendar') =>
		catalog.addCountry(token, {
			name,
			continent: 'europe',
			leagueName: `League of ${name}`,
			seasonFormat
		});

	const teamNamed = async (name: string) =>
		(await catalog.listTeams()).find((t) => t.name === name)!;

	it('renames a Team and changes its kind and Country', async () => {
		await insertKit({ team: 'Lyonn', start: 2023, end: 2024, kitType: 'home', country: 'France' });
		const spain = await country('Spain', 'split');
		const lyon = await teamNamed('Lyonn');
		const edited = await catalog.editTeam(token, {
			teamId: lyon.id,
			name: ' Lyon ',
			kind: 'club',
			countryId: spain.id
		});
		expect(edited).toEqual({
			id: lyon.id,
			name: 'Lyon',
			kind: 'club',
			seasonFormat: 'split',
			country: { id: spain.id, name: 'Spain', continent: 'europe' }
		});
		expect(await teamNamed('Lyon')).toEqual(edited);
		await insertKit({ team: 'La Roja', start: 2024, kitType: 'home' });
		const roja = await teamNamed('La Roja');
		const national = await catalog.editTeam(token, {
			teamId: roja.id,
			name: 'Spain',
			kind: 'national',
			countryId: spain.id
		});
		expect(national).toMatchObject({ kind: 'national', seasonFormat: 'calendar' });
	});

	it('refuses a Team name another Team has, in any case', async () => {
		await insertKit({ team: 'Lyon', start: 2023, end: 2024, kitType: 'home', country: 'France' });
		await insertKit({ team: 'Paris', start: 2023, end: 2024, kitType: 'home', country: 'France' });
		const paris = await teamNamed('Paris');
		const edit = (name: string) =>
			catalog.editTeam(token, {
				teamId: paris.id,
				name,
				kind: 'club',
				countryId: paris.country.id
			});
		await expect(edit('lyon')).rejects.toThrow('A team named “lyon” already exists');
		await expect(edit('  ')).rejects.toThrow('Team name is required');
		expect((await edit('PARIS')).name).toBe('PARIS');
	});

	it('refuses a second National Team for a Country', async () => {
		await insertKit({
			team: 'France',
			kind: 'national',
			start: 2024,
			kitType: 'home',
			country: 'France'
		});
		await insertKit({ team: 'Les Bleus', start: 2024, kitType: 'home', country: 'Elsewhere' });
		const france = await teamNamed('France');
		const bleus = await teamNamed('Les Bleus');
		await expect(
			catalog.editTeam(token, {
				teamId: bleus.id,
				name: 'Les Bleus',
				kind: 'national',
				countryId: france.country.id
			})
		).rejects.toThrow('France already has a National Team: France');
		expect(
			await catalog.editTeam(token, {
				teamId: france.id,
				name: 'France',
				kind: 'national',
				countryId: france.country.id
			})
		).toMatchObject({ kind: 'national' });
		expect(await teamNamed('Les Bleus')).toMatchObject({ kind: 'club' });
	});

	it('refuses an unknown Team, Country or kind', async () => {
		await insertKit({ team: 'Lyon', start: 2023, end: 2024, kitType: 'home', country: 'France' });
		const lyon = await teamNamed('Lyon');
		const input = {
			teamId: lyon.id,
			name: 'Lyon',
			kind: 'club',
			countryId: lyon.country.id
		} as const;
		await expect(catalog.editTeam(token, { ...input, teamId: 999999 })).rejects.toThrow(
			'Unknown team'
		);
		await expect(catalog.editTeam(token, { ...input, countryId: 999999 })).rejects.toThrow(
			'Unknown country'
		);
		await expect(catalog.editTeam(token, { ...input, kind: 'b-team' as never })).rejects.toThrow(
			'A team is a Club or a National Team'
		);
	});

	it('refuses a change while a Kit Season does not fit the new Season Format', async () => {
		await insertKit({ team: 'Lyon', start: 2023, end: 2024, kitType: 'home', country: 'France' });
		await insertKit({ team: 'Kobe', start: 2024, kitType: 'home', country: 'Japan' });
		const japan = (await teamNamed('Kobe')).country;
		const lyon = await teamNamed('Lyon');
		const move = { teamId: lyon.id, name: 'Lyon', kind: 'club', countryId: japan.id } as const;
		await expect(catalog.editTeam(token, move)).rejects.toThrow(
			'Lyon has a Kit of Season 2023-24, which does not fit the Calendar format'
		);
		await expect(
			catalog.editTeam(token, { ...move, kind: 'national', countryId: lyon.country.id })
		).rejects.toThrow('Lyon has a Kit of Season 2023-24, which does not fit the Calendar format');
		const kobe = await teamNamed('Kobe');
		await expect(
			catalog.editTeam(token, {
				...move,
				teamId: kobe.id,
				name: 'Kobe',
				countryId: lyon.country.id
			})
		).rejects.toThrow('Kobe has a Kit of Season 2024, which does not fit the Season format');
		expect(await teamNamed('Lyon')).toEqual(lyon);
	});

	it('converts the Kit Seasons of a Country Clubs when its Season Format changes', async () => {
		const league = 'Ligue 1';
		await insertKit({
			team: 'Lyon',
			start: 2023,
			end: 2024,
			kitType: 'home',
			country: 'France',
			league
		});
		await insertKit({
			team: 'Lyon',
			start: 2024,
			end: 2025,
			kitType: 'home',
			country: 'France',
			league
		});
		await insertKit({
			team: 'France',
			kind: 'national',
			start: 2024,
			kitType: 'home',
			country: 'France',
			league
		});
		const france = (await teamNamed('Lyon')).country;
		const edit = (seasonFormat: 'split' | 'calendar') =>
			catalog.editCountry(token, {
				id: france.id,
				name: 'France',
				continent: 'europe',
				leagueName: league,
				seasonFormat
			});
		const seasons = async () =>
			(await catalog.listKits()).map((k) => `${k.team.name} ${k.season}`).sort();
		expect((await edit('calendar')).league.seasonFormat).toBe('calendar');
		expect(await seasons()).toEqual(['France 2024', 'Lyon 2023', 'Lyon 2024']);
		expect((await edit('split')).league.seasonFormat).toBe('split');
		// The National Team keeps its one-year Season.
		expect(await seasons()).toEqual(['France 2024', 'Lyon 2023-24', 'Lyon 2024-25']);
	});

	it('changes a Kit Season and Kit Type, and its Jerseys and Wishlist Item follow', async () => {
		const kitId = await insertKit({ team: 'Lyon', start: 2023, end: 2024, kitType: 'home' });
		const jersey = await insertJersey(kitId, { date: '2024', storeId: 1 });
		const item = await insertWishlistItem(kitId, {});
		const edited = await catalog.editKit(token, { kitId, season: ' 2022-23 ', kitType: 'away' });
		expect(edited).toMatchObject({ id: kitId, season: '2022-23', kitType: 'away' });
		expect((await catalog.listKits())[0]).toEqual(edited);
		const [owned] = await catalog.listCollection();
		expect(owned).toMatchObject({ id: jersey, kit: { id: kitId, season: '2022-23' } });
		const [wanted] = await catalog.listWishlist();
		expect(wanted).toMatchObject({ id: item, kit: { id: kitId, kitType: 'away' } });
	});

	it('refuses a Kit change that would make two Kits with one Team, Season and Kit Type', async () => {
		await insertKit({ team: 'Lyon', start: 2023, end: 2024, kitType: 'home' });
		const away = await insertKit({ team: 'Lyon', start: 2023, end: 2024, kitType: 'away' });
		await expect(
			catalog.editKit(token, { kitId: away, season: '2023-24', kitType: 'home' })
		).rejects.toThrow('The Kit Lyon 2023-24 Home already exists');
		expect(
			await catalog.editKit(token, { kitId: away, season: '2023-24', kitType: 'away' })
		).toMatchObject({ id: away, kitType: 'away' });
	});

	it('refuses a Season out of the Team Season Format, a bad Kit Type or an unknown Kit', async () => {
		const lyon = await insertKit({ team: 'Lyon', start: 2023, end: 2024, kitType: 'home' });
		const japan = await insertKit({
			team: 'Japan',
			kind: 'national',
			start: 2024,
			kitType: 'home'
		});
		await expect(
			catalog.editKit(token, { kitId: lyon, season: '2024', kitType: 'home' })
		).rejects.toThrow('Season must be two years in a row, like 2024-25');
		await expect(
			catalog.editKit(token, { kitId: japan, season: '2024-25', kitType: 'home' })
		).rejects.toThrow('Season must be one year, like 2024');
		await expect(
			catalog.editKit(token, { kitId: lyon, season: '2023-24', kitType: 'goalkeeper' as never })
		).rejects.toThrow('Kit Type must be Home, Away, Third, Fourth, Cup or Special');
		await expect(
			catalog.editKit(token, { kitId: 999999, season: '2023-24', kitType: 'home' })
		).rejects.toThrow('Unknown kit');
		expect((await catalog.listKits()).map((k) => k.season)).toEqual(['2024', '2023-24']);
	});
});

describe('Import the sheet rows', () => {
	const catalog = createCatalog(env, { lookupIntervalMs: 0 });
	let token: string;
	let calls: string[];

	afterEach(() => {
		vi.restoreAllMocks();
	});

	beforeEach(async () => {
		calls = [];
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
			calls.push(new Request(input as RequestInfo, init).url);
			return Response.json(searchNone);
		});
		await env.DB.batch([
			env.DB.prepare('DELETE FROM picture'),
			env.DB.prepare('DELETE FROM wishlist_item'),
			env.DB.prepare('DELETE FROM jersey'),
			env.DB.prepare('DELETE FROM kit'),
			env.DB.prepare('DELETE FROM team'),
			env.DB.prepare('DELETE FROM country'),
			env.DB.prepare('DELETE FROM league'),
			env.DB.prepare("DELETE FROM store WHERE name != 'Official Store'")
		]);
		const result = await catalog.login('test-password');
		if (!result.ok) throw new Error('login failed');
		token = result.token;
	});

	const lyon = { name: 'Lyon', kind: 'club', country: 'France' } as const;
	const japan = { name: 'Japan', kind: 'national', country: 'Japan' } as const;

	function rows(): ImportRows {
		return {
			countries: [
				{ name: 'France', continent: 'europe', league: 'Ligue 1', seasonFormat: 'split' },
				{ name: 'Japan', continent: 'asia-oceania', league: 'J1 League', seasonFormat: 'calendar' }
			],
			jerseys: [
				{
					team: lyon,
					season: '2023-24',
					kitType: 'home',
					version: 'fan',
					size: 'M',
					fit: 'good',
					print: 'NICOLAS 4',
					acquisition: {
						kind: 'purchase',
						store: 'Taobao',
						priceCents: 1485,
						bought: '2023-11-02',
						sent: '2023-11-20',
						received: '2024-01-29'
					}
				},
				{
					team: lyon,
					season: '2023-24',
					kitType: 'home',
					version: 'player',
					size: null,
					fit: null,
					acquisition: {
						kind: 'purchase',
						store: 'official store',
						priceCents: null,
						bought: '2024'
					}
				},
				{
					team: japan,
					season: '2018',
					kitType: 'away',
					version: 'fan',
					size: 'L',
					fit: 'too-big',
					acquisition: { kind: 'gift', date: '2019' }
				}
			],
			wishlist: [
				{ team: japan, season: '2026', kitType: 'home', version: null },
				{
					team: { name: 'Marseille', kind: 'club', country: 'France' },
					season: '2026-27',
					kitType: 'home',
					version: 'player'
				}
			]
		};
	}

	it('creates the Countries, Leagues, Stores, Teams, Kits, Jerseys and Wishlist Items', async () => {
		const result = await catalog.importRows(token, rows());
		expect(result).toEqual({
			countries: 2,
			stores: 1,
			teams: 3,
			kits: 4,
			jerseys: 3,
			wishlistItems: 2
		});
		expect(calls).toEqual([]);

		expect(await catalog.listCountries()).toMatchObject([
			{ name: 'France', continent: 'europe', league: { name: 'Ligue 1', seasonFormat: 'split' } },
			{
				name: 'Japan',
				continent: 'asia-oceania',
				league: { name: 'J1 League', seasonFormat: 'calendar' }
			}
		]);
		expect((await catalog.listStores()).map((s) => s.name)).toEqual(['Official Store', 'Taobao']);
		expect((await catalog.listTeams()).map((t) => [t.name, t.kind, t.country.name])).toEqual([
			['Japan', 'national', 'Japan'],
			['Lyon', 'club', 'France'],
			['Marseille', 'club', 'France']
		]);

		const collection = await catalog.listCollection();
		const bought = collection.find((j) => j.print === 'NICOLAS 4')!;
		expect(bought).toMatchObject({
			version: 'fan',
			size: 'M',
			fit: 'good',
			kit: { season: '2023-24', kitType: 'home', team: { name: 'Lyon' } },
			acquisition: {
				kind: 'purchase',
				store: { name: 'Taobao' },
				priceCents: 1485,
				bought: '2023-11-02',
				sent: '2023-11-20',
				received: '2024-01-29'
			}
		});
		const unknownPrice = collection.find((j) => j.version === 'player')!;
		expect(unknownPrice).toMatchObject({
			size: null,
			fit: null,
			print: null,
			acquisition: {
				kind: 'purchase',
				store: { name: 'Official Store' },
				priceCents: null,
				bought: '2024'
			}
		});
		expect(unknownPrice.kit.id).toBe(bought.kit.id);
		const gift = collection.find((j) => j.kit.team.name === 'Japan')!;
		expect(gift.acquisition).toEqual({ kind: 'gift', date: '2019', giver: null });
		expect(gift.kit).toMatchObject({ season: '2018', kitType: 'away' });

		expect(
			(await catalog.listWishlist()).map((i) => [i.kit.team.name, i.kit.season, i.version])
		).toEqual([
			['Japan', '2026', null],
			['Marseille', '2026-27', 'player']
		]);
	});

	it('reuses the Countries, Stores and Teams that exist, matched by name in any case', async () => {
		await catalog.addCountry(token, {
			name: 'France',
			continent: 'europe',
			leagueName: 'Ligue 1 Uber Eats',
			seasonFormat: 'split'
		});
		await catalog.addStore(token, 'TAOBAO');
		const input = rows();
		input.countries[0].name = 'france';
		const result = await catalog.importRows(token, input);
		expect(result).toMatchObject({ countries: 1, stores: 0, teams: 3 });
		expect((await catalog.listCountries()).map((c) => [c.name, c.league.name])).toEqual([
			['France', 'Ligue 1 Uber Eats'],
			['Japan', 'J1 League']
		]);
		expect((await catalog.listStores()).map((s) => s.name)).toEqual(['Official Store', 'TAOBAO']);
	});

	it('names the bad row and saves nothing', async () => {
		const input = rows();
		input.jerseys[2].season = '2018-19';
		await expect(catalog.importRows(token, input)).rejects.toThrow(
			'jerseys[2]: Season must be one year, like 2024'
		);
		const wish = rows();
		wish.wishlist.push({ ...wish.wishlist[0], version: 'fan' });
		await expect(catalog.importRows(token, wish)).rejects.toThrow(
			'wishlist[2]: Japan 2026 Home is twice on the Wishlist'
		);
		const unknown = rows();
		unknown.jerseys[0].team = { name: 'Porto', kind: 'club', country: 'Portugal' };
		await expect(catalog.importRows(token, unknown)).rejects.toThrow(
			'jerseys[0]: Unknown country: Portugal'
		);
		expect(await catalog.listCountries()).toEqual([]);
		expect(await catalog.listTeams()).toEqual([]);
		expect((await catalog.listStores()).map((s) => s.name)).toEqual(['Official Store']);
	});

	it('checks the rows as the Jersey form does', async () => {
		const cases: [(input: ImportRows) => void, string][] = [
			[
				(r) => (r.jerseys[0].acquisition = { kind: 'gift', date: '2024-02-31' }),
				'jerseys[0]: Gift date is not a real date'
			],
			[
				(r) => (r.jerseys[1].version = 'retro' as never),
				'jerseys[1]: Version must be Fan, Player or Tracksuit'
			],
			[
				(r) => (r.wishlist[1].team = { name: 'Nippon', kind: 'national', country: 'Japan' }),
				'wishlist[1]: Japan already has a National Team: Japan'
			],
			[
				(r) => (r.countries[1].continent = 'asia' as never),
				'countries[1]: Continent must be one of'
			]
		];
		for (const [spoil, message] of cases) {
			const input = rows();
			spoil(input);
			await expect(catalog.importRows(token, input)).rejects.toThrow(message);
		}
		expect(await catalog.listCountries()).toEqual([]);
	});

	it('keeps a Purchase whose Store is unknown', async () => {
		const input = rows();
		input.jerseys[0].acquisition = {
			kind: 'purchase',
			store: null,
			priceCents: null,
			bought: '2018-07-12'
		};
		await catalog.importRows(token, input);
		const jersey = (await catalog.listCollection()).find((j) => j.print === 'NICOLAS 4')!;
		expect(jersey.acquisition).toMatchObject({ kind: 'purchase', store: null, priceCents: null });
	});

	it('refuses a Purchase with a price and no Store, naming the row', async () => {
		const input = rows();
		input.jerseys[1].acquisition = {
			kind: 'purchase',
			store: null,
			priceCents: 2500,
			bought: '2024'
		};
		await expect(catalog.importRows(token, input)).rejects.toThrow(
			'jerseys[1]: A Purchase with a price needs a Store'
		);
		expect(await catalog.listCountries()).toEqual([]);
	});

	it('is refused when the Collection already has a Jersey', async () => {
		await catalog.importRows(token, { ...rows(), wishlist: [] });
		await expect(catalog.importRows(token, rows())).rejects.toThrow('already has entries');
		expect(await catalog.listCollection()).toHaveLength(3);
	});

	it('is refused when the Wishlist already has an Item', async () => {
		await catalog.importRows(token, { ...rows(), jerseys: [] });
		await expect(catalog.importRows(token, rows())).rejects.toThrow('already has entries');
		expect(await catalog.listCollection()).toEqual([]);
	});

	it('is refused without a valid token', async () => {
		await expect(catalog.importRows('not-a-token', rows())).rejects.toMatchObject({
			name: 'UnauthorizedError'
		});
		expect(await catalog.listCountries()).toEqual([]);
	});
});

// --- Delete ---------------------------------------------------------------------------

describe('Delete', () => {
	const catalog = createCatalog(env);
	let token: string;

	async function clear() {
		await env.DB.batch([
			env.DB.prepare('DELETE FROM picture'),
			env.DB.prepare('DELETE FROM wishlist_item'),
			env.DB.prepare('DELETE FROM jersey'),
			env.DB.prepare('DELETE FROM kit'),
			env.DB.prepare('DELETE FROM team'),
			env.DB.prepare('DELETE FROM country'),
			env.DB.prepare('DELETE FROM league'),
			env.DB.prepare("DELETE FROM store WHERE name != 'Official Store'")
		]);
		const listed = await env.COVERS.list();
		await Promise.all(listed.objects.map((o) => env.COVERS.delete(o.key)));
	}

	beforeEach(async () => {
		await clear();
		const result = await catalog.login('test-password');
		if (!result.ok) throw new Error('login failed');
		token = result.token;
	});

	afterEach(clear);

	it('deletes a Jersey and keeps its Kit', async () => {
		const kitId = await insertKit({ team: 'Lyon', start: 2023, end: 2024, kitType: 'home' });
		const twice = await insertJersey(kitId, { date: '2024', storeId: 1 });
		const kept = await insertJersey(kitId, { date: '2023', storeId: 1 });
		await catalog.deleteJersey(token, twice);
		expect((await catalog.listCollection()).map((j) => j.id)).toEqual([kept]);
		await catalog.deleteJersey(token, kept);
		expect(await catalog.listCollection()).toEqual([]);
		expect((await catalog.listKits()).map((k) => k.id)).toEqual([kitId]);
		await expect(catalog.deleteJersey(token, kept)).rejects.toThrow('Unknown jersey');
	});

	it('deletes a Store no Purchase uses', async () => {
		const shop = await catalog.addStore(token, 'Kitbag');
		await catalog.deleteStore(token, shop.id);
		expect((await catalog.listStores()).map((s) => s.name)).toEqual(['Official Store']);
		await expect(catalog.deleteStore(token, shop.id)).rejects.toThrow('Unknown store');
	});

	it('refuses to delete a Store that Purchases use, or the Official Store', async () => {
		const shop = await catalog.addStore(token, 'Kitbag');
		const kitId = await insertKit({ team: 'Lyon', start: 2023, end: 2024, kitType: 'home' });
		await insertJersey(kitId, { date: '2024', storeId: shop.id });
		await expect(catalog.deleteStore(token, shop.id)).rejects.toThrow(
			'Kitbag is still used by 1 Purchase'
		);
		await insertJersey(kitId, { date: '2023', storeId: shop.id });
		await expect(catalog.deleteStore(token, shop.id)).rejects.toThrow(
			'Kitbag is still used by 2 Purchases'
		);
		await expect(catalog.deleteStore(token, 1)).rejects.toThrow(
			'The Official Store cannot be deleted'
		);
		expect((await catalog.listStores()).map((s) => s.name)).toEqual(['Kitbag', 'Official Store']);
	});

	const leagueCount = async () =>
		(await env.DB.prepare('SELECT count(*) AS n FROM league').first<{ n: number }>())!.n;

	it('deletes a Country no Team uses, with its League', async () => {
		const wales = await catalog.addCountry(token, {
			name: 'Wales',
			continent: 'europe',
			leagueName: 'Cymru Premier',
			seasonFormat: 'split'
		});
		await catalog.deleteCountry(token, wales.id);
		expect(await catalog.listCountries()).toEqual([]);
		expect(await leagueCount()).toBe(0);
		await expect(catalog.deleteCountry(token, wales.id)).rejects.toThrow('Unknown country');
	});

	it('refuses to delete a Country that Teams use', async () => {
		await insertKit({ team: 'Lyon', start: 2023, end: 2024, kitType: 'home', country: 'France' });
		await insertKit({ team: 'Paris', start: 2023, end: 2024, kitType: 'home', country: 'France' });
		const [france] = await catalog.listCountries();
		await expect(catalog.deleteCountry(token, france.id)).rejects.toThrow(
			'France is still used by 2 Teams'
		);
		expect(await catalog.listCountries()).toEqual([france]);
	});

	it('deletes a Team with no Kit, and refuses one with Kits', async () => {
		await insertKit({ team: 'Lyon', start: 2023, end: 2024, kitType: 'home', country: 'France' });
		await insertKit({ team: 'Lyon', start: 2023, end: 2024, kitType: 'away', country: 'France' });
		const [lyon] = await catalog.listTeams();
		await expect(catalog.deleteTeam(token, lyon.id)).rejects.toThrow(
			'Lyon is still used by 2 Kits'
		);
		await env.DB.prepare('DELETE FROM kit').run();
		await catalog.deleteTeam(token, lyon.id);
		expect(await catalog.listTeams()).toEqual([]);
		expect((await catalog.listCountries()).map((c) => c.name)).toEqual(['France']);
		await expect(catalog.deleteTeam(token, lyon.id)).rejects.toThrow('Unknown team');
	});

	const image = new Uint8Array(10).fill(7).buffer;
	const r2Keys = async () => (await env.COVERS.list()).objects.map((o) => o.key).sort();

	it('deletes a Kit with its Pictures and its Main Picture and Pictures in R2', async () => {
		const kitId = await insertKit({
			team: 'Japan',
			kind: 'national',
			start: 2024,
			kitType: 'home'
		});
		const other = await insertKit({
			team: 'Japan',
			kind: 'national',
			start: 2022,
			kitType: 'home'
		});
		await catalog.uploadMainPicture(token, { kitId, body: image, contentType: 'image/png' });
		await catalog.addPicture(token, { kitId, body: image, contentType: 'image/png' });
		await catalog.addPicture(token, { kitId, body: image, contentType: 'image/png' });
		const kept = await catalog.addPicture(token, {
			kitId: other,
			body: image,
			contentType: 'image/png'
		});
		await catalog.deleteKit(token, kitId);
		expect((await catalog.listKits()).map((k) => k.id)).toEqual([other]);
		expect(await catalog.listPictures(kitId)).toEqual([]);
		expect(await catalog.getMainPicture(kitId)).toBeNull();
		const left = await r2Keys();
		expect(left).toHaveLength(1);
		expect(left[0]).toMatch(`pictures/${other}/`);
		expect(await catalog.listPictures(other)).toEqual([kept]);
		await expect(catalog.deleteKit(token, kitId)).rejects.toThrow('Unknown kit');
	});

	it('refuses to delete a Kit that Jerseys or its Wishlist Item use', async () => {
		const kitId = await insertKit({ team: 'Lyon', start: 2023, end: 2024, kitType: 'home' });
		await catalog.uploadMainPicture(token, { kitId, body: image, contentType: 'image/png' });
		await insertJersey(kitId, { date: '2024', storeId: 1 });
		await insertJersey(kitId, { date: '2023', storeId: 1 });
		await expect(catalog.deleteKit(token, kitId)).rejects.toThrow(
			'Lyon 2023-24 Home is still used by 2 Jerseys'
		);
		const wanted = await insertKit({ team: 'Lyon', start: 2023, end: 2024, kitType: 'away' });
		await insertJersey(wanted, { date: '2024', storeId: 1 });
		await insertWishlistItem(wanted, {});
		await expect(catalog.deleteKit(token, wanted)).rejects.toThrow(
			'Lyon 2023-24 Away is still used by 1 Jersey and 1 Wishlist Item'
		);
		expect((await catalog.listKits()).map((k) => k.id)).toEqual([kitId, wanted]);
		expect(await r2Keys()).toEqual([`main-pictures/${kitId}`]);
	});

	it('deletes a Picture and its image in R2', async () => {
		const kitId = await insertKit({
			team: 'Japan',
			kind: 'national',
			start: 2024,
			kitType: 'home'
		});
		const wrong = await catalog.addPicture(token, { kitId, body: image, contentType: 'image/png' });
		const kept = await catalog.addPicture(token, { kitId, body: image, contentType: 'image/png' });
		expect(await r2Keys()).toHaveLength(2);
		await catalog.deletePicture(token, wrong.id);
		expect(await catalog.listPictures(kitId)).toEqual([kept]);
		expect(await catalog.getPicture(wrong.id)).toBeNull();
		expect(await r2Keys()).toHaveLength(1);
		expect(await catalog.getPicture(kept.id)).not.toBeNull();
		await expect(catalog.deletePicture(token, wrong.id)).rejects.toThrow('Unknown picture');
	});

	it('refuses every delete without a valid token, and deletes nothing', async () => {
		const kitId = await insertKit({ team: 'Lyon', start: 2023, end: 2024, kitType: 'home' });
		const jersey = await insertJersey(kitId, { date: '2024', storeId: 1 });
		const picture = await catalog.addPicture(token, {
			kitId,
			body: image,
			contentType: 'image/png'
		});
		const shop = await catalog.addStore(token, 'Kitbag');
		const [team] = await catalog.listTeams();
		const bad = 'not-a-token';
		const calls = [
			() => catalog.deleteJersey(bad, jersey),
			() => catalog.deleteKit(bad, kitId),
			() => catalog.deleteTeam(bad, team.id),
			() => catalog.deleteCountry(bad, team.country.id),
			() => catalog.deleteStore(bad, shop.id),
			() => catalog.deletePicture(bad, picture.id)
		];
		for (const call of calls) {
			await expect(call()).rejects.toMatchObject({ name: 'UnauthorizedError' });
		}
		expect(await catalog.listCollection()).toHaveLength(1);
		expect(await catalog.listPictures(kitId)).toEqual([picture]);
		expect(await catalog.listStores()).toHaveLength(2);
	});
});
