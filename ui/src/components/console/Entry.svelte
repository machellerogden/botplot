<script>
    export let entry;
</script>

{#if entry != null}
  <div class="border-b py-2 whitespace-pre-wrap font-mono text-xs">
      {
          typeof entry === 'string'     ? entry
        : entry instanceof MessageEvent ? entry.data
        : entry instanceof CustomEvent  ? JSON.stringify(entry.detail, null, 4)
        :                                 JSON.stringify(entry, null, 4)
      }
  </div>
{/if}
