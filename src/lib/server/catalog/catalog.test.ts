import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
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
});
