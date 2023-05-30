<script>
  import { createMachine, assign } from 'xstate';
  import { useMachine } from './useMachine.js';
  import Button from './Button.svelte';

  const toggleMachine = createMachine({
      id: 'toggle',
      initial: 'inactive',
      context: {
          count: 0
      },
      states: {
          inactive: {
              on: { TOGGLE: 'active' }
          },
          active: {
          entry: assign({ count: ctx => ctx.count + 1 }),
              on: { TOGGLE: 'inactive' }
          }
      },
      predictableActionArguments: true
  });

  const { state, send } = useMachine(toggleMachine);

  $: active = $state.matches('active');
  $: count = $state.context.count;
</script>

<style>
  main {
    font-family: sans-serif;
    text-align: center;
  }
</style>

<main>
    <h1>XState Svelte Template</h1>
    <h2>Fork this template!</h2>
    <button on:click={() => send('TOGGLE')}>Click me ({active ? '✅' : '❌'})</button>
    {' '}
    <code>Toggled <strong>{count}</strong> times</code>
</main>
