<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { LookupProgress } from '#lib/server/catalog/types';
	import Button from './Button.svelte';

	let progress = $state<LookupProgress | null>(null);
	let rerun = $state(false);
	let running = $state(false);
	let error = $state<string | null>(null);

	/** One batch per request, until every Kit is looked up. */
	async function runLookup() {
		running = true;
		error = null;
		progress = null;
		try {
			let after: number | undefined;
			while (true) {
				const before = progress?.done ?? -1;
				const response = await fetch('/api/main-pictures/lookup', {
					method: 'POST',
					body: JSON.stringify({ rerun, after })
				});
				if (!response.ok) {
					error = ((await response.json()) as { error?: string }).error ?? 'The lookup failed';
					return;
				}
				progress = (await response.json()) as LookupProgress;
				after = progress.after;
				if (progress.rateLimited) {
					error = 'TheSportsDB asked to slow down. Try again in a minute.';
					return;
				}
				if (progress.done >= progress.total) break;
				if (progress.done <= before) {
					error = 'The lookup made no progress';
					return;
				}
			}
		} catch {
			error = 'Network error';
		} finally {
			running = false;
			await invalidateAll();
		}
	}
</script>

<div class="flex flex-col gap-2">
	<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
		<Button intent="success" loading={running} onclick={runLookup}>Look up pictures</Button>
		<label class="flex items-center gap-2 text-sm font-medium">
			<input
				type="checkbox"
				class="size-5 accent-primary"
				bind:checked={rerun}
				disabled={running}
			/>
			Also redo pictures I did not choose
		</label>
	</div>
	{#if progress}
		<p class="text-sm font-medium" aria-live="polite">
			Looked up {progress.done} of {progress.total}
		</p>
	{/if}
	{#if error}
		<p class="text-sm text-destructive" role="alert">{error}</p>
	{/if}
</div>
