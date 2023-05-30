<script>

    import { onMount, tick } from 'svelte';
    import { debounce } from '../util.js';
    import { getBotChat, getBotMessages, getMessageList, newBotChat } from '../api.js';
    import Markdown from './markdown/Markdown.svelte';
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    export let chat;
    export let message_id;

    let messages = [];

    /**
     * load the messages
     */
    export async function load(message_id) {
        if (message_id) {
            try {
                messages = await getBotMessages(message_id);
                dispatch('load', messages);
            } catch (error) {
                messages = [];
                dispatch('error', error);
            }
        }
    }

    $: load(message_id);

    $: lastIndex = (messages?.length ?? 1) - 1;

    let containerNode;

    const updateScrollPosition = debounce(() => containerNode.lastElementChild.scrollIntoView(), 100);

    onMount(async () => {
        containerNode.addEventListener('DOMNodeInserted', updateScrollPosition, false);
        return () => containerNode.removeEventListener('DOMNodeInserted', updateScrollPosition, false);
    });

    const toNewChat = async message => {
        if (!chat) return console.error('missing chat context');
        try {
            const {
                // strip data we don't want to copy
                id, as_of, message_id, label, prompt_token, completion_tokens, total_tokens,
                ...request
            } = chat;
            request.label = `fork of ${label}`;
            request.message_id = message.id;
            const newChat = await newBotChat(request);
            console.log(`POST new chat result`, newChat);
            dispatch('chat-create', newChat);
        } catch (error) {
            console.error(`error posting new chat`, error);
        }
    };

    const transcribe = message => dispatch('transcribe-request', { content: message.content })

    async function copyToClipboard(message) {
        try {
            await navigator.clipboard.writeText(message.content);
            console.log( `copied message to clipboard`, message.content);
        } catch (error) {
            console.error(`error copying message to clipboard`, error);
        }
    }

    const message_state = {};

</script>

