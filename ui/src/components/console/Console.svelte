<script>
    import Entry from './Entry.svelte';

    export let log = { subscribe(){}, set(){} };
    export let event = { subscribe(){}, set(){} };

    let entries = [];

    $: { if ($log   != null) entries = [ ...entries, $log ]; };
    $: { if ($event != null) entries = [ ...entries, $event ]; };

</script>

{#each entries as entry}
    <Entry {entry} />
{/each}
