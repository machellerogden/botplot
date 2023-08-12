import { log } from './stores.js';

const baseUrl = __BASEURL__;

const resources = {
    bot: `${baseUrl}/v1/bot`,
    bots: `${baseUrl}/v1/bots`,
    botChat: `${baseUrl}/v1/bot-chat`,
    botChats: `${baseUrl}/v1/bot-chats`,
    user: `${baseUrl}/v1/user`,
    users: `${baseUrl}/v1/users`,
    project: `${baseUrl}/v1/project`,
    projects: `${baseUrl}/v1/projects`,
    workspace: `${baseUrl}/v1/workspace`,
    workspaces: `${baseUrl}/v1/workspaces`,
    chat: `${baseUrl}/v1/chat`,
    chatCompletions: `${baseUrl}/v1/chat-completions`,
    chats: `${baseUrl}/v1/chats`,
    completionConfig: `${baseUrl}/v1/completion-config`,
    completionConfigs: `${baseUrl}/v1/completion-configs`,
    functionCall: `${baseUrl}/v1/function-call`,
    functionSet: `${baseUrl}/v1/function-set`,
    functionSets: `${baseUrl}/v1/function-sets`,
    functionLookup: `${baseUrl}/v1/function-lookup`,
    functionLookups: `${baseUrl}/v1/function-lookups`,
    functions: `${baseUrl}/v1/functions`,
    googleSynth: `${baseUrl}/v1/ss-synth/google`,
    message: `${baseUrl}/v1/message`,
    messages: `${baseUrl}/v1/messages`,
    mimicSynth: `${baseUrl}/v1/ss-synth/mimic`,
    ssml: `${baseUrl}/v1/ssml`,
    transcribe: `${baseUrl}/v1/transcribe`
};


/**
 * AUDIO
 */

export async function transcribe(blob) {
    console.log('transcribing...');
    const body = new FormData();
    body.append('file', blob, 'recording.webm');
    const response = await window.fetch(resources.transcribe, { method: 'POST', body });
    const data = await response.json();
    console.log('transcript', data.transcript);
    console.log('file', data.file);
    return data;
}

export async function googleSynth({ content, ssml, voice }) {
    if (!content?.length) return;
    const request = {
        content,
        ssml
    };
    if (voice) request.voice = voice;
    const body = JSON.stringify(request);
    const response = await window.fetch(resources.googleSynth, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body
    });
    const data = await response.json();
    console.log('googleSynth response', data);
    return data;
}

export async function mimicSynth({ content, ssml, voice }) {
    if (!content?.length) return;
    const request = {
        content,
        ssml
    };
    if (voice) request.voice = voice;
    const body = JSON.stringify(request);
    const response = await window.fetch(resources.mimicSynth, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body
    });
    console.log('mimicSynth response', response);
    return response;
}

export async function withSSML(content) {
    try {
        const response = await window.fetch(resources.ssml, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content
            })
        });
        const data = await response.json();
        console.log('ssml response', data);
        return data;
    } catch (error) {
        console.error('error generating ssml response', error);
        return { content };
    }
}


/**
 * CHAT
 */

export async function getChats() {
    let chats = [];
    try {
        const response = await window.fetch(resources.chats);
        const data = await response.json();
        chats = data?.results ?? [];
    } catch (error) {
        console.error('error loading chats', error);
    }
    return chats;
}

export async function getChat(chat_id) {
    const response = await window.fetch(`${resources.chat}/${chat_id}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log('chat response', data);
    return data;
}

export async function newChat(request = {}) {
    let response;
    try {
        const chat = {};
        chat.message_id = request.message_id;
        chat.model = request.model ?? 'gpt-3.5-turbo-0613'; // TODO - persist user defaults
        chat.label = request.label ?? 'new chat';
        chat.max_tokens = request.max_tokens ?? 500;
        chat.temperature = request.temperature ?? 1;
        chat.frequency_penalty = request.frequency_penalty ?? 0;
        chat.presence_penalty = request.presence_penalty ?? 0;
        chat.top_p = request.top_p ?? 1;
        chat.n = request.n ?? 1;
        response = await window.fetch(`${resources.chats}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(chat)
        });
        const data = await response.json();
        console.log(`POST new chat result`, data);
        return data;
    } catch (error) {
        console.error(`error posting new chat`, error);
    }
}

export async function copyChat(chat_id) {
    const response = await window.fetch(`${resources.chat}/${chat_id}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const { id, ...source } = await response.json();
    console.log('chat copy get chat source', source);
    source.label = `Copy of ${source?.label ?? 'unlabeled'}`;
    const chat = await newChat(source);
    console.log('chat copy new chat response', chat);
    return chat;
}

export async function patchChat(chat_id, patch) {
    const response = await window.fetch(`${resources.chat}/${chat_id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(patch)
    });
    const data = await response.json();
    console.log('chats patch response', data);
    return data;
}

