<script lang="ts">
	let {
		tone,
		label,
		value
	}: {
		tone: 'highlight' | 'success' | 'info';
		label: string;
		/** Already formatted ("67", "4 120,00 €"). */
		value: string;
	} = $props();

	const toneClass = { highlight: 'bg-highlight', success: 'bg-success', info: 'bg-info' };
</script>

<span
	class="inline-flex items-center gap-1 rounded-control px-3 py-1 text-sm whitespace-nowrap text-secondary-foreground shadow-(--shadow-raised) {toneClass[
		tone
	]}"
>
	<span class="font-extrabold">{value}</span>
	<span class="font-bold">{label}</span>
</span>
