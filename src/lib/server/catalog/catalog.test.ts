import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCatalog } from './index';

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
		const calls = [
			() => catalog.addStore(bad, 'Shop'),
			() => catalog.renameStore(bad, 1, 'Shop'),
			() => catalog.listKitsWithoutCover(bad),
			() =>
				catalog.uploadCover(bad, { kitId: 1, body: new ArrayBuffer(1), contentType: 'image/png' }),
			() => catalog.uploadCoverFromUrl(bad, { kitId: 1, url: 'https://images.example/a.png' })
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

// --- Kit Covers ---------------------------------------------------------------

/** No Kit create path exists yet: Kits are inserted straight into D1. */
async function insertKit(kit: {
	team: string;
	kind?: 'club' | 'national';
	start: number;
	end?: number;
	kitType: string;
	coverKey?: string;
}) {
	const country = `Country of ${kit.team}`;
	await env.DB.batch([
		env.DB.prepare(
			'INSERT OR IGNORE INTO league (id, name, season_format) VALUES ((SELECT id FROM league WHERE name = ?1), ?1, ?2)'
		).bind(`League of ${kit.team}`, kit.end ? 'split' : 'calendar'),
		env.DB.prepare(
			"INSERT OR IGNORE INTO country (name, continent, league_id) VALUES (?1, 'europe', (SELECT id FROM league WHERE name = ?2))"
		).bind(country, `League of ${kit.team}`),
		env.DB.prepare(
			'INSERT OR IGNORE INTO team (name, kind, country_id) VALUES (?1, ?2, (SELECT id FROM country WHERE name = ?3))'
		).bind(kit.team, kit.kind ?? 'club', country)
	]);
	const row = await env.DB.prepare(
		'INSERT INTO kit (team_id, season_start_year, season_end_year, kit_type, cover_key) VALUES ((SELECT id FROM team WHERE name = ?1), ?2, ?3, ?4, ?5) RETURNING id'
	)
		.bind(kit.team, kit.start, kit.end ?? null, kit.kitType, kit.coverKey ?? null)
		.first<{ id: number }>();
	return row!.id;
}

/** The Cover fields of a Kit, read from D1: no Catalog read returns them yet. */
const coverOf = (kitId: number) =>
	env.DB.prepare('SELECT cover_key, cover_version, cover_chosen FROM kit WHERE id = ?')
		.bind(kitId)
		.first<{ cover_key: string | null; cover_version: number; cover_chosen: number }>();

describe('Kit Covers', () => {
	const catalog = createCatalog(env);
	let token: string;

	beforeEach(async () => {
		await env.DB.batch([
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

	it('lists the Kits with no Cover by Team, then Season, with the Season formatted', async () => {
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
			coverKey: 'covers/x'
		});
		expect(await catalog.listKitsWithoutCover(token)).toEqual([
			{ id: japan, teamName: 'Japan', season: '2024', kitType: 'home' },
			{ id: home, teamName: 'Olympique Lyonnais', season: '1999-00', kitType: 'home' },
			{ id: away, teamName: 'Olympique Lyonnais', season: '2023-24', kitType: 'away' }
		]);
	});

	const image = (size: number) => new Uint8Array(size).fill(7).buffer;

	it('uploads a Cover to R2, marks it chosen, bumps its version and serves it', async () => {
		const kit = await insertKit({ team: 'Japan', kind: 'national', start: 2024, kitType: 'home' });
		expect(await catalog.getCover(kit)).toBeNull();
		await catalog.uploadCover(token, { kitId: kit, body: image(10), contentType: 'image/png' });
		expect(await coverOf(kit)).toEqual({
			cover_key: `covers/${kit}`,
			cover_version: 1,
			cover_chosen: 1
		});
		const cover = await catalog.getCover(kit);
		expect(cover?.contentType).toBe('image/png');
		expect((await new Response(cover!.body).arrayBuffer()).byteLength).toBe(10);
		expect(await catalog.listKitsWithoutCover(token)).toEqual([]);

		await catalog.uploadCover(token, { kitId: kit, body: image(20), contentType: 'image/webp' });
		expect((await coverOf(kit))?.cover_version).toBe(2);
		expect((await catalog.getCover(kit))?.contentType).toBe('image/webp');
		expect(await catalog.getCover(99999)).toBeNull();
	});

	it('refuses an upload of another type, of 2 MB or more, empty, or for an unknown Kit', async () => {
		const kit = await insertKit({ team: 'Japan', kind: 'national', start: 2024, kitType: 'home' });
		const upload = (over: object) =>
			catalog.uploadCover(token, {
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
		expect(await coverOf(kit)).toEqual({ cover_key: null, cover_version: 0, cover_chosen: 0 });
		await upload({ body: image(2 * 1024 * 1024 - 1), contentType: 'image/jpeg' });
		expect((await coverOf(kit))?.cover_chosen).toBe(1);
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

		const paste = (kitId: number, url: string) => catalog.uploadCoverFromUrl(token, { kitId, url });

		it('fetches the image and stores it as a chosen Cover with a new version', async () => {
			const kit = await insertKit({
				team: 'Japan',
				kind: 'national',
				start: 2024,
				kitType: 'home'
			});
			await paste(kit, 'https://images.example/kit.webp');
			expect(await coverOf(kit)).toEqual({
				cover_key: `covers/${kit}`,
				cover_version: 1,
				cover_chosen: 1
			});
			const cover = await catalog.getCover(kit);
			expect(cover?.contentType).toBe('image/webp');
			expect(await new Response(cover!.body).text()).toBe('url-bytes');
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
			expect(await coverOf(kit)).toEqual({ cover_key: null, cover_version: 0, cover_chosen: 0 });
		});
	});
});
