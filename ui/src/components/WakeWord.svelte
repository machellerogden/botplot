<script>

    import { tick } from 'svelte';
    import { WebVoiceProcessor } from '@picovoice/web-voice-processor';
    import { PorcupineWorker } from '@picovoice/porcupine-web';
    import { createEventDispatcher } from 'svelte';
    import { keywordModels, porcupineModel } from '../lib/picovoice.js';
    import Toggle from './Toggle.svelte';

    export let listen = false;

    const dispatch = createEventDispatcher();

    let porcupine;
    async function detectionCallback(detection) {
        if (detection) {
            dispatch('detection', detection);
            console.log(`keyword detected at ${(new Date()).toLocaleTimeString()}: ${detection.label} (index = ${detection.index})`);
        }
    }

    export async function stop() {
        if (!(WebVoiceProcessor?.isRecording && porcupine?.terminate)) return;
        await WebVoiceProcessor.unsubscribe(porcupine);
        await porcupine.terminate();
        console.log(`WebVoiceProcessor unsubscribed`);
        listen = false;
    }

    export async function start() {
        if (WebVoiceProcessor.isRecording) return;

        const accessKey = __PICOVOICE_ACCESS_KEY__;

        console.log(`Porcupine loading. Please wait...`);

        try {

            porcupine = await PorcupineWorker.create(
                accessKey,
                keywordModels,
                detectionCallback,
                porcupineModel
            );

            console.log(`WebVoiceProcessor initializing. Microphone permissions requested ...`);

            await WebVoiceProcessor.subscribe(porcupine);
            listen = true;

            console.log(`WebVoiceProcessor ready`);

        } catch (error) {
            console.log(`error starting porcupine worker`, error);
        }
    }

    $: { (listen ? start : stop)(); };

</script>

<Toggle bind:value={listen} ping={true} />
