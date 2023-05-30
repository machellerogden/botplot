<script>

    import { onMount, onDestroy, createEventDispatcher } from 'svelte';
    import { resetableTimeout } from '../util.js';
    import { mediaStreamSource } from '../stores.js';

    const dispatch = createEventDispatcher();

    let mediaRecorder;
    let chunks = [];
    let blob;
    let objectURL;

    export const isRecording = () => mediaRecorder?.state === 'recording';

    function onDataAvailable(e) {
        if (e.data.size > 0) chunks.push(e.data);
        dispatch('dataavailable', { chunk: e.data });
    }

    function onStop() {
        blob = new Blob(chunks, { type: 'audio/webm' });
        objectURL = URL.createObjectURL(blob);
        dispatch('stop', { blob });
    }

    function refreshListeners() {
          try {
              mediaRecorder?.removeEventListener('dataavailable', onDataAvailable);
              mediaRecorder?.removeEventListener('stop', onStop);
          } catch (e) {}
          mediaRecorder?.addEventListener('dataavailable', onDataAvailable);
          mediaRecorder?.addEventListener('stop', onStop);
    }

    export function reset() {
        dispatch('reset');
        chunks = [];
        blob = null;
    }

    export function stop() {
        if (mediaRecorder?.state !== 'inactive') {
            mediaRecorder?.stop();
            console.log(`recording stopped`);
        } else {
            console.log(`already inactive, can't stop - state: ${mediaRecorder?.state}`);
        }
        mediaRecorderState = mediaRecorder?.state;
    }

    export function start() {
        reset();
        if (mediaRecorder?.state !== 'recording') {
            dispatch('start');
            mediaRecorder?.start(); // TODO: timeslice { timeslice: 1000 }
        } else {
            console.log(`already recording, can't record - state: ${mediaRecorder?.state}`);
        }
        mediaRecorderState = mediaRecorder?.state;
    }

    $: mediaRecorderState = mediaRecorder?.state ?? 'inactive';
    $: recording = mediaRecorderState === 'recording';

    $: {
        if ($mediaStreamSource) {
            $mediaStreamSource.context.resume();
            mediaRecorder = new MediaRecorder($mediaStreamSource.mediaStream, { mimeType: 'audio/webm' });
        }
    };

    $: { if (mediaRecorder) refreshListeners(); }

</script>

<div class="flex w-full text-gray-800">
    <button class="relative flex h-3 w-3 mx-1.5 mt-0.5" on:click={() => (recording ? stop : start)() }>
        {#if recording}
            <span class="absolute w-full h-full inline-flex rounded-full opacity-75 bg-danger-400 animate-ping"></span>
            <span class="inline-flex rounded-full h-3 w-3 bg-danger-400"></span>
        {:else}
            <span class="inline-flex rounded-full h-3 w-3 bg-secondary-300"></span>
        {/if}
    </button>
</div>
