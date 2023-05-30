<script>

    import wasmModuleUrl from '../../node_modules/rustpotter-worklet/dist/rustpotter_wasm_bg.wasm?url';
    import workletUrl from '../../node_modules/rustpotter-worklet/dist/rustpotter-worklet.js?url';

    let rustpotterService;
    let name;
    let score;

    (async () => {

        try {
            const { RustpotterService } = await import('rustpotter-worklet');

            if (!RustpotterService.isRecordingSupported()) console.error(`Unable to record in this browser :(`);

            rustpotterService = new RustpotterService({
                workletPath: workletUrl.href,
                wasmPath: wasmModuleUrl.href,
                averagedThreshold: 0.25,
                threshold: 0.5
            });

            rustpotterService.onspot = (_name, _score) => {
                console.log(`detection: '${_name}'[${_score}]`);
                name = _name;
                score = _score;
            };
            rustpotterService.onstart = () => {
                console.info('rustpotterService is started');
            };
            rustpotterService.onstop = () => {
                console.info('rustpotterService is stopped');
            };

            rustpotterService.onpause = () => {
                console.info('rustpotterService is paused');
            };

            rustpotterService.onresume = () => {
                console.info('rustpotterService is resuming');
            };

            const response = await window.fetch('http://localhost:5173/hey_bot.rpw');
            console.log('fetched');
            const wakeWordData = await response.arrayBuffer();
            console.log('wake word data', wakeWordData);
            console.log('starting rustpotter...', rustpotterService.getState());

            setTimeout(() => console.log('state', rustpotterService.getState()), 12000);
            await rustpotterService.start();
            await rustpotterService.addWakeword(wakeWordData); // a wakeword file available for download
            console.log('done');

        } catch (error) {
            console.error('oh no. oh no. oh no no no no no.');
            console.error(error);
        }

    })();

</script>

<p>{name}</p>
<p>{score}</p>
