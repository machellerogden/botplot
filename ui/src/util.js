'use strict';

export const omit = (o, ks) =>
    !ks?.length ? o : Object.entries(o).reduce((acc, [ k, v ]) =>
        ks.includes(k) ? acc : { ...acc, [k]: v }, {});

export const pick = (o, ks) =>
    !ks?.length ? o : Object.entries(o).reduce((acc, [ k, v ]) =>
        ks.includes(k) ? { ...acc, [k]: v } : acc, {});

export const partial = (fn, ...args) =>
    (...rest) => fn(...args, ...rest);

export const partialRight = (fn, ...args) =>
    (...rest) => fn(...rest, ...args);

export const partition = (arr, count = 2) =>
    arr.reduce((acc, v, i) => {
        if (i % count) {
            acc[acc.length - 1].push(v);
        } else {
            acc.push([ v ]);
        }
        return acc;
    }, []);

export const pipe = (...fns) =>
    (...args) =>
        fns.reduce((acc, fn) =>
            fn(acc), fns.shift()(...args));

export const compose = (...fns) =>
    (...args) =>
        fns.reduceRight((acc, fn) =>
            fn(acc), fns.pop()(...args));

export const get = (o, ks, d) =>
    ks.reduce((a, k, i, c, v = a?.[k]) =>
        v == null ? (c.length = i, void 0) : v,
        o) || d;

export const set = (o, ks, v) => {
    let c = o, i = ks.length;
    for (const k of ks) {
        if (--i === 0) return (c[k] = v, o);
        let n = c?.[k];
        c = n == null ? typeof k === 'number' ? [] : {} : n;
    }
    return o;
};

const scalarTypes = new Set([
    'string',
    'number',
    'bigint',
    'boolean',
    'undefined',
    'symbol'
]);

export const isScalar = v =>
  v == null || scalarTypes.has(typeof v);

export const flattenForDiff = entry =>
    Object.entries(entry).reduce((acc, [ k, v ]) => {
        if (isScalar(v)) {
            acc[k] = v;
            return acc;
        }
        if (Array.isArray(v)) {
            acc[k] = JSON.stringify(v);
            return acc;
        }
        if (typeof v === 'object') {
            for (const [ sk, sv ] of Object.entries(v)) {
                acc[`${k}.${sk}`] = isScalar(sv)
                    ? sv
                    : JSON.stringify(sv);
            }
            return acc;
        }
        throw new Error('unreachable', { cause: v });
    }, {});

export const prepareForDiff = coll =>
  (coll || []).map(flattenForDiff);

export const debounce = (fn, ms, timeout) =>
    (...args) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), ms);
    };

export const throttle = (fn, ms, paused = false) =>
    (...args) => {
        if (!paused) {
            fn(...args);
            paused = true;
            setTimeout(() => { paused = false; }, ms);
        }
    };

export const sleep = ms => new Promise(r => setTimeout(r, ms));

const customSort = sortOrder => (a, b) => {
    const ordering = sortOrder.reduce((acc, v, i) => (acc[v] = i, acc), {});
    return a in ordering && b in ordering ? ordering[a] - ordering[b]
         : a in ordering || b in ordering ? 1
         :                                  0;
};

const compare = (a, b, asc, sortOrder) => {
    const [ va, vb ] = asc ? [ a, b ] : [ b, a ];
    const [ ta, tb ] = [ typeof va, typeof vb ];
    return Array.isArray(sortOrder)               ? customSort(sortOrder)(va, vb)
         : [ ta, tb ].every(t => t === 'string')  ? va.localeCompare(vb)
         : [ ta, tb ].every(t => t === 'number')  ? (va < vb ? -1 : va > vb ? 1 : 0)
         : [ ta, tb ].every(t => t === 'object')  ? (va < vb ? -1 : va > vb ? 1 : 0)
         : [ ta, tb ].every(t => t === 'boolean') ? (va === false && vb === true ? -1 : va === true && vb === false ? 1 : 0)
         :                                          -1;
};

function compareBy(by, a, b, asc, sortOrder) {
    const tby = typeof by;
    if ([ 'string', 'number' ].includes(tby)) return compare(a[by], b[by], asc, sortOrder);
    if (tby === 'function') return compare(by(a), by(b), asc, sortOrder);
    if (Array.isArray(by)) return by.reduce((sign, k) => sign === 0 ? compareBy(k, a, b, asc, sortOrder) : sign, 0);
    throw new Error('invalid');
}

export const sortBy = (by, asc, sortOrder) => (a, b) =>
    compareBy(by, a, b, asc == null ? true : asc, sortOrder);

export const copyText = (text, done) => async (evt) => {
    const data = [
        new window.ClipboardItem({
            'text/plain': new Blob([ text ], { type: 'text/plain' })
        })
    ];
    try {
        await window.navigator.clipboard.write(data);
        console.log('Copied to clipboard successfully!');
    } catch (e) {
        console.error('Unable to write to clipboard. :-(');
    }
    done(text);
};

export function resetableTimeout(callback, ms, onReset = () => {}) {
    const r = {};
    r.complete = false;
    const _callback = () => {
        callback();
        r.complete = true;
    };
    let tid = setTimeout(_callback, ms);
    r.reset = () => {
        onReset();
        clearTimeout(tid);
        tid = setTimeout(_callback, ms);
    };
    r.cancel = () => clearTimeout(tid);
    return r;
}
