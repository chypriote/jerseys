import { fileURLToPath } from 'node:url';
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-cloudflare';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	// `#lib/x` -> src/lib/x, with no file extension (tsconfig `paths` does the same for types).
	resolve: { alias: { '#lib': fileURLToPath(new URL('./src/lib', import.meta.url)) } },
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	]
});
