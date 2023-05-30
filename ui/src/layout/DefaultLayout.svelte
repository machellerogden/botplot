<script>
    import { Link } from 'svelte-navigator';
    import { darkMode, hideLeftSide, hideRightSide } from '../stores.js';
    import { keyboardShortcut } from '../stores.js';

    let topNode = {};

    $: topOffsetHeight = topNode?.offsetHeight || 0;

    let fullHeight = window.innerHeight - topOffsetHeight;

    function onResize() {
        fullHeight = window.innerHeight - topOffsetHeight;
    }

    $: {
        fullHeight = window.innerHeight - topOffsetHeight;
    }

    function toggleLeftSide() {
        $hideLeftSide = !$hideLeftSide;
    }

    function toggleRightSide() {
        $hideRightSide = !$hideRightSide;
    }

    const widthMin = 380;

    let rightEl = {};

    $: rightOffsetWidth = rightEl?.offsetWidth || 280;
    $: rightWidth = Math.max(rightOffsetWidth, widthMin);

    const handleRightResizeMove = (evt) => {
        rightOffsetWidth = rightOffsetWidth - evt.movementX;
    };

    const handleRightResizeEnd = () => {
        removeEventListener('mousemove', handleRightResizeMove);
        removeEventListener('mouseup', handleRightResizeEnd);
    };

    const handleRightResizeStart = () => {
        addEventListener('mousemove', handleRightResizeMove);
        addEventListener('mouseup', handleRightResizeEnd);
    };

    let leftEl = {};
    let leftMaxWidth = 640;

    $: leftOffsetWidth = leftEl?.offsetWidth || widthMin;
    $: leftWidth = Math.min(leftMaxWidth, Math.max(leftOffsetWidth, widthMin));

    const handleLeftResizeMove = (evt) => {
        leftOffsetWidth = leftOffsetWidth + evt.movementX;
    };

    const handleLeftResizeEnd = () => {
        removeEventListener('mousemove', handleLeftResizeMove);
        removeEventListener('mouseup', handleLeftResizeEnd);
    };

    const handleLeftResizeStart = () => {
        addEventListener('mousemove', handleLeftResizeMove);
        addEventListener('mouseup', handleLeftResizeEnd);
    };

    // dark mode

    $: {
        window.document.documentElement.style.backgroundColor = 'white';
        window.document.documentElement.style.filter = $darkMode ? `invert(1) hue-rotate(180deg) contrast(90%) sepia(8%) brightness(93%)` : '';
    };

</script>

<svelte:window on:resize={onResize} />

