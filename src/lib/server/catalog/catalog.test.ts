import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCatalog } from './index';
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
				})
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
			'Season Format must be Split or Calendar'
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
		await expect(upload({ kitId: 99999 })).rejects.toThrow('Kit not found');
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
			await expect(paste(99999, 'https://images.example/kit.webp')).rejects.toThrow(
				'Kit not found'
			);
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
		await expect(pick(equipmentUrl('ok'), 99999)).rejects.toThrow('Kit not found');
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
		await expect(catalog.listPictureCandidates(token, 99999)).rejects.toThrow('Kit not found');
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

	describe('lookup in batches', () => {
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

describe('Add and edit a Jersey', () => {
	const catalog = createCatalog(env);
	let token: string;
	let france: number;

	const purchase = {
		kind: 'purchase',
		storeId: 1,
		priceCents: 8990,
		bought: '2024-05-12'
	} as const;
	const jersey = { version: 'fan', size: 'M', fit: 'good', acquisition: purchase } as const;

	beforeEach(async () => {
		await env.DB.batch([
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
		).rejects.toThrow('Jersey not found');
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
