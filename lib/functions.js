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
    remember,
    extract_main_content,
    mkdir,
    read_file,
    write_file
};

// warning ... hackity hack hack hack

const convertHtmlToText = compileHtmlToText({}); // add options here

const temp = await mkdtemp(path.join('tmp', 'tmp-'));
console.log('temp working directory', temp, Object.entries(process.env).map(([ key, value ]) => `${key}=${value}`).join(EOL));

async function set_timer(context, args) {
    console.log('@set_timer', context, args);
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

async function search_web(context, args) {
    console.log('@search_web', context, args);
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

async function fetch_webpage(context, args) {
    console.log('@fetch_webpage', context, args);
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
        if (text?.length > 20000) { // TODO
            try {
                console.log('attempting to downsize the text response');
                text = await extract_main_content(context, { text })
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

async function extract_main_content(context, args) {
    console.log('@extract_main_content', context, args);
    try {
        const { text } = args;
        const options = {
            model: 'gpt-3.5-turbo-16k',
            temperature: 0.3,
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

        // TODO: continue if finish_reason === 'length'
        if (!['stop','length'].includes(finish_reason)) throw new Error('unacceptable finish_reason: ' + finish_reason);
        if (!message.content?.length) throw new Error('no content');

        return message.content;
    } catch (error) {
        console.error('error with extract_main_content -', error.data ?? error.stack);
        return 'Unable to extract webpage content';
    }
}

async function shell_command(context, args) {
    console.log('@shell_command', context, args);
    const { cwd = temp } = context;
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

async function mkdir(context, args) {
    console.log('@mkdir', context, args);
    const { cwd = temp } = context;
    try {
        const  { dir_path } = args;
        await mkdirNode(path.join(cwd, dir_path), { recursive: true });
        return `Directory "${dir_path}" successfully created.`;
    } catch (error) {
        return `Error creating ${dir_path}`;
    }
}

async function read_file(context, args) {
    console.log('@read_file', context, args);
    const { cwd = temp } = context;
    try {
        const { file_path } = args;
        const abs_file_path = path.join(cwd, file_path);
        return await readFile(abs_file_path, 'utf8');
    } catch (error) {
        return `Error reading ${file_path}`;
    }
}

async function write_file(context, args) {
    console.log('@write_file', context, args);
    const { cwd = temp } = context;
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

async function remember(context, args) {
    console.log('@remember', context, args);
    // TODO: add user_id to context
    const { project_id, bot_id, bot_chat_id } = context;
    const { subject } = args;
    // TODO: query vss
    return `I am not able to remember that.`;
}
