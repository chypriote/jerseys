#!/usr/bin/env node
// Sends the cleaned sheet rows to the app, once. Main Pictures come later ("Look up pictures").
//
//   JERSEYS_URL=https://... OWNER_PASSWORD=... node scripts/import.mjs import/rows.json
//
// JERSEYS_URL defaults to the dev server (http://localhost:5173).
import { readFile } from 'node:fs/promises';

const file = process.argv[2];
const base = (process.env.JERSEYS_URL ?? 'http://localhost:5173').replace(/\/$/, '');
const password = process.env.OWNER_PASSWORD;

if (!password) fail('Set OWNER_PASSWORD');
if (!file) fail('Usage: import.mjs import/rows.json');

function fail(message) {
	console.error(message);
	process.exit(1);
}

// The form action answers JSON with this header, and sets the Owner cookie on that answer.
const login = await fetch(`${base}/login`, {
	method: 'POST',
	headers: {
		'content-type': 'application/x-www-form-urlencoded',
		'x-sveltekit-action': 'true',
		origin: base
	},
	body: new URLSearchParams({ password }),
	redirect: 'manual'
});
const cookie = login.headers
	.getSetCookie()
	.map((c) => c.split(';')[0])
	.find((c) => c.startsWith('owner='));
if (!cookie) fail(`Login failed: ${login.status} ${await login.text()}`);

const response = await fetch(`${base}/api/import/rows`, {
	method: 'POST',
	headers: { 'content-type': 'application/json', origin: base, cookie },
	body: await readFile(file, 'utf8')
});
if (!response.ok) fail(`Import failed: ${response.status} ${await response.text()}`);
console.log('Imported', await response.json());
