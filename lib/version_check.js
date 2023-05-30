import { versions } from 'node:process';

const v = versions.node;
const major = +v.slice(0, v.indexOf('.'));
if (major < 16) {
    console.error(`node v18.x.x or higher is required`);
    process.exit(1);
}
