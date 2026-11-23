import type { Cookies } from '@sveltejs/kit';

export const OWNER_COOKIE = 'owner';
const NINETY_DAYS = 60 * 60 * 24 * 90;

/** The Owner token from the cookie, or '' for a Viewer. Pass it to every Catalog write. */
export function ownerToken(cookies: Cookies): string {
	return cookies.get(OWNER_COOKIE) ?? '';
}

export function setOwnerToken(cookies: Cookies, token: string, secure: boolean) {
	cookies.set(OWNER_COOKIE, token, {
		path: '/',
		httpOnly: true,
		secure,
		sameSite: 'lax',
		maxAge: NINETY_DAYS
	});
}
