<script lang="ts">
	let { class: className = '' }: { class?: string } = $props();
</script>

<!-- tile.placeholder: shown when a Kit has no Main Picture, or it fails to load. -->
<svg aria-hidden="true" viewBox="0 0 100 100" class="text-muted-foreground {className}">
	<path
		d="M30 12 L42 8 Q50 15 58 8 L70 12 L91 29 L80 42 L72 35 L72 92 L28 92 L28 35 L20 42 L9 29 Z"
		fill="none"
		stroke="currentColor"
		stroke-width="3"
		stroke-linejoin="round"
	/>
</svg>
