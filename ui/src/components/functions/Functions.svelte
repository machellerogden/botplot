<script>
    import { functions } from '../../stores.js';
    import Fn from './Fn.svelte';
</script>

{#each $functions as fn (fn.name)}
    <Fn {fn} />
{/each}