export async function deleteChat(chat_id) {
    const response = await window.fetch(`${resources.chat}/${chat_id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log('chat delete response', data);
    return data;
}


export async function insertMessage({ parent_id, role, name, content, function_call }) {
    const response = await window.fetch(resources.messages, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            parent_id,
            role,
            name,
            content,
            function_call
        })
    });
    const data = await response.json();
    console.log('messages post response', data);
    return data;
}

export async function patchMessage(message_id, patch) {
    const response = await window.fetch(`${resources.message}/${message_id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(patch)
    });
    const data = await response.json();
    console.log('message patch response', data);
    return data;
}

export async function* MessageList(message_id) {
    if (message_id == null) return;
    try {
        let response;
        let data;
        const message_id_set = new Set();
        while (message_id && !message_id_set.has(message_id)) {
            message_id_set.add(message_id); // cycle prevention
            try {
                response = await window.fetch(`${resources.message}/${message_id}`);
                data = await response.json();
                yield data;
                message_id = data?.parent_id;
            } catch (error) {
                console.error(error);
                message_id = null;
            }
        }
    } catch (error) {
        console.error('error loading entries', error);
    }
}

export async function getMessageList(message_id, limit = Infinity, until_id) {
    const messages = [];
    let i = 0;
    for await (const message of MessageList(message_id)) {
        if (until_id === message_id) break;
        messages.push(message);
        if (++i > limit) break;
    }
    return messages;
}

export async function getBotMessages(message_id) {
    const messages = [];
    for await (const message of MessageList(message_id)) {
        messages.push(message);
    }
    return messages.reverse();
}


/**
 * COMPLETIONS
 */

export async function postChatCompletion(chat, function_call = 'none', functions) {

    const request = {
        ...chat,
        function_call
    };
    console.log(request);

    if (functions?.length) request.functions = functions;

    const response = await window.fetch(`${resources.chatCompletions}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
    });
    const data = await response.json();
    if (data.error) {
        console.log('********************************************************************************');
        console.log('OpenAI Error');
        console.table(data.error);
        console.log('********************************************************************************');
    } else {
        console.log('********************************************************************************');
        console.log('OpenAI Response');
        console.table(data);
        console.log('********************************************************************************');
    }
    return data;
}

export async function getCompletionConfigs() {
    let completionConfigs = [];
    try {
        const response = await window.fetch(resources.completionConfigs);
        const data = await response.json();
        completionConfigs = data?.results ?? [];
    } catch (error) {
        console.error('error loading completion configs', error);
    }
    return completionConfigs;
}

export async function getCompletionConfig(completion_config_id) {
    let completionConfig;
    try {
        const response = await window.fetch(`${resources.completionConfig}/${completion_config_id}`);
        completionConfig = await response.json();
    } catch (error) {
        console.error('error loading completion config', error);
    }
    return completionConfig;
}

export async function postCompletionConfig(completion_config) {
    const response = await window.fetch(`${resources.completionConfigs}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(completion_config)
    });
    const data = await response.json();
    console.log('completion config patch response', data);
    return data;
}

