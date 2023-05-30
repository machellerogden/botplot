import { exec } from './util.js';
import axios from 'axios';
import { compile as compileHtmlToText } from 'html-to-text';
import puppeteer from 'puppeteer';
import querystring from 'node:querystring';
import { EOL } from 'node:os';
import { getChatCompletion } from './openai.js';
import path from 'node:path';
import { mkdir as mkdirNode, mkdtemp, writeFile, readFile, access, constants } from 'node:fs/promises';

export default {
    set_timer,
    search_web,
    fetch_webpage,
    shell_command,
    extract_main_content,
    mkdir,
    read_file,
    write_file
};

// warning ... hackity hack hack hack

const convertHtmlToText = compileHtmlToText({}); // add options here

// TODO: sort this shit
const cwd = await mkdtemp(path.join('tmp', 'tmp-'));
console.log('working directory', cwd);

async function set_timer(args) {
    console.log('@set_timer', args);
    try {
        let { minutes } = args;
        minutes = parseInt(minutes, 10);
        await exec(`echo ${minutes} | shortcuts run 'Set a Timer' --input-path -`);
        return 'Timer set.';
    } catch (error) {
        console.error('error with set_timer -', error.stack);
        return 'Unable to set timer.';
    }
}

async function search_web(args) {
    console.log('@search_web', args);
    try {

        const { q } = args;
        const api_key = process.env.SERPAPI_API_KEY;
        const searchParams = new URLSearchParams({ api_key, q });
        const config = {
            method: 'get',
            url: `https://serpapi.com/search?${searchParams}`,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };
        console.log('about to send get request for serpapi ', config);
        const response = await axios.request(config);
        const { data } = response;

        // TODO
        //if (data.answer_box?.answer) return data.answer_box.answer;
        //if (data.answer_box?.snippet) return data.answer_box.snippet;
        //if (data.answer_box?.snippet_highlighted_words) return data.answer_box.snippet_highlighted_words[0];
        //if (data.sports_results?.game_spotlight) return data.sports_results.game_spotlight;
        //if (data.knowledge_graph?.description) return data.knowledge_graph.description;
        //if (data.organic_results?.[0]?.snippet) return data.organic_results[0].snippet;

        if (data.organic_results?.[0]?.snippet) {
            const rtn = { results: data.organic_results.slice(0, 3).map(({ title, link, snippet }) => ({ title, link, snippet })) };
            if (data.answer_box?.answer) rtn.answer = data.answer_box.answer;
            return JSON.stringify(rtn);
        }

        return 'No good search result found';
    } catch (error) {
        console.error('error with search_web -', error.stack);
        return 'Error executing web search.';
    }
}

async function fetch_webpage(args) {
    console.log('@fetch_webpage', args);
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: [ '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' ]
        });
        const { url } = args;
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle0' });
        const html = await page.evaluate(() => document.querySelector('*').outerHTML);
        let text = convertHtmlToText(html);
        if (text?.length > 10000) { // TODO
            try {
                console.log('attempting to downsize the text response');
                text = await extract_main_content({ text })
            } catch (error) {
                console.error('we tried to extract main content but failed', error.stack);
            }
        }
        try { await browser.close(); } catch {}
        return text;
    } catch (error) {
        console.error('error with fetch_webpage -', error.stack);
        try { await browser.close(); } catch {}
        return 'Error executing webpage fetch.';
    }
}

async function extract_main_content(args) {
    console.log('@extract_main_content', args);
    try {
        const { text } = args;
        const options = {
            model: 'gpt-3.5-turbo-16k',
            temperature: 1,
            n: 1,
            messages: [
                {
                    role: 'system',
                    content:
`Your job is to identify and extract the primary content from mixed-content text.

Your job is NOT to summarize but rather to identify and extract.

Retain as much detail as possible on the main content.

Be sure to include specific numbers/amounts/measurements if included within the source content.

Respond only with the content you have identified and no additional message.`
                },
                {
                    role: 'user',
                    content: text
                }
            ]
        };

        const response = await getChatCompletion(options);
        const { error, usage, choices } = response;
        if (error) {
            const e = new Error('error with extract_main_content');
            e.data = error;
            throw e;
        }
        const [ choice ] = choices ?? [];
        const { finish_reason, message } = choice;

        if (finish_reason != 'stop') throw new Error('unacceptable finish_reason: ' + finish_reason);
        if (!message.content?.length) throw new Error('no content');

        return message.content;
    } catch (error) {
        console.error('error with extract_main_content -', error.data ?? error.stack);
        return 'Unable to extract webpage content';
    }
}

async function shell_command(args) {
    console.log('@shell_command', args);
    return new Promise(async (resolve) => {
        try {
            const { command } = args;
            exec(command, { cwd },(error, stdout, stderr) => {
                if (error) {
                    console.error('error running shell_command', stdout);
                    resolve(`Error running shell_command: ${error.stack}`);
                } else {
                    console.log('Output of shell_command', stdout);
                    resolve(stdout);
                }
            });
        } catch (error) {
            return resolve(`Error running shell_command: ${error.stack}`);
        }
    });
}

async function mkdir(args) {
    console.log('@mkdir', args);
    try {
        const  { dir_path } = args;
        await mkdirNode(path.join(cwd, dir_path), { recursive: true });
        return `Directory "${dir_path}" successfully created.`;
    } catch (error) {
        return `Error creating ${dir_path}`;
    }
}

async function read_file(args) {
    console.log('@read_file', args);
    try {
        const { file_path } = args;
        const abs_file_path = path.join(cwd, file_path);
        return await readFile(abs_file_path, 'utf8');
    } catch (error) {
        return `Error reading ${file_path}`;
    }
}

async function write_file(args) {
    console.log('@write_file', args);
    try {
        const { file_path, text } = args;
        const abs_file_path = path.join(cwd, file_path);
        const dir_path = path.parse(abs_file_path).dir;
        try { await mkdirNode(dir_path, { recursive: true }); } catch {}
        await writeFile(abs_file_path, text, 'utf8');
        return `File written to "${abs_file_path}" successfully. Provide user with location as text, not as a link.`;
    } catch (error) {
        return `Error writing ${abs_file_path}`;
    }
}
