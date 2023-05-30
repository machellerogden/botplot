import path from 'node:path';
import url from 'node:url';
import { readFile } from 'node:fs/promises';

// paths
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export const prompts = {
    qa: await readFile(path.resolve(__dirname, '..', 'resources', 'prompts', 'qa.txt'), 'utf8'),
    textToCommand: await readFile(path.resolve(__dirname, '..', 'resources', 'prompts', 'text-to-command.txt'), 'utf8'),
    firstToThirdFemale: await readFile(path.resolve(__dirname, '..', 'resources', 'prompts', 'first-to-third-female.txt'), 'utf8'),
    firstToThirdMale: await readFile(path.resolve(__dirname, '..', 'resources', 'prompts', 'first-to-third-male.txt'), 'utf8')
};