export async function patchCompletionConfig(completion_config_id, patch) {
    const response = await window.fetch(`${resources.completionConfig}/${completion_config_id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(patch)
    });
    const data = await response.json();
    console.log('completion config patch response', data);
    return data;
}


/**
 * BOTS
 */

export async function getBots() {
    let bots = [];
    try {
        const response = await window.fetch(resources.bots);
        const data = await response.json();
        bots = data?.results ?? [];
    } catch (error) {
        console.error('error loading bots', error);
    }
    return bots;
}

export async function getBot(bot_id) {
    let bot;
    try {
        const response = await window.fetch(`${resources.bot}/${bot_id}`);
        bot = await response.json();
    } catch (error) {
        console.error('error loading bot', error);
    }
    return bot;
}

export async function deleteBot(bot_id) {
    const response = await window.fetch(`${resources.bot}/${bot_id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log('bot delete response', data);
    return data;
}

export async function newBot(request = {}) {
    try {
        const bot = {};
        bot.ka = request.ka;
        bot.aka = request.aka;
        bot.voice_provider = request.voice_provider;
        bot.voice_key = request.voice_key;
        bot.completion_config_id = request.completion_config_id;
        bot.prelude_id = request.prelude_id;
        bot.function_set_id = request.function_set_id;
        const response = await window.fetch(`${resources.bots}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bot)
        });
        const data = await response.json();
        console.log(`POST new bot result`, data);
        return data;
    } catch (error) {
        console.error(`error posting new bot`, error);
    }
}

export async function copyBot(bot_id) {
    try {
        const response = await window.fetch(`${resources.bot}/${bot_id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const { id, ...source } = await response.json();
        console.log('copy bot source', source);
        source.ka = `Copy of ${source?.ka ?? 'unknown'}`;
        const bot = await newBot(source);
        console.log('copy bot response', bot);
        return bot;
    } catch (error) {
        console.error(`error copying bot`, error);
    }
}

export async function patchBot(bot_id, patch) {
    const response = await window.fetch(`${resources.bot}/${bot_id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(patch)
    });
    const data = await response.json();
    console.log('bot patch response', data);
    return data;
}


/**
 * BOT CHATS
 */

export async function getBotChats(bot_id) {
    let botChats = [];
    try {
        const response = await window.fetch(`${resources.botChats}?bot_id=${bot_id}`);
        const data = await response.json();
        botChats = data?.results ?? [];
    } catch (error) {
        console.log('error loading bot chats', error);
    }
    return botChats;
}

export async function getBotChat(bot_chat_id) {
    let botChat;
    try {
        const response = await window.fetch(`${resources.botChat}/${bot_chat_id}`);
        botChat = await response.json();
    } catch (error) {
        console.log('error loading bot chat', error);
    }
    return botChat;
}

export async function patchBotChat(bot_chat_id, patch) {
    const response = await window.fetch(`${resources.botChat}/${bot_chat_id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(patch)
    });
    const data = await response.json();
    console.log('bot chat patch response', data);
    return data;
}

export async function newBotChat(request = {}) {
    try {
        if (!request?.bot_id) throw new Error('must include bot_id');
        const bot = await getBot(request.bot_id);
        if (!bot?.id) throw new Error('bot does not exist');
        const chat = {};
        chat.id = request.id;
        chat.bot_id = bot.id;
        chat.message_id = request.message_id ?? bot.prelude_id;
        chat.label = request.label ?? 'new chat';
        chat.prompt_tokens = request.prompt_tokens;
        chat.completion_tokens = request.completion_tokens;
        chat.total_tokens = request.total_tokens;
        const response = await window.fetch(`${resources.botChats}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(chat)
        });
        const data = await response.json();
        console.log(`POST new bot chat result`, data);
        return data;
    } catch (error) {
        console.error(`error posting new bot chat`, error);
    }
}

export async function deleteBotChat(bot_chat_id) {
    const response = await window.fetch(`${resources.botChat}/${bot_chat_id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log('bot chat delete response', data);
    return data;
}

export async function copyBotChat(bot_chat_id) {
    const response = await window.fetch(`${resources.botChat}/${bot_chat_id}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const { id, ...source } = await response.json();
    console.log('copy bot chat source', source);
    source.label = `Copy of ${source?.label ?? 'unlabeled'}`;
    const chat = await newBotChat(source);
    console.log('copy bot chat response', chat);
    return chat;
}


/**
 * FUNCTIONS
 */

export async function getFunctionSets() {
    let functionSets = [];
    try {
        const response = await window.fetch(resources.functionSets);
        const data = await response.json();
        functionSets = data?.results ?? [];
    } catch (error) {
        console.error('error loading function sets', error);
    }
    return functionSets;
}

export async function getFunctionSet(function_set_id) {
    let functionSet;
    try {
        const response = await window.fetch(`${resources.functionSet}/${function_set_id}`);
        functionSet = await response.json();
    } catch (error) {
        console.error('error loading function set', error);
    }
    return functionSet;
}

export async function patchFunctionSet(function_set_id, patch) {
    const response = await window.fetch(`${resources.functionSet}/${function_set_id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(patch)
    });
    const data = await response.json();
    console.log('function set patch response', data);
    return data;
}

export async function postFunctionSet(function_set) {
    const response = await window.fetch(`${resources.functionSets}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(function_set)
    });
    const data = await response.json();
    console.log('function set post response', data);
    return data;
}


export async function addFunctionToSet(function_set_id, function_name) {
    const lookup = { function_set_id, function_name };
    const response = await window.fetch(`${resources.functionLookups}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(lookup)
    });
    const data = await response.json();
    console.log('add function lookup response', data);
    return data;
}

export async function removeFunctionFromSet(function_lookup_id) {
    const response = await window.fetch(`${resources.functionLookup}/${function_lookup_id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log('delete function lookup response', data);
    return data;

}

export async function getFunctions() {
    let functions = [];
    try {
        const response = await window.fetch(resources.functions);
        const data = await response.json();
        functions = data?.results ?? [];
    } catch (error) {
        console.error('error loading functions', error);
    }
    return functions;
}

export async function setTimer(minutes) {
    try {
        await window.fetch(resources.functions + `/set-timer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ minutes })
        });
    } catch (error) {
        console.error('error setting timer', error);
    }
}

export async function postFunctionCall(function_call) {
    try {

        const response = await window.fetch(resources.functionCall, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(function_call)
        });

        const data = await response.json();

        return data?.content ?? 'Done';

    } catch (error) {
        console.error('error setting timer', error);
        return 'Error setting timer';
    }
}


/**
 * USERS
 */

export async function getUsers() {
    let users = [];
    try {
        const response = await window.fetch(resources.users);
        const data = await response.json();
        users = data?.results ?? [];
    } catch (error) {
        console.error('error loading users', error);
    }
    return users;
}

export async function getUser(user_id) {
    let user;
    try {
        const response = await window.fetch(`${resources.user}/${user_id}`);
        user = await response.json();
    } catch (error) {
        console.error('error loading user', error);
    }
    return user;
}

export async function deleteUser(user_id) {
    const response = await window.fetch(`${resources.user}/${user_id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log('user delete response', data);
    return data;
}

export async function newUser(request = {}) {
    try {
        const user = {};
        user.username = request.username;
        const response = await window.fetch(`${resources.users}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(user)
        });
        const data = await response.json();
        console.log(`POST new user result`, data);
        return data;
    } catch (error) {
        console.error(`error posting new user`, error);
    }
}

