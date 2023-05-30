<script>
    export let value = false;
    export let ping = false;
</script>

<button
    class="flex relative h-[14px] w-7 rounded-full p-0.5"
    class:bg-secondary-200={!value}
    class:bg-success-200={value}
    class:place-content-end={value}
    class:place-content-start={!value}
    on:click={() => { value = !value; }}>
    <span
        class="absolute inline-flex h-2.5 w-2.5 rounded-full opacity-75"
        class:bg-secondary={!value}
        class:bg-success={value}
        class:animate-ping={ping && value}
    ></span>
    <span
        class="relative inline-flex rounded-full h-2.5 w-2.5"
        class:bg-success={value}
    ></span>
</button>
