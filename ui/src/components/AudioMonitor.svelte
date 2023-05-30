<script>

    import { onMount, onDestroy } from 'svelte';
    import { createEventDispatcher } from 'svelte';
    import { resetableTimeout } from '../util.js';
    import { mediaStreamSource } from '../stores.js';

    const dispatch = createEventDispatcher();

    export let maxSilenceMs = 3000;
    export let minDecibels = -48; // using sound floor for silence detection, see notes below
    export let fftSize = 512;

    let analyser;

    let canvasNode;
    let wrapperNode;

    let bufferLength;
    let byteFrequencyData;

    let canvasWidth = 1;
    let canvasHeight = 1;

    let resizeObserver;

    let sound = false;
    let silence = true;

    onMount(async () => {
        resizeObserver = new ResizeObserver((entries) => {
            canvasWidth = wrapperNode?.offsetWidth || 300;
            canvasHeight = wrapperNode?.offsetHeight || 300;
        });
        resizeObserver.observe(wrapperNode);
        analyse();
    });

    onDestroy(async () => {
        resizeObserver.unobserve(wrapperNode);
        resizeObserver = null;
    });

    let timer;

    $: {
        if (sound) {
            dispatch('sound');
            silence = false;
            if (timer == null || timer?.complete) {
                // no timer, need timer
                // old timer done, need new timer
                timer = resetableTimeout(() => { silence = true; }, maxSilenceMs);
            } else {
                // timer not done, reset timer
                timer.reset();
            }
        }
    }

    $: { if (silence) dispatch('silence'); }

    $: canvasCtx = canvasNode?.getContext('2d');

    $: {
        if ($mediaStreamSource) {
            $mediaStreamSource.context.resume();
            analyser = $mediaStreamSource.context.createAnalyser();
            analyser.minDecibels = minDecibels;
            analyser.fftSize = fftSize;
            bufferLength = analyser.frequencyBinCount; // nb, frequencyBinCount is alway half off fft set above
            byteFrequencyData = new Uint8Array(bufferLength);
            $mediaStreamSource.connect(analyser);
        }
    }


    const U_INT8 = 256;

    function analyse() {
        window.requestAnimationFrame(analyse);
        if (analyser && canvasCtx) {
            analyser.getByteFrequencyData(byteFrequencyData); 
            let isSoundEvent = false;
            canvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);
            const maxX = bufferLength / 5; // visualize only first 20% of range
            const barWidth = (canvasWidth / maxX) * 2.5;
            let barHeight;
            let x = 0;
            for (let i = 0; i < maxX; i++) {
                if ((!isSoundEvent && byteFrequencyData[i] > 0)) isSoundEvent = true;
                barHeight = (byteFrequencyData[i] / U_INT8) * canvasHeight;
                const color = (barHeight / canvasHeight) * -180;
                canvasCtx.fillStyle = `hsla(${color}, 80%, 50%, 1)`;
                canvasCtx.fillRect(x, canvasHeight - barHeight, barWidth, barHeight);
                x += barWidth;
            }
            sound = isSoundEvent;
        }
    }

</script>

<div bind:this={wrapperNode} class="w-full h-full pointer-events-none">
    <canvas bind:this={canvasNode} width={canvasWidth} height={canvasHeight}></canvas>
</div>
