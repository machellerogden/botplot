<script>
    export let open = false;
</script>

<div class="flex flex-col py-3 border-t border-gray-300 place-items-stretch">
    <button class="text-left" on:click={() => { open = !open; }}>
        <slot name="heading"></slot>
    </button>
    <div
        class:h-0={!open}
        class:overflow-hidden={!open}
    >
        <slot name="content"></slot>
    </div>
</div>
