import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
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
		const calls = [() => catalog.addStore(bad, 'Shop'), () => catalog.renameStore(bad, 1, 'Shop')];
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
