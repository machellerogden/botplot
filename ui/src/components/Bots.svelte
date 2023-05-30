<script>

    import { Link } from 'svelte-navigator';
    import { onMount } from 'svelte';
    import { fade, fly } from 'svelte/transition';
    import { quintInOut } from 'svelte/easing';
    import { getBots, deleteBot, copyBot } from '../api.js';
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    let bots = [];
    let selected = {};

    export async function load() {
        try {
            bots = await getBots();
            dispatch('load', bots);
        } catch (error) {
            dispatch('error', error);
            bots = [];
        }
    }

    onMount(load);

</script>

<ul>
    {#each bots as bot (bot.id)}
        {@const isSelected = selected?.id === bot.id}
        <li class="outline-0 mb-4 flex hover:bg-gray-100 rounded-lg"
            class:bg-gray-100={isSelected}
        >
            <button
                class="outline-0 w-full flex flex-col rounded-lg p-3 text-left"
                on:click={() => {
                    dispatch('select', bot);
                }}
            >
                <span
                    class="text-lg text-gray-800"
                    class:text-secondary={isSelected}
                >
                    {bot.ka}
                </span>
                <div>
                <span
                    class="text-xs font-mono text-gray-400 lowercase pr-2"
                    class:text-gray-900={isSelected}
                >
                    {bot.aka}
                </span>
                {#if isSelected}
                    <span
                        transition:fade|local={{ duration: 200, easing: quintInOut }}
                        class="text-xs font-mono text-gray-400 lowercase transition ease-in-out delay-150"
                    >
                        {bot.as_of}
                    </span>
                {/if}
                </div>
            </button>
            {#if isSelected}
                <div
                    class="grid grid-cols-1 gap-1.5 p-2 justify-items-end"
                    transition:fade|local={{ duration: 200, easing: quintInOut }}
                >
                    <button
                        class="outline-0 flex rounded-md px-1 truncate bg-danger-100 hover:bg-danger text-danger hover:text-white place-items-center w-5"
                        on:click={async () => {
                            await deleteBot(bot.id);
                            dispatch('delete', bot);
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3">
                            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                        </svg>
                    </button>
                    <button
                        class="outline-0 flex rounded-md px-1 truncate bg-secondary-100 hover:bg-secondary text-secondary hover:text-white place-items-center w-5"
                        on:click={async () => {
                            const newBot = await copyBot(bot.id);
                            dispatch('create', newBot);
                        }}
                    >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3">
                        <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
                        <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
                    </svg>
                    </button>
                </div>
            {/if}
        </li>
    {/each}
</ul>
