<script>
    import { createEventDispatcher } from 'svelte';
    import RangeSlider from 'svelte-range-slider-pips';
    import { chatModelOptions, chatMaxTokensOptions, chatNOptions, mimicVoices } from '../constants.js';
    import { getCompletionConfig, patchCompletionConfig } from '../api.js';

    const dispatch = createEventDispatcher();

    export let id;

    let config = {};

    async function load(id) {
        try {
            config = await getCompletionConfig(id);
            dispatch('load', { ...config });
        } catch (error) {
            config = {};
            dispatch('error', error);
        }
    }

    $: id && load(id);

    const getRangeColor = (value, base = 1, sat = 100, light = 30) => `hsl(${Math.round((value / base) * 180)}, ${sat}%, ${light}%)`;
    const getInvertedRangeColor = (value, base = 1, sat = 100, light = 30) => `hsl(${(100 - Math.round((value / base) * 180))}, ${sat}%, ${light}%)`;

    let label;
    let model;
    let maxTokens;
    let n;
    let temperatureValues = [ 1 ];
    let temperatureColor = [ 1 ];
    let topPValues = [ 0.75 ];
    let frequencyPenaltyValues = [ 0 ];
    let presencePenaltyValues = [ 0 ];

    function resetFormValues() {
        if (config.temperature != null)       temperatureValues = [config.temperature];
        if (config.top_p != null)             topPValues = [config.top_p];
        if (config.frequency_penalty != null) frequencyPenaltyValues = [config.frequency_penalty];
        if (config.presence_penalty != null)  presencePenaltyValues = [config.presence_penalty];
        maxTokens = config.max_tokens;
        n = config.n;
        label = config.label;
        model = config.model;
    }

    $: config?.id && resetFormValues();

</script>

{#if id}
    <div class="flex flex-col">

        <input
            on:keyup|stopPropagation
            on:blur={async event => {
                await patchCompletionConfig(config.id, { label: event.target.value });
            }}
            class="outline-0 font-mono grow truncate py-1 text-lg mt-1 mb-2 w-fit"
            bind:value={label}
        />

        <div class="grid grid-cols-3 gap-3 gap-x-6 justify-start mt-4 text-xs font-mono text-gray-700">

            <!--
            <div class="truncate text-gray-400">id</div>
            <div class="col-span-2">{config.id}</div>

            <div class="truncate text-gray-400">as_of</div>
            <div class="col-span-2">{config.as_of}</div>
            -->

            <label
                for="model"
                class="truncate text-gray-400"
            >
                model
            </label>
            <select
                on:change={async event => {
                    await patchCompletionConfig(config.id, { model: event.target.value });
                }}
                class="col-span-2 outline-0 border-1 rounded-lg border border-gray bg-gray-200 font-mono p-1 text-xxs mt-1 mb-2 w-fit"
                bind:value={model}
            >
                {#each chatModelOptions as option (option)}
                    <option value="{option}" selected={option == (model ?? config.model)}>{option}</option>
                {/each}
            </select>

            <label
                for="max_tokens"
                class="truncate text-gray-400"
            >
                max_tokens
            </label>
            <select
                id="max_tokens"
                on:keyup|stopPropagation
                on:change={async event => {
                    await patchCompletionConfig(config.id, { max_tokens: event.target.value });
                }}
                class="col-span-2 outline-0 border-1 rounded-lg border border-gray bg-gray-200 font-mono p-1 text-xxs mt-1 mb-2 w-fit"
                bind:value={maxTokens}
            >
                {#each chatMaxTokensOptions as option (option)}
                    <option value="{option}" selected={option == (maxTokens ?? config.max_tokens)}>{option}</option>
                {/each}
            </select>

            <label
                for="n"
                class="truncate text-gray-400"
            >
                n
            </label>
            <select
                id="n"
                on:keyup|stopPropagation
                on:change={async event => {
                    await patchCompletionConfig(config.id, { n: event.target.value });
                }}
                class="col-span-2 outline-0 border-1 rounded-lg border border-gray bg-gray-200 font-mono p-1 text-xxs mt-1 mb-2 w-fit"
                bind:value={n}
            >
                {#each chatNOptions as option (option)}
                    <option value="{option}" selected={option == (n ?? config.n)}>{option}</option>
                {/each}
            </select>

            <label
                for="temperature"
                class="truncate text-gray-400"
            >
                temperature
            </label>
            <div class="col-span-2" style="--range-slider: {getRangeColor(temperatureValues[0], 1, 30, 70)}; --range-handle-inactive: {getRangeColor(temperatureValues[0], 2)}; --range-handle-focus: {getRangeColor(temperatureValues[0], 2)};">
                <RangeSlider
                    id="temperature"
                    bind:values={temperatureValues}
                    min={0} max={2} step={0.05}
                    float
                    first={false}
                    last={false}
                    springValues={{ stiffness: 0.15, damping: 0.4 }}
                    on:stop={async (event) => {
                        await patchCompletionConfig(config.id, { temperature: event.detail.value });
                    }}
                />
            </div>

            <label
                for="top_p"
                class="truncate text-gray-400"
            >
                top_p
            </label>
            <div class="col-span-2" style="--range-slider: {getRangeColor(topPValues[0], 1, 30, 70)}; --range-handle-inactive: {getRangeColor(topPValues[0], 1)}; --range-handle-focus: {getRangeColor(topPValues[0], 1)};">
                <RangeSlider
                    id="top_p"
                    bind:values={topPValues}
                    min={0} max={1} step={0.025}
                    float
                    first={false}
                    last={false}
                    springValues={{ stiffness: 0.15, damping: 0.4 }}
                    on:stop={async (event) => patchCompletionConfig(config.id, { top_p: event.detail.value })}
                />
            </div>

            <label
                for="frequency_penalty"
                class="truncate text-gray-400"
            >
                frequency_penalty
            </label>
            <div class="col-span-2" style="--range-slider: {getInvertedRangeColor(frequencyPenaltyValues[0], 1, 30, 70)}; --range-handle-inactive: {getInvertedRangeColor(frequencyPenaltyValues[0], 1)}; --range-handle-focus: {getInvertedRangeColor(frequencyPenaltyValues[0], 1)};">
                <RangeSlider
                    id="frequency_penalty"
                    bind:values={frequencyPenaltyValues}
                    min={0} max={1} step={0.025}
                    float
                    first={false}
                    last={false}
                    springValues={{ stiffness: 0.15, damping: 0.4 }}
                    on:stop={async (event) => {
                        await patchCompletionConfig(config.id, { frequency_penalty: event.detail.value });
                    }}
                />
            </div>

            <label
                for="presence_penalty"
                class="truncate text-gray-400"
            >
                presence_penalty
            </label>
            <div class="col-span-2" style="--range-slider: {getInvertedRangeColor(presencePenaltyValues[0], 1, 30, 70)}; --range-handle-inactive: {getInvertedRangeColor(presencePenaltyValues[0], 1)}; --range-handle-focus: {getInvertedRangeColor(presencePenaltyValues[0], 1)};">
                <RangeSlider
                    id="presence_penalty"
                    bind:values={presencePenaltyValues}
                    min={0} max={1} step={0.025}
                    float
                    first={false}
                    last={false}
                    springValues={{ stiffness: 0.15, damping: 0.4 }}
                    on:stop={async (event) => {
                        await patchCompletionConfig(config.id, { presence_penalty: event.detail.value });
                    }}
                />
            </div>

        </div>
    </div>
{/if}
