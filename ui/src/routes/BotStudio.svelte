<script>
    import { tick, onMount } from 'svelte';
    import Ajv from 'ajv';

    import {
        functions as functionsStore,
        functionSets as functionSetsStore,
        completionConfigs as completionConfigsStore
    } from '../stores.js';

    import {
        elevenSynth,
        getBot,
        getBotChat,
        getBotMessages,
        getCompletionConfig,
        getProject,
        getProjects,
        getWorkspace,
        getWorkspaces,
        googleSynth,
        insertMessage,
        mimicSynth,
        newBotChat,
        newWorkspace,
        patchBot,
        patchBotChat,
        patchWorkspace,
        postChatCompletion,
        postCompletionConfig,
        postFunctionCall,
        postFunctionSet,
        transcribe
    } from '../api.js';

    import { createHashSource } from '../lib/hashHistory.js';
    import { mimicVoices, googleVoices, elevenVoices } from '../constants.js';

    import DefaultLayout from '../layout/DefaultLayout.svelte';
    import MainNav from '../layout/MainNav.svelte';

    import Accordion from '../components/Accordion.svelte';
    import AudioMonitor from '../components/AudioMonitor.svelte';
    import AudioRecorder from '../components/AudioRecorder.svelte';
    import BotChats from '../components/BotChats.svelte';
    import BotMessages from '../components/BotMessages.svelte';
    import Bots from '../components/Bots.svelte';
    import CompletionConfig from '../components/CompletionConfig.svelte';
    import CreateBotButton from '../components/CreateBotButton.svelte';
    import CreateBotChatButton from '../components/CreateBotChatButton.svelte';
    import FunctionSet from '../components/FunctionSet.svelte';
    import Prelude from '../components/Prelude.svelte';
    import Toggle from '../components/Toggle.svelte';
    import WakeWord from '../components/WakeWord.svelte';

    import { Link, useNavigate } from 'svelte-navigator';

    const navigate = useNavigate();

    export let bot_id;
    export let project_id = 'default';
    export let workspace_id = 'default';
    export let chat_id = 'default';

    let project = {};
    let workspace = {};
    let bot = {};
    let chat = {};
    let config = {};
    let functions = [];
    let messages = [];
    let workspaces = [];
    let projects = [];

    $: allCompletionConfigs = $completionConfigsStore;
    $: allFunctionSets = $functionSetsStore;
    $: allFunctions = $functionsStore;
    $: function_names = functions.map(({ name }) => name);

    const getSelectedFunctions = () =>
        allFunctions.reduce((acc, { name, description, parameters }) => {
            if (function_names.includes(name)) acc.push({ name, description, parameters });
            return acc;
        }, []);

    /**
     * bot form values
     */

    let ka;
    let aka;
    let description;
    let voice_provider;
    let voice_key;
    let completion_config_id;
    let prelude_id;
    let function_set_id;
    let botsNode = { load(){} };
    let chatsNode = { load(){} };
    let botMessagesNode = { load(){} };

    function resetBotFormValues(bot) {
        if (bot?.id) {
            ka = bot.ka;
            aka = bot.aka;
            description = bot.description;
            voice_provider = bot.voice_provider ?? 'mimic';
            voice_key = bot.voice_key ?? 'en_US/vctk_low%23p233';
            completion_config_id = bot.completion_config_id;
            prelude_id = bot.prelude_id;
            function_set_id = bot.function_set_id;
        }
    }

    /**
      * load the project
      */
    async function loadProject(project_id) {
        if (project_id) {
            console.log(`getting project id:`, project_id);
            try {
                project = await getProject(project_id) ?? {};
                console.log(`project loaded`, project);
            } catch (error) {
                project = {};
                console.error(`error loading project`, error);
            }
        } else {
            console.log('no project id');
        }
    }

    /**
      * load the workspace
      */
    async function loadWorkspace(workspace_id) {
        if (workspace_id) {
            console.log(`getting workspace id:`, workspace_id);
            try {
                workspace = await getWorkspace(workspace_id) ?? {};
                console.log(`workspace loaded`, workspace);
            } catch (error) {
                workspace = {};
                console.error(`error loading workspace`, error);
            }
        } else {
            console.log('no workspace id');
        }
    }

    /**
      * load the bot
      */
    async function loadBot(bot_id) {
        if (bot_id) {
            console.log(`getting bot id:`, bot_id);
            try {
                bot = await getBot(bot_id) ?? {};
                console.log(`bot loaded`, bot);
            } catch (error) {
                bot = {};
                console.error(`error loading bot`, error);
            }
        } else {
            console.log('no bot id');
        }
    }

    /**
      * load the chat
      */
    async function loadChat(chat_id) {
        if (chat_id) {
            console.log(`getting chat id:`, chat_id);
            try {
                chat = await getBotChat(chat_id) ?? {};
                workspace_id = chat.workspace_id ?? workspace_id ?? 'default';
                console.log(`chat loaded`, bot);
            } catch (error) {
                chat = {};
                console.error(`error loading chat`, error);
            }
        } else {
            console.log('no chat id');
        }
    }

    /**
     * load the workspaces
     */
    async function loadWorkspaces() {
        workspaces = await getWorkspaces();
    }

    /**
     * load the projects
     */
    async function loadProjects() {
        projects = await getProjects();
    }

    onMount(async () => {
        const results = await Promise.allSettled([
            loadProject('default'),
            loadWorkspace('default'),
            loadWorkspaces(),
            loadProjects()
        ]);
        for (const { status, reason } of results) {
            if (status === 'rejected') console.error(reason);
        }
    });

    // cleanup reactions
    $: {
        if (bot_id == null) {
            bot = {};
            chat_id = null
        }
        if (bot_id == null) {
            bot = {};
            chat_id = null
        }
        if (chat_id == null) {
            chat = {};
        }
    };

    $: loadBot(bot_id);
    $: loadChat(chat_id);
    $: loadProject(project_id);
    $: loadWorkspace(workspace_id);

    $: resetBotFormValues(bot);
    $: message_id = chat?.message_id;
    $: botMessagesNode.load(message_id);

    /**
     * let's do the chat thing
     */
    let apiError;
    let draftContent;
    let draftRole;
    let draftName;

    async function addMessageToChat({
            content,
            function_call,
            role,
            name
        },
        finish_reason = 'stop',
        {
            prompt_tokens = 0,
            total_tokens = 0,
            completion_tokens = 0
        } = {}) {

        const request = {
            parent_id: message_id,
            content,
            function_call,
            finish_reason,
            role

        };
        if ([ 'user', 'function' ].includes(role) && name?.length) request.name = name;
        const entry = await insertMessage(request);
        const patch = { message_id: entry.id };
        if (prompt_tokens) patch.prompt_tokens = prompt_tokens;
        if (total_tokens) patch.total_tokens = total_tokens;
        if (completion_tokens) patch.completion_tokens = completion_tokens;
        await patchBotChat(chat.id, patch);
        chat = await getBotChat(chat.id);
    }

    const clientSideFunctions = {
        async set_chat_label(context, input) {
            try {
                console.log(`\`set_chat_label\` function invoked with ${JSON.stringify(input)}`);
                const { label } = input;
                await patchBotChat(chat.id, { label });
                chatsNode.load(bot.id);
                return `Chat label set successfully.`;
            } catch (error) {
                return `Unable to set chat label.`;
            }
        }
    };

    let autoTTS = false;

    async function submitChat() {

        let response = await postChatCompletion({
            ...config,
            message_id
        }, 'auto', getSelectedFunctions());

        console.table('RESPONSE', response);
        console.table('CHOICE', response?.choices?.[0]);

        const { error, usage, choices } = response;

        if (error) return apiError = error;

        const [ choice ] = choices ?? [];
        const { finish_reason, message } = choice;

        await addMessageToChat(message, finish_reason, usage);

        if (finish_reason === 'function_call') {

            const { function_call } = message;

            let function_return = {
                role: 'function',
                name: function_call.name
            };

            const definition = allFunctions.find(fn => fn.name == function_call.name);

            if (!definition) {
                function_return.content = `Unknown function.`
            } else {

                try {
                    function_call.arguments = JSON.parse(function_call.arguments);
                } catch (error) {
                    console.log('error json parsing arguments', error.stack);
                }

                // good input?
                if (!definition.validate(function_call.arguments)) {
                    function_return.content = `Invalid input: ${(new Ajv()).errorsText(definition.validate.errors)}`;
                } else {
                    const context = {
                        project_id,
                        bot_id,
                        bot_chat_id: chat_id,
                    };
                    if (workspace.location_ref) context.cwd = workspace.location_ref;
                    try {
                        if (clientSideFunctions[function_call.name]) {
                            function_return.content = await clientSideFunctions[function_call.name](context, function_call.arguments);
                        } else {
                            function_return.content = await postFunctionCall({ context, name: function_call.name, arguments: function_call.arguments });
                        }
                    } catch (error) {
                        console.error(error);
                        function_return.content = `Unable to complete request.`;
                    }
                }
            }

            // post follow up chat completion for function
            await addMessageToChat(function_return);
            await submitChat();

        } else if (autoTTS) {
            const synthRequest = {
                content: message.content,
                voice: voice_key
            };
            if (voice_provider == 'mimic') {
                mimicSynth(synthRequest);
            } else if (voice_provider == 'google') {
                googleSynth(synthRequest);
            } else if (voice_provider == 'eleven') {
                elevenSynth(synthRequest);
            }
        }
    }

    /**
     * component event handlers
     */
    async function onError({ detail:error = {} }) {
        console.error('error', error);
    }

    async function onBotsLoad({ detail:loaded_bots = [] }) {
        console.log('bots loaded', loaded_bots);
    }

    async function onBotSelect({ detail:selected_bot = {} }) {
        console.log(`bot selected`, selected_bot);
        navigate(`/bot/${selected_bot.id}`);
    }

    async function onBotCreate({ detail:created_bot = {} }) {
        console.log(`bot created`, created_bot);
        await botsNode.load();
        await tick();
        navigate(`/bot/${created_bot.id}`);
    }

    async function onBotDelete({ detail:deleted_bot = {} }) {
        console.log(`bot deleted`, deleted_bot);
        await botsNode.load();
        await tick();
        navigate(`/bots`);
    }

    async function onCompletionConfigLoad({ detail:loaded_config = {} }) {
        console.log('completion config loaded', loaded_config);
        config = loaded_config;
    }

    async function onFunctionSetLoad({ detail:loaded_function_set = {} }) {
        console.log('function set loaded', loaded_function_set);
        functions = loaded_function_set?.functions ?? [];
    }

    async function onBotChatsLoad({ detail:chats = [] }) {
        console.log('bot chats loaded', chats);
    }

    async function onBotChatSelect({ detail:selected_chat = {} }) {
        console.log('bot chat selected', selected_chat);
        navigate(`/bot/${bot.id}/chat/${selected_chat.id}`);
    }

    async function onBotChatCreate({ detail:created_chat = {} }) {
        console.log('bot chat created', created_chat);
        await chatsNode.load(bot.id);
        await tick();
        navigate(`/bot/${bot.id}/chat/${created_chat.id}`);
    }

    async function onBotChatDelete({ detail:deleted_chat = {} }) {
        console.log('bot chat deleted', deleted_chat);
        navigate(`/bot/${bot.id}`);
    }

    async function onBotMessagesLoad({ detail:loaded_messages } = {}) {
        console.log('bot messages loaded', loaded_messages);
        messages = loaded_messages;
    }

    let listenForWakeWord = true;
    let audioRecorderNode;

    async function onWakeWordDetection(event) {
        const word = event?.detail?.label;
        console.log(`wake word`, word, audioRecorderNode);
        audioRecorderNode.start();
    }

    async function onRecorderStart(event) {
        console.log('recording started', event);
    }

    async function onRecorderStop(event) {
        console.log('recording stopped', event);
        const { blob } = event.detail;
        try {
            if (chat) {

                // transcribe
                const { transcript, file } = await transcribe(blob);
                console.log(`recording saved to:`, file.path, file);

                // add user message to chat
                await addMessageToChat({
                    content: transcript,
                    role: 'user',
                    name: draftName
                });

                await submitChat();
            }
        } catch (error) {
            console.log(`error saving recording`, error);
        }
    }

    async function onSilence() {
        console.log('silence');
        if (audioRecorderNode?.isRecording()) audioRecorderNode.stop();
    }

    let maxSilenceMs = 2750;
    let minDecibels = -48;
    let fftSize = 512; // 256 bars

    async function onTranscribeRequest({ detail:request = {} }) {
        console.log('transcribe request', request);
        const synthRequest = {
            content: request.content,
            voice: voice_key
        };
        if (voice_provider == 'mimic') {
            mimicSynth(synthRequest);
        } else if (voice_provider == 'google') {
            googleSynth(synthRequest);
        } else if (voice_provider == 'eleven') {
            elevenSynth(synthRequest);
        }
    }

