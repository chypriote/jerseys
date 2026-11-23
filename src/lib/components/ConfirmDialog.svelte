<script lang="ts">
	import * as AlertDialog from './ui/alert-dialog/index.js';

	let {
		open = $bindable(false),
		title,
		text,
		actionLabel,
		onConfirm
	}: {
		open?: boolean;
		title: string;
		text: string;
		actionLabel: string;
		onConfirm: () => void;
	} = $props();

	function confirm() {
		open = false;
		onConfirm();
	}
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{title}</AlertDialog.Title>
			<AlertDialog.Description>{text}</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<!-- The bits-ui Action does not close the dialog by itself. -->
			<AlertDialog.Action onclick={confirm}>{actionLabel}</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
