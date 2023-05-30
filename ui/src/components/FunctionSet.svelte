<script>
    import { createEventDispatcher } from 'svelte';
    import {
        getFunctionSet,
        patchFunctionSet,
        addFunctionToSet,
        removeFunctionFromSet
    } from '../api.js';

    import { functions as functionsStore } from '../stores.js';

    const dispatch = createEventDispatcher();

    export let id;

    let function_set = {};

    $: functions = function_set?.functions || [];

    async function load(id) {
        if (id) {
            try {
                function_set = await getFunctionSet(id);
                dispatch('load', function_set);
            } catch (error) {
                function_set = {};
                dispatch('error', error);
            }
        }
    }

    $: load(id);

    let label;
    let description;

    function resetFormValues() {
        label = function_set.label;
        description = function_set.description;
    }
    $: function_set?.id && resetFormValues();

    $: selected_function_names = new Set(functions?.map(({ name }) => name) ?? []);
    $: allFunctions = $functionsStore;

</script>

{#if id}

<div class="w-full">

    <input
        on:keyup|stopPropagation
        on:blur={async event => {
            await patchFunctionSet(function_set.id, { label: event.target.value });
        }}
        class="outline-0 w-full font-mono grow truncate py-1 text-lg mt-1 mb-2"
        bind:value={label}
    />

    <textarea
        on:keyup|stopPropagation
        on:blur={async event => {
            await patchFunctionSet(function_set.id, { description: event.target.value });
        }}
        class="outline-0 w-full font-mono grow py-1 text-xxs mb-2"
        bind:value={description}
    />

    <div class="text-secondary mb-2">functions</div>

    <div class="grid grid-cols-2 gap-2 gap-x-6 justify-start text-xs font-mono text-gray-700">

        {#each allFunctions as option, i (option.name)}
            <div class="flex place-items-center my-0.5 text-xxs">
                <input
                    id={`chat-function-${i}`}
                    type="checkbox"
                    class="mt-0.5"
                    checked={selected_function_names.has(option.name)}
                    on:change={async event => {
                        if (event.target.checked) {
                            selected_function_names.add(option.name);
                            try {
                                await addFunctionToSet(id, option.name);
                                await load(id);
                            } catch (error) {
                                dispatch('error', error);
                            }
                            dispatch('fn-added', option);
                        } else {
                            selected_function_names.delete(option.name);
                            try {
                                const fn = functions.find(fn => fn.name === option.name);
                                if (fn.id) await removeFunctionFromSet(fn.id);
                                await load(id);
                            } catch (error) {
                                dispatch('error', error);
                            }
                            dispatch('fn-removed', option);
                        }
                    }}
                />
                <label
                    for={`chat-function-${i}`}
                    class="px-2 font-mono"
                 >
                    {option.name}
                </label>
            </div>
        {/each}

    </div>

    {#each (functions || []) as fn}
        <div class="mt-2 text-xs font-mono text-gray-700">

            <div class="truncate text-black">{fn.name}</div>
            <div class="truncate text-gray">{fn.description}</div>
            <div class="whitespace-pre-wrap text-tiny">{JSON.stringify(JSON.parse(fn.parameters), null, 4)}</div>

        </div>
    {/each}

</div>
{/if}