</script>

<DefaultLayout>

    <svelte:fragment slot="top-strip">
        <div class="flex w-full place-content-between pt-0.5">

            <div class="flex me-2">
                <button class="text-secondary-200 hover:text-white ps-1 pe-1">
                    <svg fill="currentColor" class="-mt-1 w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g><path d="M7.5 5h9c.27 0 .5-.23.5-.5v-1c0-.827-.68-1.5-1.5-1.5H14c0-1.103-.9-2-2-2 -1.11 0-2 .897-2 2H8.5C7.673 2 7 2.673 7 3.5v1c0 .27.22.5.5.5Z"/><path d="M18.5 3h-.56c.03.16.05.32.05.5v1c0 .82-.68 1.5-1.5 1.5h-9c-.827 0-1.5-.68-1.5-1.5v-1c0-.18.01-.34.05-.5h-.56c-.827 0-1.5.673-1.5 1.5v18c0 .82.673 1.5 1.5 1.5h13c.82 0 1.5-.68 1.5-1.5v-18c0-.827-.68-1.5-1.5-1.5Zm-11 16c-.28 0-.5-.23-.5-.5 0-.28.22-.5.5-.5 .27 0 .5.22.5.5 0 .27-.23.5-.5.5Zm0-3c-.28 0-.5-.23-.5-.5 0-.28.22-.5.5-.5 .27 0 .5.22.5.5 0 .27-.23.5-.5.5Zm0-3c-.28 0-.5-.23-.5-.5 0-.28.22-.5.5-.5 .27 0 .5.22.5.5 0 .27-.23.5-.5.5Zm0-3c-.28 0-.5-.23-.5-.5 0-.28.22-.5.5-.5 .27 0 .5.22.5.5 0 .27-.23.5-.5.5Zm9 9h-7c-.28 0-.5-.23-.5-.5 0-.28.22-.5.5-.5h7c.27 0 .5.22.5.5 0 .27-.23.5-.5.5Zm0-3h-7c-.28 0-.5-.23-.5-.5 0-.28.22-.5.5-.5h7c.27 0 .5.22.5.5 0 .27-.23.5-.5.5Zm0-3h-7c-.28 0-.5-.23-.5-.5 0-.28.22-.5.5-.5h7c.27 0 .5.22.5.5 0 .27-.23.5-.5.5Zm0-3h-7c-.28 0-.5-.23-.5-.5 0-.28.22-.5.5-.5h7c.27 0 .5.22.5.5 0 .27-.23.5-.5.5Z"/></g></svg>
                </button>
                <select
                    id="project-id"
                    on:keyup|stopPropagation
                    class="outline-0 rounded-lg uppercase text-secondary-200 bg-secondary-800 hover:bg-secondary-900 p-[3px] mt-[-2px] ml-[-2px] text-xxs"
                    bind:value={project_id}
                    on:change={async event => {
                        // TODO:
                    }}
                >
                    {#each projects as option (option.id)}
                        <option selected={option.id === project.id} value={option.id}>{option.label}</option>
                    {/each}
                </select>
            </div>

            {#if chat.id}
                <div class="flex">
                    <button class="text-secondary-200 hover:text-white ps-1 pe-1 workspace-button">
                        <!-- folder -->
                        <svg fill="currentColor" class="icon folder -mt-1 w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g><path d="M21.5 7.5H9.94c-.65 0-1.218-.42-1.423-1.03l-.09-.27c-.35-1.03-1.3-1.71-2.38-1.71H2.48c-1.378 0-2.5 1.12-2.5 2.5v12c0 1.37 1.122 2.5 2.5 2.5h19c1.37 0 2.5-1.13 2.5-2.5v-9c0-1.38-1.13-2.5-2.5-2.5Z"/><path d="M20.5 2.5H6.05c-.28 0-.5.22-.5.5 0 .27.22.5.5.5 1.508 0 2.84.96 3.32 2.392l.08.26c.06.2.25.34.47.34l11.55-.01c.26 0 .54.04.87.12 .04.01.08.01.12.01 .1 0 .21-.04.3-.11 .12-.1.19-.25.19-.4V4.95c0-1.38-1.13-2.5-2.5-2.5Z"/></g></svg>
                        <!-- folder, add -->
                        <svg fill="currentColor" class="icon folder-add w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g><path d="M5.05 1c1.5 0 2.843.962 3.32 2.39l.08.26c.06.2.25.34.47.34l11.55-.01c.26 0 .54.04.87.12 .04.01.08.01.12.01 .1 0 .21-.04.3-.11 .12-.1.19-.25.19-.4V2.458c0-1.378-1.13-2.5-2.5-2.5H5c-.28 0-.5.224-.5.5s.22.5.5.5Z"/><path d="M20.5 5H8.94c-.65 0-1.22-.42-1.43-1.03l-.09-.27C7.07 2.67 6.12 1.99 5.04 1.99H2.481c-1.379 0-2.5 1.12-2.5 2.5v12c0 1.37 1.121 2.5 2.5 2.5h2c.27 0 .5-.23.5-.5 0-3.59 2.91-6.5 6.5-6.5 3.58 0 6.5 2.91 6.5 6.5 0 .27.22.5.5.5h2c1.37 0 2.5-1.13 2.5-2.5v-9c0-1.38-1.13-2.5-2.5-2.5Z"/><path d="M11.5 13C8.468 13 6 15.46 6 18.5c0 3.03 2.468 5.5 5.5 5.5s5.5-2.47 5.5-5.5c0-3.04-2.468-5.5-5.5-5.5Zm2 6H12v1.5c0 .27-.23.5-.5.5 -.28 0-.5-.23-.5-.5V19H9.5c-.28 0-.5-.23-.5-.5 0-.28.22-.5.5-.5H11v-1.5c0-.28.22-.5.5-.5 .27 0 .5.22.5.5V18h1.5c.27 0 .5.22.5.5 0 .27-.23.5-.5.5Z"/></g></svg>
                    </button>
                    <select
                        id="location-ref"
                        type="text"
                        on:keyup|stopPropagation
                        class="outline-0 rounded-lg uppercase text-secondary-200 bg-secondary-800 hover:bg-secondary-900 p-[3px] mt-[-2px] ml-[-2px] text-xxs w-full"
                        on:change={async event => {
                            if (project.id) {
                                await patchBotChat(chat.id, { workspace_id: event.target.value });
                            }
                        }}
                        bind:value={workspace_id}
                    >
                        {#each workspaces as option}
                            <option selected={option.id === workspace_id} value={option.id}>{option.label} {option.location_ref}</option>
                        {/each}
                    </select>
                </div>
            {/if}

            <div class="grow"></div>

            <Link to="/user">
                <div class="text-secondary-200 hover:text-white ps-1 pe-1">
                    <svg fill="currentColor" class="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M11.5 0C5.159 0 0 5.159 0 11.5 0 17.84 5.159 23 11.5 23 17.84 23 23 17.84 23 11.5 23 5.159 17.84 0 11.5 0Zm0 3C13.43 3 15 4.57 15 6.5c0 1.93-1.57 3.5-3.5 3.5C9.57 10 8 8.43 8 6.5 8 4.57 9.57 3 11.5 3Zm6 15h-12c-.28 0-.5-.23-.5-.5 0-3.59 2.91-6.5 6.5-6.5 3.58 0 6.5 2.91 6.5 6.5 0 .27-.23.5-.5.5Z"/></svg>
                </div>
            </Link>

        </div>
    </svelte:fragment>

    <svelte:fragment slot="top-bar">
        <MainNav>
            <svelte:fragment slot="extras">
                {#if chat}
                    <div class="w-full mx-2 h-[54px] z-50">
                        <AudioMonitor
                            on:silence={onSilence}
                            {maxSilenceMs}
                            {minDecibels}
                            {fftSize}
                        />
                    </div>
                    <div class="mt-[17px] mr-3">
                    </div>
                    <div class="mt-[18px] mr-4">
                        <AudioRecorder
                            bind:this={audioRecorderNode}
                            on:start={onRecorderStart}
                            on:stop={onRecorderStop}
                        />
                    </div>
                    <div class="mr-6 grid grid-cols-2 grid-flow-row-dense gap-y-1 place-content-center">
                        <div>
                            <Toggle bind:value={autoTTS} />
                        </div>
                        <div class="whitespace-nowrap text-secondary-200 text-xxs font-light text-left">
                            auto tts
                        </div>
                        <div>
                            <WakeWord
                                on:detection={onWakeWordDetection}
                                listen={listenForWakeWord}
                            />
                        </div>
                        <div class="whitespace-nowrap text-secondary-200 text-xxs font-light text-left">
                            wake word
                        </div>
                    </div>
                {/if}
            </svelte:fragment>
        </MainNav>
    </svelte:fragment>

    <svelte:fragment slot="top-right">
    </svelte:fragment>

    <div
        class="relative h-full flex flex-col min-h-0" slot="main"
    >

        <!-- chat messages -->
        <div class="relative flex flex-col grow shrink min-h-0">
            <BotMessages
                {message_id}
                {chat}
                bind:this={botMessagesNode}
                on:load={onBotMessagesLoad}
                on:chat-create={onBotChatCreate}
                on:transcribe-request={onTranscribeRequest}
                on:error={onError}
            />
        </div>

        <!-- message authoring -->
        {#if bot?.id}
            <div class="w-full bg-white drop-shadow-[0_-12px_4px_rgba(255,255,255)] z-10">

                {#if apiError}
                    <div class="p-8">
                        <div class="border rounded border-danger-200 p-2">
                            <div class="text-xxs text-gray mb-1">type: {apiError.type} code: {apiError.code} param: {apiError.param}</div>
                            <div class="text-md text-danger">{apiError.message}</div>
                        </div>
                    </div>
                {/if}

                <div class="w-full flex pt-6 pb-4 px-4">

                    <textarea
                        on:keyup|stopPropagation
                        bind:value={draftContent}
                        class="outline-0 grow rounded-lg border border-gray bg-gray-200 font-mono p-3"
                    ></textarea>

                    <div class="flex flex text-xs">

                        <div class="flex grow">

                            <div class="flex grow place-items-center border border-gray-300 rounded-lg py-1 px-2 ml-3">
                                <label for="message-role" class="pe-2 font-mono">role</label>
                                <select
                                    id="message-role"
                                    on:keyup|stopPropagation
                                    class="outline-0 rounded-lg border border-gray bg-gray-200 p-0.5 text-xxs"
                                    bind:value={draftRole}
                                >
                                    <option value="user">user</option>
                                    <option value="system">system</option>
                                    <option value="assistant">assistant</option>
                                    <option value="function">function</option>
                                </select>
                            </div>

                            {#if [ 'user', 'function' ].includes(draftRole)}
                                <div class="flex grow place-items-center border border-gray-300 rounded-lg py-1 px-2 ml-3">
                                    <label for="message-name" class="pe-2 font-mono">name</label>
                                    <input
                                        id="message-name"
                                        type="text"
                                        on:keyup|stopPropagation
                                        class="outline-0 rounded-lg border border-gray bg-gray-200 p-0.5 text-xxs"
                                        bind:value={draftName}
                                    />
                                </div>
                            {/if}

                            <button
                                class="border border-secondary bg-secondary-100 rounded-lg p-1 ml-3 w-[5ch]"
                                on:click={async () => {
                                    try {

                                        if (chat_id == null) {
                                            chat = await newBotChat({ bot_id: bot.id });
                                            await chatsNode.load(bot.id);
                                            await addMessageToChat({
                                                content: draftContent,
                                                role: draftRole,
                                                name: draftName
                                            });
                                        } else {
                                            await addMessageToChat({
                                                content: draftContent,
                                                role: draftRole,
                                                name: draftName
                                            });
                                        }

                                        draftContent = '';

                                    } catch (error) {
                                        console.error(error.stack);
                                    }
                                }}
                            >
                                add
                            </button>

                        </div>

                        <div class="flex w-full place-content-end">
                            <button
                                class="border border-primary bg-primary-100 rounded-lg p-1 ml-3 w-[5ch]"
                                on:click={() => submitChat()}
                            >
                                send
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        {/if}

    </div>

    <div slot="drawer-left">

        <div
            class="m-6"
        >

            <!-- bot editor -->
            {#if bot?.id}

                <div
                    class="mb-1"
                >

                    <button
                        class="text-xxs text-gray-400 mb-2"
                        on:click={() => navigate(-1)}
                    >
                        &laquo; back
                    </button>


                    <div class="flex flex-col mt-4 text-xs font-mono text-gray-700">

                        <div class="grid grid-cols-2 text-xxs font-mono text-gray-400 mb-4">
                            <span class="truncate">{bot.id}</span>
                            <span class="truncate">{bot.as_of}</span>
                        </div>

                        <input
                            on:keyup|stopPropagation
                            on:blur={async event => {
                                await patchBot(bot.id, { ka: event.target.value });
                            }}
                            class="col-span-2 outline-0 truncate py-1 text-lg mb-1 focus:mb-0.5 focus:border-b-2 focus:border-b-secondary"
                            placeholder="give your bot a name"
                            bind:value={ka}
                        />

                        <div class="mb-2 flex text-sm">
                            <label
                                for="aka"
                                class="truncate text-gray-400 me-2"
                            >
                                aka
                            </label>
                            <input
                                on:keyup|stopPropagation
                                on:blur={async event => {
                                    await patchBot(bot.id, { aka: event.target.value });
                                }}
                                class="outline-0 grow mb-1 focus:mb-0.5 focus:border-b-2 focus:border-b-secondary"
                                bind:value={aka}
                            />
                        </div>

                        <div class="mb-6 flex flex-col text-sm">
                            <textarea
                                on:keyup|stopPropagation
                                on:blur={async event => {
                                    await patchBot(bot.id, { description: event.target.value });
                                }}
                                class="outline-0 mb-1 pb-1 focus:mb-0.5 focus:border-b-2 focus:border-b-secondary"
                                on:input={event => {
                                    event.target.style.height = `${event.target.scrollHeight}px`;
                                }}
                                placeholder='add description here'
                                bind:value={description}
                            />
                        </div>

                        <Accordion>
                            <div slot="heading" class="text-md text-secondary mb-2">prelude</div>
                            <div slot="content" class="grid grid-cols-2 gap-3 gap-x-6 justify-start text-xs font-mono text-gray-700">

                                <label
                                    for="prelude_id"
                                    class="truncate text-gray-400"
                                >
                                    prelude_id
                                </label>
                                <input
                                    on:keyup|stopPropagation
                                    on:blur={async event => {
                                        await patchBot(bot.id, { prelude_id: event.target.value });
                                    }}
                                    class="outline-0 rounded-lg border border-gray bg-gray-200 font-mono p-1 text-xxs mt-1 mb-2 w-fit"
                                    bind:value={prelude_id}
                                />

                                <div class="col-span-2">
                                    <Prelude
                                        id={prelude_id}
                                        {bot_id}
                                    />
                                </div>

                            </div>
                        </Accordion>

                        <Accordion>
                            <div slot="heading" class="text-md text-secondary mb-2">config</div>
                            <div slot="content" class="grid grid-cols-2 gap-2 gap-x-6 justify-start text-xs font-mono text-gray-700">

                                <label
                                    for="completion_config_id"
                                    class="truncate text-gray-400"
                                >
                                    completion_config_id
                                </label>
                                <input
                                    on:keyup|stopPropagation
                                    on:blur={async event => {
                                        await patchBot(bot.id, { completion_config_id: event.target.value });
                                    }}
                                    class="outline-0 rounded-lg border border-gray bg-gray-200 font-mono p-1 text-xxs mt-1 mb-2 w-fit"
                                    bind:value={completion_config_id}
                                />

                                <div class="col-span-2 flex place-content-between">
                                    <select
                                        on:change={async event => {
                                            await patchBot(bot.id, { completion_config_id: event.target.value });
                                        }}
                                        class="col-span-4 outline-0 rounded-lg border border-gray bg-gray-200 font-mono p-1 text-xxs mt-1 mb-2 w-fit"
                                        bind:value={completion_config_id}
                                    >
                                        {#each allCompletionConfigs as option (option.id)}
                                            <option value="{option.id}" selected={option.id == (completion_config_id ?? bot.completion_config_id)}>{option.label}</option>
                                        {/each}
                                    </select>
                                    <button
                                        on:click={async () => {
                                            const config = await postCompletionConfig({ label: 'new config' });
                                            await patchBot(bot.id, { completion_config_id: config.id });
                                        }}
                                    >
                                        <svg fill="currentColor" class="w-6 h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g><path d="M11.5 24C5.159 24 0 18.84 0 12.5 0 6.15 5.159 1 11.5 1 17.84 1 23 6.159 23 12.5 23 18.84 17.84 24 11.5 24Zm0-22C5.71 2 1 6.71 1 12.5 1 18.29 5.71 23 11.5 23 17.29 23 22 18.29 22 12.5 22 6.71 17.29 2 11.5 2Z"/><path d="M17.5 13h-12c-.28 0-.5-.23-.5-.5 0-.28.22-.5.5-.5h12c.27 0 .5.22.5.5 0 .27-.23.5-.5.5Z"/><path d="M11.5 19c-.28 0-.5-.23-.5-.5v-12c0-.28.22-.5.5-.5 .27 0 .5.22.5.5v12c0 .27-.23.5-.5.5Z"/></g></svg>
                                    </button>
                                </div>

                                <div class="col-span-2">
                                    <CompletionConfig
                                        id={completion_config_id}
                                        on:load={onCompletionConfigLoad}
                                        on:error={onError}
                                    />
                                </div>

                            </div>
                        </Accordion>

                        <Accordion>
                            <div slot="heading" class="text-md text-secondary mb-2">function_set</div>
                            <div slot="content">
                                <div class="grid grid-cols-2 gap-3 gap-x-6 justify-start text-xs font-mono text-gray-700">

                                    <label
                                        for="function_set_id"
                                        class="truncate text-gray-400"
                                    >
                                        function_set_id
                                    </label>
                                    <input
                                        on:keyup|stopPropagation
                                        on:blur={async event => {
                                            await patchBot(bot.id, { function_set_id: event.target.value });
                                        }}
                                        class="outline-0 rounded-lg border border-gray bg-gray-200 font-mono p-1 text-xxs mt-1 mb-2 w-fit"
                                        bind:value={function_set_id}
                                    />

                                    <div class="col-span-2 flex place-content-between">
                                        <select
                                            on:change={async event => {
                                                await patchBot(bot.id, { function_set_id: event.target.value });
                                            }}
                                            class="outline-0 rounded-lg border border-gray bg-gray-200 font-mono p-1 text-xxs mt-1 mb-2 w-fit"
                                            bind:value={function_set_id}
                                        >
                                            {#each allFunctionSets as option (option.id)}
                                                <option value="{option.id}" selected={option.id == (function_set_id ?? bot.function_set_id)}>{option.label}</option>
                                            {/each}
                                        </select>
                                        <button
                                            on:click={async () => {
                                                const function_set = await postFunctionSet({
                                                    label: 'new function set',
                                                    description: 'add description here'
                                                });
                                                await patchBot(bot.id, { function_set_id: function_set.id });
                                            }}
                                        >
                                            <svg fill="currentColor" class="w-6 h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g><path d="M11.5 24C5.159 24 0 18.84 0 12.5 0 6.15 5.159 1 11.5 1 17.84 1 23 6.159 23 12.5 23 18.84 17.84 24 11.5 24Zm0-22C5.71 2 1 6.71 1 12.5 1 18.29 5.71 23 11.5 23 17.29 23 22 18.29 22 12.5 22 6.71 17.29 2 11.5 2Z"/><path d="M17.5 13h-12c-.28 0-.5-.23-.5-.5 0-.28.22-.5.5-.5h12c.27 0 .5.22.5.5 0 .27-.23.5-.5.5Z"/><path d="M11.5 19c-.28 0-.5-.23-.5-.5v-12c0-.28.22-.5.5-.5 .27 0 .5.22.5.5v12c0 .27-.23.5-.5.5Z"/></g></svg>
                                        </button>
                                    </div>

                                </div>

                                <FunctionSet
                                    id={function_set_id}
                                    on:load={onFunctionSetLoad}
                                    on:error={onError}
                                />
                            </div>

                        </Accordion>

                        <Accordion>
                            <div slot="heading" class="text-md text-secondary mb-2">voice</div>
                            <div slot="content" class="grid grid-cols-2 gap-3 gap-x-6 justify-start text-xs font-mono text-gray-700">
                                <label
                                    for="voice_provider"
                                    class="truncate text-gray-400"
                                >
                                    voice_provider
                                </label>
                                <select
                                    on:change={async event => {
                                        await patchBot(bot.id, { voice_provider: event.target.value });
                                    }}
                                    class="outline-0 rounded-lg border border-gray bg-gray-200 font-mono p-1 text-xxs mt-1 mb-2 w-fit"
                                    bind:value={voice_provider}
                                >
                                    {#each ['mimic','google','eleven'] as option (option)}
                                        <option value="{option}" selected={option == (voice_provider ?? bot.voice_provider)}>{option}</option>
                                    {/each}
                                </select>

                                {#if voice_provider == 'mimic'}

                                    <label
                                        for="voice_key"
                                        class="truncate text-gray-400"
                                    >
                                        voice_key
                                    </label>
                                    <select
                                        on:change={async event => {
                                            await patchBot(bot.id, { voice_key: event.target.value });
                                        }}
                                        class="outline-0 rounded-lg border border-gray bg-gray-200 font-mono p-1 text-xxs w-fit"
                                        bind:value={voice_key}
                                    >
                                        {#each mimicVoices as {alias, key} (key)}
                                            <option value="{key}" selected={voice_key == key}>{alias}</option>
                                        {/each}
                                    </select>

                                {:else if voice_provider == 'google'}

                                    <label
                                        for="voice_key"
                                        class="truncate text-gray-400"
                                    >
                                        voice_key
                                    </label>
                                    <select
                                        on:change={async event => {
                                            await patchBot(bot.id, { voice_key: event.target.value });
                                        }}
                                        class="outline-0 rounded-lg border border-gray bg-gray-200 font-mono p-1 text-xxs w-fit"
                                        bind:value={voice_key}
                                    >
                                        {#each googleVoices as {alias, key} (key)}
                                            <option value="{key}" selected={voice_key == key}>{alias}</option>
                                        {/each}
                                    </select>

                                {:else if voice_provider == 'eleven'}

                                    <label
                                        for="voice_key"
                                        class="truncate text-gray-400"
                                    >
                                        voice_key
                                    </label>
                                    <select
                                        on:change={async event => {
                                            await patchBot(bot.id, { voice_key: event.target.value });
                                        }}
                                        class="outline-0 rounded-lg border border-gray bg-gray-200 font-mono p-1 text-xxs w-fit"
                                        bind:value={voice_key}
                                    >
                                        {#each elevenVoices as {alias, key} (key)}
                                            <option value="{key}" selected={voice_key == key}>{alias}</option>
                                        {/each}
                                    </select>

                                {/if}
                            </div>
                        </Accordion>

                    </div>
                </div>

                <div class="my-6">

                    <CreateBotChatButton
                        {bot_id}
                        on:create={onBotChatCreate}
                    />

                </div>

                <BotChats
                    {bot_id}
                    selected_chat_id={chat_id}
                    bind:this={chatsNode}
                    on:load={onBotChatsLoad}
                    on:select={onBotChatSelect}
                    on:create={onBotChatCreate}
                    on:delete={onBotChatDelete}
                    on:error={onError}
                />


            {:else}


                <div class="mb-6">

                    <CreateBotButton
                        on:create={onBotCreate}
                    />

                </div>

                <Bots
                    bind:this={botsNode}
                    on:load={onBotsLoad}
                    on:select={onBotSelect}
                    on:create={onBotCreate}
                    on:delete={onBotDelete}
                    on:error={onError}
                />

            {/if}

        </div>
    </div>

    <div class="p-6" slot="drawer-right">
        <div>blah</div>
    </div>

</DefaultLayout>

<style>
    .workspace-button svg.folder {
        display: block;
    }
    .workspace-button svg.folder-add {
        display: none;
    }
    .workspace-button:hover svg.folder {
        display: none;
    }
    .workspace-button:hover svg.folder-add {
        display: block;
    }
</style>
