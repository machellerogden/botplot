<script>


    import { onMount, tick } from 'svelte';
    import { debounce } from '../util.js';
    import { getMessageList, newChat } from '../api.js';
    import Markdown from './markdown/Markdown.svelte';
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    export let chat;

    let containerNode;
    let messages = [];
    $: lastIndex = (messages?.length ?? 1) - 1;

    $: HEAD = chat?.message_id;

    async function loadMessageList(message_id) {
        if (!message_id) {
            messages = [];
            return;
        }
        const msgs = await getMessageList(message_id, 100); // TODO - let user adjust limit
        messages = msgs.reverse();
        await tick();
    }

    const updateScrollPosition = debounce(() => containerNode.lastElementChild.scrollIntoView(), 100);

    onMount(async () => {
        containerNode.addEventListener('DOMNodeInserted', updateScrollPosition, false);
        return () => containerNode.removeEventListener('DOMNodeInserted', updateScrollPosition, false);
    });

    $: loadMessageList(HEAD);

    const toNewChat = async message => {
        try {
            const {
                // strip data we don't want to copy
                id, as_of, message_id, label, prompt_token, completion_tokens, total_tokens,
                ...request
            } = chat;
            request.label = `fork of ${label}`;
            request.message_id = message.id;
            const result = await newChat(request);
            dispatch('log', `POST new chat result\n${JSON.stringify(result, null, 4)}`);
            dispatch('chat-event', { action: 'create', chat: result });
        } catch (error) {
            dispatch('log', `error posting new chat\n${error.stack}`);
        }
    };

    const transcribe = message => dispatch('voice-event', { content: message.content })

    async function copyToClipboard(message) {
        try {
            await navigator.clipboard.writeText(message.content);
            dispatch('log', `copied message to clipboard\n${message.content}`);
        } catch (error) {
            dispatch('log', `error copying message to clipboard\n${error.stack}`);
        }
    }

    const message_state = {
    };

</script>

<div bind:this={containerNode} class="flex flex-col px-2 overflow-y-auto px-8 pt-2 pb-8 place-items-center">
    {#if messages?.length}
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
                            <pre class="whitespace-pre-wrap">{message.function_call.name}</pre>
                            <pre class="whitespace-pre-wrap">{message.function_call.arguments}</pre>
                        {/if}
                    {/if}
                </div>

                <div class="w-full grid grid-cols-2 gap-1.5 place-content-between">

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

  {/if}
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
