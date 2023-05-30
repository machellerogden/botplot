<script context="module">
    import mermaid from 'mermaid';
    mermaid.initialize({ startOnLoad: true });
</script>

<script>
    import { tick } from 'svelte';

    export let lang;
    export let text;

    $: {
        if (text) {
            if (lang == 'mermaid') {
                tick().then(() => mermaid.run({ querySelector: '.mermaid'}));
            } else if (lang) {
                try {
                    text = window.hljs.highlight(text, { language: lang }).value;
                } catch (error) {
                    console.error(error);
                }
            }
        }
    };

</script>

<div class="my-2">
    <pre><code class={lang}>{@html text}</code></pre>
</div>