export async function patchUser(user_id, patch) {
    const response = await window.fetch(`${resources.user}/${user_id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(patch)
    });
    const data = await response.json();
    console.log('user patch response', data);
    return data;
}

/**
 * PROJECTS
 */

export async function getProjects() {
    let projects = [];
    try {
        const response = await window.fetch(resources.projects);
        const data = await response.json();
        projects = data?.results ?? [];
    } catch (error) {
        console.error('error loading projects', error);
    }
    return projects;
}

export async function getProject(project_id) {
    let project;
    try {
        const response = await window.fetch(`${resources.project}/${project_id}`);
        project = await response.json();
    } catch (error) {
        console.error('error loading project', error);
    }
    return project;
}

export async function deleteProject(project_id) {
    const response = await window.fetch(`${resources.project}/${project_id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log('project delete response', data);
    return data;
}

export async function newProject(request = {}) {
    try {
        const project = {};
        project.user_id = request.user_id ?? 'default';
        project.label = request.label;
        project.description = request.description;
        const response = await window.fetch(`${resources.projects}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(project)
        });
        const data = await response.json();
        console.log(`POST new project result`, data);
        return data;
    } catch (error) {
        console.error(`error posting new project`, error);
    }
}

export async function copyProject(project_id) {
    try {
        const response = await window.fetch(`${resources.project}/${project_id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const { id, ...source } = await response.json();
        console.log('copy project source', source);
        source.label = `Copy of ${source?.label ?? 'unknown'}`;
        const project = await newProject(source);
        console.log('copy project response', project);
        return project;
    } catch (error) {
        console.error(`error copying project`, error);
    }
}

export async function patchProject(project_id, patch) {
    const response = await window.fetch(`${resources.project}/${project_id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(patch)
    });
    const data = await response.json();
    console.log('project patch response', data);
    return data;
}

/**
 * WORKSPACES
 */

export async function getWorkspaces() {
    let workspaces = [];
    try {
        const response = await window.fetch(resources.workspaces);
        const data = await response.json();
        workspaces = data?.results ?? [];
    } catch (error) {
        console.error('error loading workspaces', error);
    }
    return workspaces;
}

export async function getWorkspace(workspace_id) {
    let workspace;
    try {
        const response = await window.fetch(`${resources.workspace}/${workspace_id}`);
        workspace = await response.json();
    } catch (error) {
        console.error('error loading workspace', error);
    }
    return workspace;
}

export async function deleteWorkspace(workspace_id) {
    const response = await window.fetch(`${resources.workspace}/${workspace_id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log('workspace delete response', data);
    return data;
}

export async function newWorkspace(request = {}) {
    try {
        const workspace = {};
        workspace.label = request.label;
        workspace.description = request.description;
        workspace.location_type = request.location_type;
        workspace.location_ref = request.location_ref;
        const response = await window.fetch(`${resources.workspaces}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(workspace)
        });
        const data = await response.json();
        console.log(`POST new workspace result`, data);
        return data;
    } catch (error) {
        console.error(`error posting new workspace`, error);
    }
}

export async function copyWorkspace(workspace_id) {
    try {
        const response = await window.fetch(`${resources.workspace}/${workspace_id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const { id, ...source } = await response.json();
        console.log('copy workspace source', source);
        source.label = `Copy of ${source?.label ?? 'unknown'}`;
        const workspace = await newWorkspace(source);
        console.log('copy workspace response', workspace);
        return workspace;
    } catch (error) {
        console.error(`error copying workspace`, error);
    }
}

export async function patchWorkspace(workspace_id, patch) {
    const response = await window.fetch(`${resources.workspace}/${workspace_id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(patch)
    });
    const data = await response.json();
    console.log('workspace patch response', data);
    return data;
}