<div class="w-full relative box-border subpixel-antialiased">

    <div bind:this={topNode} class="fixed top-0 left-0 w-full z-40">

        <div class="flex text-sm bg-secondary-800 font-medium text-center text-gray-600 w-full justify-items-start ps-1 pe-1 py-1">
            <slot name="top-strip"></slot>
            <button on:click={() => darkMode.update(s => !s)} class="text-secondary-200 hover:text-white ps-1 pe-1">
                {#if $darkMode}
                    <svg fill="currentColor" class="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0V0Z"/><path d="M6.76 4.84l-1.8-1.79 -1.41 1.41 1.79 1.79ZM1 10.5h3v2H1ZM11 .55h2V3.5h-2Zm8.04 2.495l1.4 1.407 -1.79 1.79 -1.407-1.41Zm-1.8 15.11l1.79 1.8 1.41-1.41 -1.8-1.79ZM20 10.49h3v2h-3Zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6 -2.69-6-6-6Zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4 -1.79 4-4 4Zm-1 4h2v2.95h-2Zm-7.45-.96l1.41 1.41 1.79-1.8 -1.41-1.41Z"/></svg>
                {:else}
                    <svg fill="currentColor" class="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="none" d="M0 0h24v24H0Z"/><path d="M6.76 4.84l-1.8-1.79 -1.41 1.41 1.79 1.79 1.42-1.41ZM4 10.5H1v2h3v-2Zm9-9.95h-2V3.5h2V.55Zm7.45 3.91l-1.41-1.41 -1.79 1.79 1.41 1.41 1.79-1.79Zm-3.21 13.7l1.79 1.8 1.41-1.41 -1.8-1.79 -1.4 1.4ZM20 10.5v2h3v-2h-3Zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6 -2.69-6-6-6Zm-1 16.95h2V19.5h-2v2.95Zm-7.45-3.91l1.41 1.41 1.79-1.8 -1.41-1.41 -1.79 1.8Z"/></svg>
                {/if}
            </button>
        </div>

        <nav class="bg-secondary shadow px-3">
            <slot name="top-bar"></slot>
        </nav>

    </div>


    <div style="margin-top:{topOffsetHeight}px;margin-bottom:-{topOffsetHeight}px;height:{fullHeight}px" class="w-full flex flex-no-wrap h-full justify-between relative">

        <!-- left drawer -->
        <div
            bind:this={leftEl}
            style="width:{leftWidth}px;"
            class="relative h-full flex-none z-20 bg-white"
            class:hidden="{$hideLeftSide}">
            <div
                class="w-full max-w-full box-border border-gray border-r overflow-auto"
                class:shadow={!$hideLeftSide}
                style="height:{fullHeight}px"
                >

                <!-- left drawer contents here -->
                <slot name="drawer-left"></slot>

            </div>
            <div
                style="left:{leftWidth - 5}px"
                class="absolute right-0 w-full overflow-auto box-border"
                >
                <span on:mousedown={handleLeftResizeStart}
                    class="select-none block fixed w-1 top-[calc(50%_-_60px)] h-[120px] bg-gray-200 transition ease-in-out delay-150 duration-200 cursor-col-resize z-30 border border-r-0 border-gray-300 rounded-tl rounded-bl"></span>
            </div>
        </div>

        <!-- left drawer trigger -->
        <div
            class="transition-all z-30 fixed bottom-4 left-2 p-1 text-gray-900 rounded-full border border-gray-300 hover:border-secondary bg-gray-100 hover:bg-secondary hover:text-white transition ease-in-out text-xs flex place-content-center"
            class:bottom-4={!$hideLeftSide}
            class:bottom-2={$hideLeftSide}
            class:h-12={$hideLeftSide}
            class:rounded-l-none={$hideLeftSide}
            class:-ml-5={$hideLeftSide}
            >
            <button on:click={toggleLeftSide}>
                {#if $hideLeftSide}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="inline-block w-5 h-5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="inline-block w-5 h-5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                {/if}
            </button>
        </div>

        <!-- main content -->
        <div class="flex flex-col grow px-2" style="height:{fullHeight}px;">
            <slot name="main"></slot>
        </div>

        <!-- right drawer -->
        <div
            bind:this={rightEl}
            style="width:{rightWidth}px"
            class="relative h-full flex-none bg-white z-20"
            class:hidden="{$hideRightSide}"
            >
            <div
                class="w-full max-w-full box-border border-gray border-l overflow-auto"
                class:shadow={!$hideRightSide}
                style="height:{fullHeight}px"
                >

                <!-- right drawer contents here -->
                <slot name="drawer-right"></slot>

            </div>
            <div class="absolute left-[1px] w-full overflow-auto box-border">
                <span on:mousedown={handleRightResizeStart} class="select-none block fixed w-1 top-[calc(50%_-_60px)] h-[120px] bg-gray-200 transition ease-in-out delay-150 duration-200 cursor-col-resize z-30 border border-l-0 border-gray-300 rounded-tr rounded-br"></span>
            </div>
        </div>

        <div
            class="transition-all z-30 fixed right-2 p-1 text-gray-900 rounded-full border border-gray-300 hover:border-secondary bg-gray-100 hover:bg-secondary hover:text-white transition ease-in-out text-xs flex place-content-center"
            class:bottom-4={!$hideRightSide}
            class:bottom-2={$hideRightSide}
            class:h-12={$hideRightSide}
            class:rounded-r-none={$hideRightSide}
            class:-mr-5={$hideRightSide}
            >
            <button on:click={toggleRightSide}>
                {#if $hideRightSide}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="inline-block w-5 h-5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                    </svg>
                {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="inline-block w-5 h-5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                {/if}
            </button>
        </div>

    </div>
</div>

{#if $keyboardShortcut === 'search'}
    <div class="fixed top-0 left-0 w-screen h-screen flex place-content-center place-items-center bg-white z-40">
        <div class="w-96">
            <div class="my-4">
                content
            </div>
        </div>
    </div>
{/if}

{#if $keyboardShortcut === 'help'}
    <div class="fixed top-0 left-0 w-screen h-screen flex place-content-center place-items-center bg-white z-40">
        <div class="w-96">
            <div class="my-4">
                <div class="grid grid-cols-4 gap-1.5">
                    <div class="font-mono w-full"><div class="p-2 bg-gray-200">?</div></div>
                    <div class="col-span-3"><div class="p-2 bg-gray-100">show this help text</div></div>
                    <div class="font-mono w-full"><div class="p-2 bg-gray-200">Esc</div></div>
                    <div class="col-span-3"><div class="p-2 bg-gray-100">close dialog overlay (such as this help text)</div></div>
                    <div class="font-mono w-full"><div class="p-2 bg-gray-200">/</div></div>
                    <div class="col-span-3"><div class="p-2 bg-gray-100">search</div></div>
                </div>
            </div>
        </div>
    </div>
{/if}