<div bind:this={containerNode} class="flex flex-col px-2 overflow-y-auto px-8 pt-2 pb-8 place-items-center">
    {#each messages as message, i (message.id)}
        {@const user = message.role === 'user'}
        {@const system = message.role === 'system'}
        {@const assistant = message.role === 'assistant'}
        {@const fn = message.role === 'function'}
        {@const has_fn = !!message.function_call?.name}
        {@const animate = i === lastIndex ?? 0}
        <div
            class="chat-bubble p-4 my-6 text-black"
            class:chat-animate={animate}
            class:chat-system={system || fn}
            class:chat-user={user}
            class:chat-assistant={assistant}
        >
            <div
                class="flex place-content-end text-gray-300"
                class:text-gray-300={system || fn}
                class:hover:text-gray-700={system || fn}
                class:text-primary-300={user}
                class:hover:text-primary-700={user}
                class:text-secondary-300={assistant}
                class:hover:text-secondary-700={assistant}
            >
            </div>


            <div class="mb-8 overflow-x-auto max-w-full">
                {#if message_state[message.id]?.as_markdown}
                    {#if has_fn}
                        <Markdown source={'```json\n' + JSON.stringify(message.function_call, null, 4) + '\n```'} />
                    {:else}
                        <Markdown source={message.content} />
                    {/if}
                {:else}
                    {#if message.content}
                        <pre class="whitespace-pre-wrap">{message.content}</pre>
                    {/if}
                    {#if has_fn}
                        <div class="flex place-content-between">
                            <div class="mt-1 font-mono text-lg">{message.function_call.name}</div>
                            <div
                                class:text-gray-500={system || fn}
                                class:text-primary-500={user}
                                class:text-secondary-500={assistant}
                            >
                                <svg fill="currentColor" class="w-[30px] h-[30px] me-2" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg"><path d="M18.5 30h-6.03c-.516 0-1.48-.39-1.48-1.13 0-.9.81-1.43 1.06-1.58 1.1-.65 1.81-1.76 1.81-2.85 0-1-.44-1.92-1.21-2.55 -.78-.64-1.76-.87-2.76-.67 -1.16.23-2.135 1.15-2.45 2.29 -.47 1.71.45 3.12 1.57 3.76 .57.32.95.92.95 1.5 0 .7-.69 1.18-1.31 1.18H2.45c-1.378 0-2.5-1.13-2.5-2.5v-16c0-1.38 1.122-2.5 2.5-2.5H8.65c.04-.01.13-.12.13-.22 0-.37-.16-.66-.37-.78 -1.68-.96-2.5-2.883-2.03-4.79C6.74 1.64 7.97.43 9.49.07c1.3-.31 2.65-.02 3.689.8 1.03.82 1.62 2.046 1.62 3.364 0 1.529-.82 2.95-2.138 3.71 -.22.12-.39.43-.39.72 0 .14.09.25.13.26h6.02c1.37 0 2.5 1.12 2.5 2.5v6.02c0 .04.11.13.21.13l.14 0c.26 0 .5-.14.63-.37 .96-1.69 2.89-2.5 4.81-2.03 1.51.38 2.72 1.61 3.07 3.14v0c.29 1.29 0 2.61-.81 3.63 -.82 1.02-2.05 1.6-3.37 1.6 -1.51 0-2.93-.84-3.71-2.19 -.17-.28-.43-.48-.66-.48 -.15.01-.35.21-.36.31v6.18c-.001 1.37-1.13 2.49-2.5 2.49Zm-7.9-9.83c.98 0 1.93.33 2.7.95 1 .81 1.57 2.02 1.57 3.32 0 1.74-1.2 3.058-2.32 3.7 -.33.18-.57.46-.57.65 .03.05.32.18.47.18h6.022c.82 0 1.5-.68 1.5-1.5v-6.2c0-.63.68-1.31 1.3-1.31 .75 0 1.29.5 1.57.97 .6 1.03 1.69 1.68 2.84 1.68 1.01 0 1.95-.45 2.58-1.24 .625-.79.84-1.78.61-2.79 -.27-1.17-1.19-2.11-2.34-2.4 -1.48-.37-2.965.25-3.71 1.55 -.31.53-.89.86-1.51.86l-.15-.01c-.65 0-1.22-.53-1.22-1.14v-6.03c0-.827-.68-1.5-1.5-1.5h-6.03c-.61 0-1.13-.57-1.13-1.218 0-.69.35-1.33.88-1.64 1.01-.59 1.63-1.68 1.63-2.854 0-1.02-.46-1.951-1.25-2.58 -.8-.63-1.83-.86-2.84-.62 -1.17.27-2.1 1.19-2.38 2.35 -.36 1.46.26 2.94 1.55 3.684 .52.3.86.91.86 1.56 -.01.73-.53 1.3-1.14 1.3H2.39c-.827 0-1.5.673-1.5 1.5v16c0 .82.673 1.5 1.5 1.5h6.196c.11 0 .28-.11.3-.16 -.01-.25-.19-.52-.46-.67 -1.75-1-2.57-2.97-2.05-4.9 .41-1.53 1.673-2.71 3.21-3.02 .29-.06.59-.09.88-.09Z"/></svg>
                            </div>
                        </div>
                        {#each Object.entries(message.function_call.arguments) as [ k, v] (k)}
                            <div class="mt-3 py-3 grid grid-cols-8 gap-2 align-content-center justify-content-start font-mono text-xs border-t border-gray-300">
                                <div class="truncate">{k}</div>
                                <pre class="col-span-7 whitespace-pre-wrap">{v}</pre>
                            </div>
                        {/each}
                    {/if}
                {/if}
            </div>

            <div class="w-full grid grid-cols-2 gap-2 place-content-between">

                <div
                  class="font-light block text-xxs font-mono whitespace-nowrap"
                  class:text-gray={system}
                  class:text-primary={user}
                  class:text-secondary={assistant}
                >
                {message.name ?? message.role} &middot; {message.id} &middot; {message.as_of} &middot; {message.finish_reason} &middot; {message.total_tokens} tokens
                </div>

                <div class="flex place-content-end">

                    <button
                        class="ml-1 text-gray-300"
                        class:text-gray-300={system || fn}
                        class:hover:text-gray-700={system || fn}
                        class:text-primary-300={user}
                        class:hover:text-primary-700={user}
                        class:text-secondary-300={assistant}
                        class:hover:text-secondary-700={assistant}
                        on:click={() => {
                            message_state[message.id] = message_state[message.id] || {};
                            message_state[message.id].as_markdown = !message_state[message.id].as_markdown;
                        }}
                    >
                        {#if message_state[message.id]?.as_markdown}
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                              <path fill-rule="evenodd" d="M6.28 5.22a.75.75 0 010 1.06L2.56 10l3.72 3.72a.75.75 0 01-1.06 1.06L.97 10.53a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 0zm7.44 0a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L17.44 10l-3.72-3.72a.75.75 0 010-1.06zM11.377 2.011a.75.75 0 01.612.867l-2.5 14.5a.75.75 0 01-1.478-.255l2.5-14.5a.75.75 0 01.866-.612z" clip-rule="evenodd" />
                            </svg>
                        {:else}
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
                              <path fill-rule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" clip-rule="evenodd" />
                            </svg>
                        {/if}
                    </button>

                    <button
                        class="ml-1 text-gray-300"
                        class:text-gray-300={system || fn}
                        class:hover:text-gray-700={system || fn}
                        class:text-primary-300={user}
                        class:hover:text-primary-700={user}
                        class:text-secondary-300={assistant}
                        class:hover:text-secondary-700={assistant}
                        on:click={() => copyToClipboard(message)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                          <path fill-rule="evenodd" d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501-.002.002a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-3.455 3.553A2.625 2.625 0 119.52 9.52l3.45-3.451a.75.75 0 111.061 1.06l-3.45 3.451a1.125 1.125 0 001.587 1.595l3.454-3.553a3 3 0 000-4.242z" clip-rule="evenodd" />
                        </svg>
                    </button>

                    <button
                        class="ml-1 text-gray-300"
                        class:text-gray-300={system || fn}
                        class:hover:text-gray-700={system || fn}
                        class:text-primary-300={user}
                        class:hover:text-primary-700={user}
                        class:text-secondary-300={assistant}
                        class:hover:text-secondary-700={assistant}
                        on:click={() => transcribe(message)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                          <path d="M10 3.75a.75.75 0 00-1.264-.546L4.703 7H3.167a.75.75 0 00-.7.48A6.985 6.985 0 002 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h1.535l4.033 3.796A.75.75 0 0010 16.25V3.75zM15.95 5.05a.75.75 0 00-1.06 1.061 5.5 5.5 0 010 7.778.75.75 0 001.06 1.06 7 7 0 000-9.899z" />
                          <path d="M13.829 7.172a.75.75 0 00-1.061 1.06 2.5 2.5 0 010 3.536.75.75 0 001.06 1.06 4 4 0 000-5.656z" />
                        </svg>
                    </button>

                    <button
                        class="ml-1 text-gray-300"
                        class:text-gray-300={system || fn}
                        class:hover:text-gray-700={system || fn}
                        class:text-primary-300={user}
                        class:hover:text-primary-700={user}
                        class:text-secondary-300={assistant}
                        class:hover:text-secondary-700={assistant}
                        on:click={() => toNewChat(message)}
                    >
                        <!-- https://iconmonstr.com/code-fork-4-svg/ -->
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="currentColor" stroke="none" viewBox="0 0 24 24">
                            <path d="M21 4h-2v2h-2v-2h-2v-2h2v-2h2v2h2v2zm-4.13 4c-.577 2.317-2.445 2.723-4.817 3.223-1.71.36-3.643.775-5.053 2.085v-7.492c1.162-.413 2-1.511 2-2.816 0-1.657-1.343-3-3-3s-3 1.343-3 3c0 1.305.838 2.403 2 2.816v12.367c-1.162.414-2 1.512-2 2.817 0 1.657 1.343 3 3 3s3-1.343 3-3c0-1.295-.824-2.388-1.973-2.808.27-3.922 2.57-4.408 5.438-5.012 2.611-.55 5.733-1.23 6.435-5.18h-2.03zm-12.67-5c0-.993.808-1.8 1.8-1.8s1.8.807 1.8 1.8-.808 1.8-1.8 1.8-1.8-.807-1.8-1.8zm3.6 18c0 .993-.808 1.8-1.8 1.8s-1.8-.807-1.8-1.8.808-1.8 1.8-1.8 1.8.807 1.8 1.8z"/>
                        </svg>

                    </button>


                </div>

            </div>

          </div>
  {/each}
</div>

<style>

  .chat-bubble {
      position: relative;
      color: black;
      border-radius: 8px;
      width: 80ch;
      max-width: 80ch;
  }

  .chat-bubble.chat-animate {
      border-radius: 8px;
      background-color: rgb(var(--secondary-color-200));
      box-shadow: 6px 6px rgb(var(--secondary-color-50));
      -webkit-animation: float 5s ease-in-out infinite;
              animation: float 5s ease-in-out infinite;
  }

  .chat-bubble.chat-animate:after {
      transform: translatey(4px);
      content: ".";
      text-align: right;
      -webkit-animation: float2 5s ease-in-out infinite;
              animation: float2 5s ease-in-out infinite;
      letter-spacing: -4px;
      font-weight: bold;
      font-size: 55px;
      width: 36px;
      height: 11px;
      line-height: 10px;
      border-radius: 8px;
      position: absolute;
      display: block;
      bottom: -20px;
      left: auto;
      right: 0;
      z-index: -2;
  }

  /* system role */
  .chat-bubble.chat-system {
      border: 1px solid rgb(var(--gray-color-400));
      background-color: rgb(var(--gray-color-200));
  }
  .chat-bubble.chat-animate.chat-system {
      border: 2px solid rgb(var(--gray-color-400));
      background-color: rgb(var(--gray-color-200));
      box-shadow: 6px 6px rgb(var(--gray-color-100));
  }
  .chat-bubble.chat-animate.chat-system:after {
      border: 2px solid rgb(var(--gray-color-400));
      -webkit-text-stroke: 2px rgb(var(--gray-color-400));
      text-stroke: 2px rgb(var(--gray-color-400));
      -webkit-text-fill-color: rgb(var(--gray-color-100));
      text-shadow: 6px 6px rgb(var(--gray-color-100));
      background-color: rgb(var(--gray-color-200));
      box-shadow: 6px 6px rgb(var(--gray-color-1o0));
  }

  /* user role */
  .chat-bubble.chat-user {
      border: 1px solid rgb(var(--primary-color-400));
  }
  .chat-bubble.chat-animate.chat-user {
      border: 2px solid rgb(var(--primary-color-400));
      background-color: rgb(var(--primary-color-100));
      box-shadow: 6px 6px rgb(var(--primary-color-50));
  }
  .chat-bubble.chat-animate.chat-user:after {
      border: 2px solid rgb(var(--primary-color-400));
      -webkit-text-stroke: 2px rgb(var(--primary-color-400));
      text-stroke: 2px rgb(var(--primary-color-400));
      -webkit-text-fill-color: rgb(var(--primary-color-100));
      text-shadow: 6px 6px rgb(var(--primary-color-50));
      background-color: rgb(var(--primary-color-100));
      box-shadow: 6px 6px rgb(var(--primary-color-50));
  }

  /* assistant role */
  .chat-bubble.chat-assistant {
      border: 1px solid rgb(var(--secondary-color-400));
  }
  .chat-bubble.chat-animate.chat-assistant {
      border: 2px solid rgb(var(--secondary-color-400));
      background-color: rgb(var(--secondary-color-100));
      box-shadow: 6px 6px rgb(var(--secondary-color-50));
  }
  .chat-bubble.chat-animate.chat-assistant:after {
      border: 2px solid rgb(var(--secondary-color-400));
      -webkit-text-stroke: 2px rgb(var(--secondary-color-400));
      text-stroke: 2px rgb(var(--secondary-color-400));
      -webkit-text-fill-color: rgb(var(--secondary-color-100));
      text-shadow: 6px 6px rgb(var(--secondary-color-50));
      background-color: rgb(var(--secondary-color-100));
      box-shadow: 6px 6px rgb(var(--secondary-color-50));
  }



  @keyframes float {
    0% {
      transform: translatey(4px);
    }
    50% {
      transform: translatey(-4px);
    }
    100% {
      transform: translatey(4px);
    }
  }

  @keyframes float2 {
    0% {
      line-height: 10px;
      transform: translatey(4px);
    }
    55% {
      transform: translatey(-4px);
    }
    60% {
      line-height: 0px;
    }
    100% {
      line-height: 10px;
      transform: translatey(4px);
    }
  }

</style>
