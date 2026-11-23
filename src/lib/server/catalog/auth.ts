const encoder = new TextEncoder();
const TOKEN_LIFETIME_SECONDS = 60 * 60 * 24 * 90;

export class UnauthorizedError extends Error {
	override name = 'UnauthorizedError' as const;
	constructor() {
		super('Owner login required');
	}
}

function toBase64Url(bytes: Uint8Array): string {
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
	const padded = text.replaceAll('-', '+').replaceAll('_', '/');
	const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
	return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function hmacKey(secret: string, usage: KeyUsage) {
	return crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		[usage]
	);
}

export async function passwordMatches(given: string, expected: string): Promise<boolean> {
	const [a, b] = await Promise.all([
		crypto.subtle.digest('SHA-256', encoder.encode(given)),
		crypto.subtle.digest('SHA-256', encoder.encode(expected))
	]);
	// Workers extension, missing from the DOM typings and from Node (`vite dev`).
	const subtle = crypto.subtle as SubtleCrypto & {
		timingSafeEqual?(a: BufferSource, b: BufferSource): boolean;
	};
	if (subtle.timingSafeEqual) return subtle.timingSafeEqual(a, b);
	// Both are 32-byte digests: compare every byte, whatever differs.
	const x = new Uint8Array(a);
	const y = new Uint8Array(b);
	let diff = 0;
	for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
	return diff === 0;
}

/** HS256 JWT signed with the Worker secret. */
export async function issueToken(secret: string): Promise<string> {
	const head = toBase64Url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
	const now = Math.floor(Date.now() / 1000);
	const body = toBase64Url(
		encoder.encode(JSON.stringify({ sub: 'owner', iat: now, exp: now + TOKEN_LIFETIME_SECONDS }))
	);
	const signature = await crypto.subtle.sign(
		'HMAC',
		await hmacKey(secret, 'sign'),
		encoder.encode(`${head}.${body}`)
	);
	return `${head}.${body}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function tokenIsValid(token: string, secret: string): Promise<boolean> {
	try {
		const parts = token.split('.');
		if (parts.length !== 3) return false;
		const [head, body, signature] = parts;
		const header = JSON.parse(new TextDecoder().decode(fromBase64Url(head)));
		if (header.alg !== 'HS256') return false;
		const ok = await crypto.subtle.verify(
			'HMAC',
			await hmacKey(secret, 'verify'),
			fromBase64Url(signature),
			encoder.encode(`${head}.${body}`)
		);
		if (!ok) return false;
		const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
		return typeof payload.exp === 'number' && payload.exp > Date.now() / 1000;
	} catch {
		return false;
	}
}
