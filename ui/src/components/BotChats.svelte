<script>

    import { Link } from 'svelte-navigator';
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    import { quintInOut } from 'svelte/easing';
    import { getBotChats, newBotChat, deleteBotChat, copyBotChat, patchBotChat } from '../api.js';
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    export let bot_id;
    export let selected_chat_id;

    let chats = [];

    export async function load(bot_id) {
        if (bot_id) {
            console.log(`getting bot chats for bot_id:`, bot_id);
            try {
                chats = await getBotChats(bot_id) ?? [];
                dispatch('load', chats);
                console.log(`bot chats loaded`, chats);
            } catch (error) {
                console.log('error loading bot chats', error);
                chats = [];
            }
        }
    }

    $: load(bot_id);

    let draftLabel = '';

    $: resetFormValues(chats, selected_chat_id);

    function resetFormValues(chats, selected_chat_id) {
        draftLabel = chats.find(c => c.id === selected_chat_id)?.label ?? '';
    }

</script>

<ul>
    {#each chats as chat (chat.id)}
        {@const isSelected = selected_chat_id === chat.id}
        <li class="outline-0 mb-4 flex hover:bg-gray-100 rounded-lg"
            class:bg-gray-100={isSelected}
        >
            <button
                class="outline-0 w-full flex flex-col rounded-lg p-3 text-left"
                on:click={() => {
                    if (selected_chat_id !== chat.id) {
                        dispatch('select', chat);
                        selected_chat_id = chat?.id;
                    }
                }}
            >
                {#if isSelected}
                    <input
                        on:focus|stopPropagation
                        on:click|stopPropagation
                        on:keyup|stopPropagation
                        class="outline-0 truncate py-1 text-lg mb-1 bg-gray-100 focus:mb-0.5 focus:border-b-2 focus:border-b-secondary"
                        placeholder="give your chat a name"
                        on:blur={async event => {
                            await patchBotChat(chat.id, { label: event.target.value });
                            dispatch('update', chat);
                        }}
                        bind:value={draftLabel}
                    />
                {:else}
                    <span
                        class="text-lg text-gray-800"
                        class:text-secondary={isSelected}
                    >
                        {chat.label}
                    </span>
                {/if}
                <div>
                {#if isSelected}
                    <span
                        class="text-xs font-mono text-gray-400 lowercase"
                    >
                        {chat.as_of}
                    </span>
                {/if}
                </div>
            </button>
            {#if isSelected}
                <div
                    class="grid grid-cols-1 gap-2 p-2 justify-items-end"
                >
                    <button
                        class="outline-0 flex rounded-md px-1 truncate bg-danger-100 hover:bg-danger text-danger hover:text-white place-items-center w-5"
                        on:click={async () => {
                            await deleteBotChat(chat.id);
                            dispatch('delete', chat);
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3 h-3">
                            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                        </svg>
                    </button>
                    <button
                        class="outline-0 flex rounded-md px-1 truncate bg-secondary-100 hover:bg-secondary text-secondary hover:text-white place-items-center w-5"
                        on:click={async () => {
                            dispatch('create', await copyBotChat(chat.id));
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
