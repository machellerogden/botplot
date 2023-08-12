<script>
    import { createEventDispatcher, tick } from 'svelte';
    import { getMessageList, patchMessage, insertMessage, patchBot } from '../api.js';

    const dispatch = createEventDispatcher();

    export let id;
    export let bot_id;

    let messages = [];

    /**
     * load the messages
     */
    async function load(id) {
        if (id) {
            try {
                const msgs = await getMessageList(id);
                messages = msgs.reverse();
                dispatch('load', messages);
                console.log(`prelude messages loaded`, messages);
            } catch (error) {
                messages = [];
                console.error(`error loading prelude messages`, error);
                dispatch('error', error);
            }
        }
    }
    $: load(id);

    /*
    async function newPrelude() {
        await patchBot(id, { prelude_id: null });
    }
    */
    async function addMessage(role, name, content) {
        try {
            const parent_id = messages.at(-1)?.id;
            const new_message = await insertMessage({ parent_id, role, name, content });
            const { id:prelude_id } = new_message;
            await patchBot(bot_id, { prelude_id });
            dispatch('message_added', new_message);
            messages = [ ...messages, new_message ];
            await tick();
            draftContent = '';
        } catch (error) {
            console.error(`error adding prelude messages`, error);
            dispatch('error', error);
        }
    }

    async function removeMessage(message, i) {
        try {
            await patchBot(bot_id, { prelude_id: messages[i - 1]?.id ?? '' });
            messages = messages.filter(m => m.id !== message.id);
            dispatch('message_removed', message);
        } catch (error) {
            console.error(`error removing prelude messages`, error);
            dispatch('error', error);
        }
    }

    let draftRole = 'system';
    let draftName;
    let draftContent = '';

</script>

{#each (messages || []) as message, i}
    <div class="flex place-items-start">
        <button
            class="pt-1 pr-2 hover:text-danger"
            on:click={async () => removeMessage(message, i)}
        >
            <svg fill="currentColor" class="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0Z"/><path d="M7 11v2h10v-2H7Zm5-9C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10 -4.48-10-10-10Zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8 -3.59 8-8 8Z"/></svg>
        </button>
        <div>
            <div class="text-black">{message.role}</div>
            <div class="text-gray-400">{message.id}</div>
            <div class="text-gray-400">{message.parent_id}</div>
            {#if ['user','function'].includes(message.role) && message.name}
                <div class="text-gray-700">{message.name}</div>
            {/if}
            <div class="text-gray-900 font-mono whitespace-pre-wrap mb-2">{message.content}</div>
        </div>
    </div>
{/each}


<div class="flex flex-col text-xs">

    <textarea
        on:keyup|stopPropagation
        class="outline-0 rounded-lg border border-gray bg-gray-200 p-0.5 font-mono text-xxs whitespace-pre-wrap mb-2"
        id="content"
        bind:value={draftContent}
    />

    <div class="flex grow">

        <div class="flex grow place-items-center border border-gray-300 rounded-lg py-1 px-2">
            <label for="message-role" class="pe-2 font-mono">role</label>
            <select
                id="message-role"
                on:keyup|stopPropagation
                class="outline-0 border-1 rounded-lg border border-gray bg-gray-200 p-0.5 text-xxs"
                bind:value={draftRole}
            >
                <option value="user">user</option>
                <option value="system">system</option>
                <option value="assistant">assistant</option>
                <option value="function">function</option>
            </select>
        </div>

        {#if [ 'user', 'function' ].includes(draftRole)}
            <div class="flex place-items-center border border-gray-300 rounded-lg py-1 px-2 ml-3">
                <label for="message-name" class="pe-2 font-mono">name</label>
                <input
                    id="message-name"
                    type="text"
                    on:keyup|stopPropagation
                    class="outline-0 border-1 rounded-lg border border-gray bg-gray-200 p-0.5 w-14 text-xxs truncate"
                    bind:value={draftName}
                />
            </div>
        {/if}

        <button
            class="border border-secondary bg-secondary-100 rounded-lg p-1 ml-3 w-[5ch]"
            on:click={() => addMessage(draftRole, draftName, draftContent)}
        >
            add
        </button>

    </div>

</div>
