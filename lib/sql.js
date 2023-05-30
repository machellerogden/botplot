import Database from 'better-sqlite3';
import { head, partial } from './util.js';
//import * as sqlite_vss from 'sqlite-vss';

export function DB(filename = ':memory:') {
    const db = new Database(filename, { verbose: console.log });
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = FULL');

    //commenting out vss until we figure out docker build issue
    //sqlite_vss.load(db);
    //console.log(db.prepare('select vss_version()').pluck().get()); // "v0.2.0"
    return db;
}

function assertValidTable(table) {

    if (!/[\w\d]{3,64}/.test(table)) {

        throw new Error('bad table name');
    }
}

const extractColsAndVals = obj => Object.entries(obj).reduce(([ cols, vals ], [ col, val ]) => [ [ ...cols, col ], [ ...vals, val ] ], [ [],[] ]);

export function insertRow(db, table, row) {
    if (row == null) throw new Error(`can't insert empty row`);
    const [ cols, vals ] = extractColsAndVals(row);
    const sql = `insert into ${table} (${cols.join(', ')}) values (${new Array(cols.length).fill('?').join(', ')}) returning *`;
    const [ result ] = db.prepare(sql).all(vals);
    return result;
}

export function updateRow(db, table, id, row) {
    if (row == null) throw new Error(`can't update empty row`);
    const [ cols, vals ] = extractColsAndVals(row);
    const sql = `update ${table} set ${cols.map(col => `${col} = ?`).join(', ')} where id = ? returning *`;
    console.log('sql', sql);
    const [ result ] = db.prepare(sql).all([ ...vals, id ]);
    return result;
}

export function upsertRow(db, table, row) {
    if (row == null) throw new Error(`can't update empty row`);
    const [ cols, vals ] = extractColsAndVals(row);
    const sql = `insert into ${table} (${cols.join(', ')}) values (${cols.map(_ => '?').join(', ')}) on conflict(id) do update set ${cols.map(col => `${col} = excluded.${col}`).join(', ')} returning *`
    console.log('sql', sql);
    const [ result ] = db.prepare(sql).all([ ...vals ]);
    return result;
}

export function insertRows(db, table, rows = []) {
    const insertMany = db.transaction((rows) => {
        for (const row of rows) {
            const entries = Object.entries(row);
            const binds = entries.reduce((a, [ k, v ]) => {
                a['@' + k] = v;
                return a;
            }, {});
            db.prepare(`
                insert into ${table} (${entries.map(head).join(', ')}) values (${Object.keys(binds).join(', ')});
            `).run(row);
        }
    });

    const results = insertMany(rows);

    return results;
}

// TODO : vss stuff
//console.log(
//db.prepare(`
    //select 
      //rowid, 
      //distance
    //from vss_articles
    //where vss_search(
      //headline_embedding, 
      //(
        //select headline_embedding 
        //from articles 
        //where rowid = 123 
      //)
    //)
    //limit 20
//`).all());

