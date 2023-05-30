<script>
    export let fn;
</script>

{#if fn}
    <div class="flex flex-col p-2 bg-gray-200 font-mono rounded-lg">
        <span class="font-bold">{fn.name}</span>
        <span>{fn.description}</span>
        <span class="whitespace-pre-wrap">
            {JSON.stringify(fn.parameters, null, 4)}
        </span>
    </div>
{/if}
