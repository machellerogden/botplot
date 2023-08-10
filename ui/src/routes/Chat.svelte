<script>

    import { onMount } from 'svelte';
    import Ajv from 'ajv';

    import { log, event, showChatSettings, functions, voice } from '../stores.js';
    import { chatModelOptions, completionModelOptions, chatMaxTokensOptions, chatNOptions, mimicVoices } from '../constants.js';
    import {
        getChat,
        googleSynth,
        insertMessage,
        mimicSynth,
        patchChat,
        getProject,
        getProjects,
        newWorkspace,
        getWorkspaces,
        patchWorkspace,
        postChatCompletion,
        postFunctionCall,
        transcribe,
        withSSML,
    } from '../api.js';

    import AudioMonitor from '../components/AudioMonitor.svelte';
    import AudioRecorder from '../components/AudioRecorder.svelte';
    import ChatMessages from '../components/ChatMessages.svelte';
    import Chats from '../components/Chats.svelte';
    import Console from '../components/console/Console.svelte';
    import DefaultLayout from '../layout/DefaultLayout.svelte';
    import MainNav from '../layout/MainNav.svelte';
    import Functions from '../components/functions/Functions.svelte';
    import RangeSlider from 'svelte-range-slider-pips';
    import Toggle from '../components/Toggle.svelte';
    import WakeWord from '../components/WakeWord.svelte';

    import { Link, useNavigate } from 'svelte-navigator';
    const navigate = useNavigate();

    export let id = 'default';
    export let project_id = 'default';
    export let workspace_id = 'default';

    const getRangeColor = (value, base = 1, sat = 100, light = 30) => `hsl(${Math.round((value / base) * 180)}, ${sat}%, ${light}%)`;
    const getInvertedRangeColor = (value, base = 1, sat = 100, light = 30) => `hsl(${(100 - Math.round((value / base) * 180))}, ${sat}%, ${light}%)`;

    // component state
    let apiError;

    let projects = [];
    let project = {};
    let workspaces = [];
    let workspace = {};

    let chat;
    let chatsNode;
    let chatLabel;
    let chatModel;
    let chatMaxTokens;
    let chatN;
    let chatFrequencyPenalty;
    let chatPresencePenalty;

    let nMax = 4;
    let temperatureValues = [ 1 ];
    let temperatureColor = [ 1 ];
    let topPValues = [ 0.75 ];
    let frequencyPenaltyValues = [ 0 ];
    let presencePenaltyValues = [ 0 ];

    let draftContent = '';
    let draftRole = 'user';
    let draftName = 'Mac';

    let selectedFunctions = [];
    $: functionCall = selectedFunctions.length ? 'auto' : 'none';

    let listenForWakeWord = true;

    let audioRecorderNode;

    // TODO: configurable
    let maxSilenceMs = 2750;
    let minDecibels = -48;
    let fftSize = 512; // 256 bars

    $: fns = $functions;

    async function loadChatById(id) {
        apiError = void 0;
        chat = await getChat(id);
        log.set(`chat loaded - ${chat?.label ?? chat.id}`);
    }

    $: id && loadChatById(id);

    async function onChatEvent({ detail = {} }) {
        const { action, chat:event_chat } = detail;
        console.log('chat update', action, event_chat);
        await chatsNode.load();
        if (action === 'delete') setTimeout(() => navigate(`/`), 1000);
    }

    async function onVoiceEvent({ detail = {} }) {
        const { content } = detail;
        console.log('voice event', content);
        mimicSynth({ content, voice: $voice });
        //googleSynth(await withSSML(content));
    }

    function resetChatDetails() {
        if (chat.temperature != null)       temperatureValues = [chat.temperature];
        if (chat.top_p != null)             topPValues = [chat.top_p];
        if (chat.frequency_penalty != null) frequencyPenaltyValues = [chat.frequency_penalty];
        if (chat.presence_penalty != null)  presencePenaltyValues = [chat.presence_penalty];
        chatMaxTokens = chat.max_tokens;
        chatN = chat.n;
        chatLabel = chat.label;
        chatModel = chat.model;
    }

    $: chat?.id && resetChatDetails();

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
            loadWorkspaces(),
            loadProjects()
        ]);
        for (const { status, reason } of results) {
            if (status === 'rejected') console.error(reason);
        }
    });

    $: loadProject(project_id);

    async function onWakeWordDetection(event) {
        const word = event?.detail?.label;
        log.set(`wake word ${word}`);
        audioRecorderNode.start();
    }

    async function onRecorderStart(event) {
        log.set('recording started');
    }

    async function addMessageToChat({ content, function_call, role, name }, finish_reason = 'stop', { prompt_tokens = 0, total_tokens = 0, completion_tokens = 0 } = {}) {

        const request = {
            parent_id: chat.message_id,
            content,
            function_call,
            finish_reason,
            role

        };
        if ([ 'user', 'function' ].includes(role) && name?.length) {
            request.name = name;
        }

        const entry = await insertMessage(request);
        const patch = { message_id: entry.id };

        if (prompt_tokens) patch.prompt_tokens = prompt_tokens;
        if (total_tokens) patch.total_tokens = total_tokens;
        if (completion_tokens) patch.completion_tokens = completion_tokens;

        await patchChat(chat.id, patch);

        chat = await getChat(chat.id);
    }

    const clientSideFunctions = {
        async set_chat_label(input) {
            try {
                console.log(`\`set_chat_label\` function invoked with ${JSON.stringify(input)}`);
                const { label } = input;
                await patchChat(chat.id, { label });
                chatsNode.load();
                return `Chat label set successfully.`;
            } catch (error) {
                return `Unable to set chat label.`;
            }
        }
    };

    let autoTTS = false;

    async function submitChat() {

        // post chat completion
        let response = await postChatCompletion(chat, functionCall, selectedFunctions.length ? selectedFunctions : null);

        console.table('RESPONSE', response);

        const { error, usage, choices } = response;

        if (error) {
            apiError = error;
            return;
        }

        const [ choice ] = choices ?? [];
        const { finish_reason, message } = choice;

        if (message.content == null && message.function_call != null) {
            message.content = JSON.stringify(message.function_call);
        }

        // add ai message to chat
        await addMessageToChat(message, finish_reason, usage);

        // handle functions...
        if (finish_reason === 'function_call') {

            const { function_call } = message;

            let function_return = {
                role: 'function',
                name: function_call.name
            };

            const definition = fns.find(fn => fn.name == function_call.name);

            // not a function
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
                    try {
                        if (clientSideFunctions[function_call.name]) {
                            function_return.content = await clientSideFunctions[function_call.name](function_call.arguments);
                        } else {
                            function_return.content = await postFunctionCall({ name: function_call.name, arguments: function_call.arguments });
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
            onVoiceEvent({ detail: { content: message.content } });
        }

    }

    async function onRecorderStop(event) {

        log.set('recording stopped');

        const { blob } = event.detail;

        try {

            if (chat) {

                // transcribe
                const { transcript, file } = await transcribe(blob);
                log.set(`recording saved to ${file.path}`);

                // add user message to chat
                await addMessageToChat({
                    content: transcript,
                    role: 'user',
                    name: draftName
                });

                await submitChat();
            }
        } catch (error) {
            log.set(`error saving recording ${error.stack}`);
        }
    }

    async function onSilence() {
        log.set('silence');
        if (audioRecorderNode?.isRecording()) audioRecorderNode.stop();
    }

    function getNavLinkProps({ location, href, isPartiallyCurrent, isCurrent }) {
        return isPartiallyCurrent ? {
            class: "inline-flex py-3 px-2 text-white bg-secondary-600"
        } : {
            class: "inline-flex py-3 px-2 text-white"
        };
    }

</script>

<DefaultLayout>

    <svelte:fragment slot="top-strip">
        <div class="flex w-full place-content-between pt-0.5">
            <label for="project-id" class="text-xxs uppercase font-mono text-white me-1">
                project:
            </label>
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
                            await patchWorkspace(event.target.value, { project_id: project.id });
                        }
                    }}
                    bind:value={workspace_id}
                >
                    {#each workspaces as option}
                        <option selected={option.id === workspace_id} value={option.id}>{option.label} {option.location_ref}</option>
                    {/each}
                </select>
            </div>

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

                    <div class="mt-[12px] mr-2">
                        <select
                            on:change={async event => {
                                voice.update(_ => event.target.value);
                            }}
                            class="outline-0 border-1 rounded-lg border border-white bg-secondary-100 text-black font-mono p-1 text-xs w-fit"
                        >
                            {#each mimicVoices as {alias, key} (key)}
                                <option value="{key}" selected={$voice == key}>{alias}</option>
                            {/each}
                        </select>
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

    <div class="relative h-full flex flex-col min-h-0" slot="main">

        {#if chat}
            <div
                class="mt-1 bg-white p-8 flex-initial drop-shadow-[0_12px_4px_rgba(255,255,255)] z-10"
            >

                <div class="flex w-full text-xs justify-between">
                    <input
                        on:keyup|stopPropagation
                        on:blur={async () => {
                            await patchChat(chat.id, { label: chatLabel });
                            chatsNode.load();
                        }}
                        class="text-xxl grow truncate" bind:value={chatLabel}
                    />
                    <span class="font-mono text-gray uppercase text-xs">{chat.as_of}</span>
                </div>

                <div class="mt-2 rounded-lg">
                    <button
                        class="w-full flex place-items-center text-gray-800"
                        on:click={() => {
                            $showChatSettings = !$showChatSettings;
                        }}
                    >
                        {#if $showChatSettings}
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 -ml-1">
                              <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
                            </svg>
                        {:else}
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 -ml-1">
                              <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
                            </svg>
                        {/if}
                        <span
                            class="text-xs"
                        >settings</span>
                    </button>

                    {#if $showChatSettings}

                        <div class="mt-3 mb-6 flex justify-between">
                            <div class="flex shrink flex-col mr-2">
                                <select
                                    on:change={async event => {
                                        await patchChat(chat.id, { model: event.target.value });
                                        chatsNode.load();
                                    }}
                                    class="outline-0 border-1 rounded-lg border border-gray bg-gray-200 font-mono p-1 text-xs mt-1 mb-2 w-fit"
                                    bind:value={chatModel}
                                >

                                    {#each chatModelOptions as model (model)}
                                        <option value="{model}" selected={model == (chatModel ?? chat.model)}>{model}</option>
                                    {/each}
                                </select>
                                <label
                                    for="model"
                                    class="w-fit text-gray truncate text-sm"
                                >
                                    model
                                </label>
                            </div>

                            <div class="flex flex-col mr-2">
                                <select
                                    id="max_tokens"
                                    on:keyup|stopPropagation
                                    on:change={async event => {
                                        await patchChat(chat.id, { max_tokens: event.target.value });
                                        chatsNode.load();
                                    }}
                                    class="outline-0 border-1 rounded-lg border border-gray bg-gray-200 font-mono p-1 text-xs mt-1 mb-2 w-fit"
                                    bind:value={chatMaxTokens}
                                >
                                    {#each chatMaxTokensOptions as max_tokens (max_tokens)}
                                        <option value="{max_tokens}" selected={max_tokens == (chatMaxTokens ?? chat.max_tokens)}>{max_tokens}</option>
                                    {/each}
                                </select>
                                <label
                                    for="max_tokens"
                                    class="w-fit text-gray truncate text-sm"
                                >
                                    max_tokens
                                </label>
                            </div>

                            <div class="flex flex-col">

                                <select
                                    id="n"
                                    on:keyup|stopPropagation
                                    on:change={async event => {
                                        await patchChat(chat.id, { n: event.target.value });
                                        chatsNode.load();
                                    }}
                                    class="outline-0 border-1 rounded-lg border border-gray bg-gray-200 font-mono p-1 text-xs mt-1 mb-2 w-fit"
                                    bind:value={chatN}
                                >
                                    {#each chatNOptions as n (n)}
                                        <option value="{n}" selected={n == (chatN ?? chat.n)}>{n}</option>
                                    {/each}
                                </select>

                                <label
                                    for="n"
                                    class="text-gray truncate w-fit text-sm"
                                >
                                    n
                                </label>

                            </div>
                        </div>

                        <div class="grow text-xs grid grid-cols-4 2xl:grid-cols-8 gap-x-6 justify-start mt-4">


                            <label
                                for="temperature"
                                class="w-full text-gray-600 truncate"
                            >
                                temperature
                            </label>

                            <div class="col-span-3" style="--range-slider: {getRangeColor(temperatureValues[0], 1, 30, 70)}; --range-handle-inactive: {getRangeColor(temperatureValues[0], 2)}; --range-handle-focus: {getRangeColor(temperatureValues[0], 2)};">
                                <RangeSlider
                                    id="temperature"
                                    bind:values={temperatureValues}
                                    min={0} max={2} step={0.05}
                                    float
                                    first={false}
                                    last={false}
                                    springValues={{ stiffness: 0.15, damping: 0.4 }}
                                    on:stop={async (event) => {
                                        await patchChat(chat.id, { temperature: event.detail.value });
                                    }}
                                />
                            </div>

                            <label
                                for="top_p"
                                class="w-full text-gray-600 truncate"
                            >
                                top_p
                            </label>

                            <div class="col-span-3" style="--range-slider: {getRangeColor(topPValues[0], 1, 30, 70)}; --range-handle-inactive: {getRangeColor(topPValues[0], 1)}; --range-handle-focus: {getRangeColor(topPValues[0], 1)};">
                                <RangeSlider
                                    id="top_p"
                                    bind:values={topPValues}
                                    min={0} max={1} step={0.025}
                                    float
                                    first={false}
                                    last={false}
                                    springValues={{ stiffness: 0.15, damping: 0.4 }}
                                    on:stop={async (event) => patchChat(chat.id, { top_p: event.detail.value })}
                                />
                            </div>

                            <label
                                for="frequency_penalty"
                                class="w-full text-gray-600 truncate"
                            >
                                frequency_penalty
                            </label>

                            <div class="col-span-3" style="--range-slider: {getInvertedRangeColor(frequencyPenaltyValues[0], 1, 30, 70)}; --range-handle-inactive: {getInvertedRangeColor(frequencyPenaltyValues[0], 1)}; --range-handle-focus: {getInvertedRangeColor(frequencyPenaltyValues[0], 1)};">
                                <RangeSlider
                                    id="frequency_penalty"
                                    bind:values={frequencyPenaltyValues}
                                    min={0} max={1} step={0.025}
                                    float
                                    first={false}
                                    last={false}
                                    springValues={{ stiffness: 0.15, damping: 0.4 }}
                                    on:stop={async (event) => {
                                        await patchChat(chat.id, { frequency_penalty: event.detail.value });
                                    }}
                                />
                            </div>

                            <label
                                for="presence_penalty"
                                class="w-full text-gray-600 truncate"
                            >
                                presence_penalty
                            </label>

                            <div class="col-span-3" style="--range-slider: {getInvertedRangeColor(presencePenaltyValues[0], 1, 30, 70)}; --range-handle-inactive: {getInvertedRangeColor(presencePenaltyValues[0], 1)}; --range-handle-focus: {getInvertedRangeColor(presencePenaltyValues[0], 1)};">
                                <RangeSlider
                                    id="presence_penalty"
                                    bind:values={presencePenaltyValues}
                                    min={0} max={1} step={0.025}
                                    float
                                    first={false}
                                    last={false}
                                    springValues={{ stiffness: 0.15, damping: 0.4 }}
                                    on:stop={async (event) => {
                                        await patchChat(chat.id, { presence_penalty: event.detail.value });
                                    }}
                                />
                            </div>

                        </div>

                        <div class="w-full flex content-start justify-between mt-2 p-2 text-gray-700">
                            <div class="flex">
                                <div class="font-mono text-xxs mr-2 truncate">
                                    <span class="text-gray-400">id</span>
                                    {chat.id}
                                </div>
                                <div class="font-mono text-xxs mr-2 truncate">
                                    <span class="text-gray-400">head</span>
                                    {chat.message_id}
                                </div>
                            </div>
                            <div class="flex">
                                <div class="font-mono text-xxs ml-2">
                                    <span class="text-gray-400">p</span>&nbsp;{chat.prompt_tokens}
                                </div>
                                <div class="font-mono text-xxs ml-2">
                                    <span class="text-gray-400">c</span>&nbsp;{chat.completion_tokens}
                                </div>
                                <div class="font-mono text-xxs ml-2">
                                    <span class="text-gray-400">t</span>&nbsp;{chat.total_tokens}
                                </div>
                            </div>
                        </div>


                    {/if}
                </div>


            </div>

            <div class="relative flex flex-col grow shrink min-h-0">
                <ChatMessages
                    on:chat-event={onChatEvent}
                    on:voice-event={onVoiceEvent}
                    on:log={e => log.set(e)}
                    chat={chat}
                />
            </div>

            <div
                class="w-full bg-white drop-shadow-[0_-12px_4px_rgba(255,255,255)] z-10"
            >
                {#if apiError}
                    <div class="p-8">
                        <div class="border rounded border-danger-200 p-2">
                            <div class="text-xxs text-gray mb-1">type: {apiError.type} code: {apiError.code} param: {apiError.param}</div>
                            <div class="text-md text-danger">{apiError.message}</div>
                        </div>
                    </div>
                {/if}

                <div
                    class="w-full flex pt-6 pb-4 px-8"
                >
                    <textarea
                        on:keyup|stopPropagation
                        bind:value={draftContent}
                        class="outline-0 border-1 grow h-24 rounded-lg border border-gray bg-gray-200 font-mono p-3"
                    ></textarea>
                    <div class="flex flex-col text-xs">

                        <div class="flex grow">
                            <div class="flex grow place-items-center border border-gray-300 rounded-lg py-1 px-2 ml-3">
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
                                <div class="flex grow place-items-center border border-gray-300 rounded-lg py-1 px-2 ml-3">
                                    <label for="message-name" class="pe-2 font-mono">name</label>
                                    <input
                                        id="message-name"
                                        type="text"
                                        on:keyup|stopPropagation
                                        class="outline-0 border-1 rounded-lg border border-gray bg-gray-200 p-0.5 text-xxs"
                                        bind:value={draftName}
                                    />
                                </div>
                            {/if}
                            <button
                                class="border border-secondary bg-secondary-100 rounded-lg p-1 ml-3 w-[5ch]"
                                on:click={async () => {
                                    try {
                                        await addMessageToChat({
                                            content: draftContent,
                                            role: draftRole,
                                            name: draftName
                                        });
                                        draftContent = '';
                                    } catch (error) {
                                        console.error(error.stack);
                                    }
                                }}
                            >
                                add
                            </button>
                        </div>

                        <div class="flex w-full place-content-end mt-2">
                            <div class="shrink grid grid-cols-2 place-items-start border border-gray-300 rounded-lg py-1 px-2 ml-3 h-[55px] max-h-[55px] overflow-y-auto">
                                {#each fns as fn, i (fn.name)}
                                    <div class="flex place-items-center my-0.5">
                                        <input
                                            id={`chat-function-${i}`}
                                            type="checkbox"
                                            class="mt-0.5"
                                            on:change={event => {
                                                const set = new Set(selectedFunctions);
                                                set[event.target.checked ? 'add' : 'delete'](fn);
                                                selectedFunctions = Array.from(set);
                                            }}
                                        />
                                        <label
                                            for={`chat-function-${i}`}
                                            class="px-2 font-mono"
                                         >
                                            {fn.name}
                                        </label>
                                    </div>
                                {/each}
                            </div>
                            <!--
                            <div class="flex place-items-center border border-gray-300 rounded-lg py-1 px-2 ml-3">
                                <label for="message-function-call" class="pe-2 font-mono">function_call</label>
                                <select
                                    id="message-function-call"
                                    on:keyup|stopPropagation
                                    class="outline-0 border-1 rounded-lg border border-gray bg-gray-200 p-0.5 text-xxs"
                                    bind:value={functionCall}
                                >
                                    <option value="none">none</option>
                                    <option value="auto">auto</option>
                                </select>
                            </div>
                            -->
                            <button
                                class="border border-primary bg-primary-100 rounded-lg p-1 ml-3 w-[5ch]"
                                on:click={async () => {
                                    try {
                                        // add ai message to chat
                                        await submitChat();
                                    } catch (error) {
                                        console.error(error.stack);
                                    }
                                }}
                            >
                                send
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        {:else}
            <div class="w-full grow flex flex-col place-items-center p-8">
                <div class="grow flex place-items-center text-gray">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 me-2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                    <span class="text-xxl pb-1">select a chat</span>
                </div>

                <!--
                <div class="p-4">
                    <StateMachine />
                </div>
                -->

            </div>
        {/if}

    </div>

    <div slot="drawer-left">
        <Chats
            bind:this={chatsNode}
            onSelect={c => {
                navigate(`/chat/${c.id}`);
            }}
            selectedChatId={id}
            on:chat-event={onChatEvent}
        />
    </div>

    <div class="p-6" slot="drawer-right">
        <h3>functions</h3>

        <Functions />

        <h3>console</h3>

        <Console {log} {event} />

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
