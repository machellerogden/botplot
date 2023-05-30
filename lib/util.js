import { exec as _exec, spawn as _spawn } from 'node:child_process';
import { inspect, promisify } from 'node:util';
import readline from 'node:readline';
import { Readable } from 'node:stream';
import { EOL } from 'node:os';

export const pprint = (...args) => args.forEach(v => console.log(inspect(v, { colors: true, depth: null })));

export function resetableTimeout(callback, ms, onReset = () => {}) {
    let tid = setTimeout(callback, ms);
    return {
        reset() {
            onReset();
            clearTimeout(tid);
            tid = setTimeout(callback, ms);
        },
        cancel() {
            clearTimeout(tid);
        }
    };
}

export function logError(error) {
    if (error.response) {
        console.log('status:', error.response.status);
        console.log('url:', error.response.url);
        console.log('data:', error.response.data);
    } else {
        console.log(error.message);
    }
    console.error(error.stack);
}

export const exec = promisify(_exec);

export const spawn = (...args) => new Promise((resolve, reject) => {
    const cmd = _spawn(...args);
    let stdout = '';
    let stderr = '';
    cmd.stdout.on('data', (data) => {
        stdout += data.toString();
    });
    cmd.stderr.on('data', (data) => {
        stderr += data.toString();
    });
    cmd.on('exit', (code) => {
        if (code == 0) return resolve({ code, stdout, stderr });
        return reject({ code, stdout, stderr });
    });
});

export const head = ([x]) => x;
export const partial = (f, ...a) => (...r) => f(...a, ...r);

export const sleep = ms =>
    new Promise(r => setTimeout(r, ms));

export const pipe = (...fns) =>
    (...args) =>
        fns.reduce((acc, fn) =>
            fn(acc), fns.shift()(...args));

export const interpose = sep =>
    async function* interposed(chunks) {
        for await (const chunk of chunks) {
            yield chunk;
            yield sep;
        }
    };

export const iterize = data =>
    isAsyncIterator(data)
        ? data
        : Array.isArray(data)
            ? data.values()
            : [ data ].values();

export const byline = input => typeof input?.on === 'function'
    ? readline.createInterface({ input, crlfDelay: Infinity })
    : iterize(typeof input === 'string' ? input.split(EOL) : input);

export const isAsyncIterator = obj =>
    typeof obj?.[Symbol.asyncIterator] === 'function';

export class Streamified extends Readable {
    constructor(it) {
        if (!isAsyncIterator(it)) throw new TypeError('First argument must be a ES6 Async Generator');
        super({ objectMode: true });
        this._it = it;
    }
    _read(size) {
        try {
            this._it.next().then(r => {
                this.push(false === r.done ? r.value : null);
            }).catch(e => {
                this.emit('error', e);
            });
        } catch (e) {
            this.emit('error', e);
        }
    }
}

export const streamify = it => new Streamified(it);

export const linebreak = interpose(EOL);

export async function* jsonify(chunks) {
    for await (const chunk of chunks) yield JSON.stringify(chunk, null, 4);
}
