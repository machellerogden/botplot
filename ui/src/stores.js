import { persist, createLocalStorage } from '@macfja/svelte-persistent-store';
import { writable, derived } from 'svelte/store';
import { audioContext } from './lib/audio.js';
import { getFunctions, getWorkspaces, newWorkspace, getFunctionSets, getCompletionConfigs } from './api.js';
import { mimicVoices } from './constants.js';
import Ajv from 'ajv';

const ajv = new Ajv();

const defaultVoice = mimicVoices[0].key;

export const voice = writable(defaultVoice);

//
// ss collections
//

export const functions = writable([]);
functions.set((await getFunctions()).map(fn => ({
    ...fn,
    validate: ajv.compile(fn.parameters)
})));

export const functionSets = writable([]);
functionSets.set(await getFunctionSets());

export const completionConfigs = writable([]);
completionConfigs.set(await getCompletionConfigs());

const storage = createLocalStorage();


//
// transient globals
//

export const dragging = writable(false);
export const log = writable(null);
log.subscribe(v => v != null && console.log(v));

export const mediaStreamSource = writable(null);

navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    .then(mediaStream => mediaStreamSource.set(audioContext.createMediaStreamSource(mediaStream)))
    .catch(error => console.error(`error getting user media`, error));

//
// persistent globals
//

export const showChatSettings = persist(writable(false), storage, 'show_chat_settings');
export const showCompletionConfig = persist(writable(false), storage, 'show_completion_config');
export const darkMode = persist(writable(false), storage, 'dark_mode');
export const hideLeftSide = persist(writable(false), storage, 'hide_left_side');
export const hideRightSide = persist(writable(false), storage, 'hide_right_side');



export let socket;

export const event = {
    subscribe(cb) {

        // do nothing if socket is already connecting or open
        if (![ WebSocket.CONNECTING, WebSocket.OPEN ].includes(socket?.readyState)) {

            socket = new WebSocket(`ws://localhost:8889/events`); // TODO: get hard-coded port out of here

            socket.addEventListener('open', event => {
                log.set('[websocket] open');
                socket.send(JSON.stringify({ message: 'open' }));
            });

            socket.addEventListener('close', event => {
                log.set('[websocket] close');
                socket.removeEvent
            });

            socket.addEventListener('error', event => {
                log.set(`[websocket] error ${JSON.stringify(event)}`);
            });

            socket.addEventListener('message', event => {
                if (event instanceof MessageEvent) {
                    cb(event);
                } else {
                    log.set(`[websocket] non-MessageEvent\n${JSON.stringify(event)}`);
                }
            });
        }
        return function unsubscribe() {
            socket?.close(1000, 'unsubscribe');
        };
    }
};

function listenForKeys(mapping) {
    const handlers = [ ...mapping.entries() ].map(([ chars, handler ]) => {
        let typed = [];
        return async function triggerListener(event) {
            typed += event.key;
            if (!chars.startsWith(typed)) {
                typed = '';
            } else if (typed.length === chars.length) {
                typed = '';
                await handler();
            }
        };
    });
    return event => handlers.forEach(h => h(event));
}

export const keyboardShortcut = {
    subscribe(cb) {
        const toggles = {};
        const createToggle = k => () => {
            toggles[k] = !toggles[k];
            cb(toggles[k] ? k : null);
        };
        const triggerListener = listenForKeys(new Map([
            ['f', createToggle('search')],
            ['?', createToggle('help')],
            ['d', () => darkMode.update(s => !s)],
            ['Escape', () => cb(null)]
        ]));
        window.addEventListener('keyup', triggerListener);
        return function unsubscribe() {
            window.removeEventListener('keyup', triggerListener);
        };
    }
};

