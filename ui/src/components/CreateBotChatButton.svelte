<script>
    import { newBotChat } from '../api.js';
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();

    export let bot_id;

    async function createBotChat(bot_id) {
        if (bot_id) {
            const chat = await newBotChat({ bot_id });
            dispatch('create', chat);
        }
    }

</script>

<button
    class="flex bg-gray-200 hover:bg-secondary text-black hover:text-white px-2 py-1 text-sm w-full"
    on:click={async () => createBotChat(bot_id)}
>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
        <path d="M10.75 6.75a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" />
    </svg>

    <span class="ml-1">new chat</span>
</button>
