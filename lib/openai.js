import { Configuration as OpenAIConfiguration, OpenAIApi } from 'openai';
import { inspect } from 'node:util';
import { get_encoding } from 'tiktoken';
import { GPTTokens } from 'gpt-tokens'

export const openai = new OpenAIApi(new OpenAIConfiguration({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_API_ORG
}));

export const buildChatCompletionConfig = options => {
    if (!options?.messages?.length) throw new Error('cannot send empty messages');

    const config = {};

    config.messages = options.messages;
    config.model = options?.model ?? 'gpt-3.5-turbo-0613';
    if (options?.function_call) config.function_call = options.function_call;
    if (options?.functions?.length) config.functions = options.functions.map(({ name, description, parameters }) => ({ name, description, parameters }));
    config.max_tokens = options?.max_tokens ?? 500;
    config.temperature = options?.temperature ?? 1;
    config.n = options?.n ?? 1;
    config.top_p = options?.top_p ?? 1;
    config.frequency_penalty = options?.frequency_penalty ?? 0;
    config.presence_penalty = options?.presence_penalty ?? 0;

    return config;
};

export const getChatCompletion = async options => {
    const config = buildChatCompletionConfig(options);
    const { data: completion } = await openai.createChatCompletion(config);
    console.log(inspect(completion, { depth: null }));
    // {
    //   id: 'chatcmpl-7ZUVIe4vEIWqEgDFFTw9WiD2joC7O',
    //   object: 'chat.completion',
    //   created: 1688693092,
    //   model: 'gpt-3.5-turbo-0613',
    //   choices: [
    //     {
    //       index: 0,
    //       message: {
    //         role: 'assistant',
    //         content: null,
    //         function_call: {
    //           name: 'get_current_weather',
    //           arguments: '{\n"location": "Chicago, IL"\n}'
    //         }
    //       },
    //       finish_reason: 'function_call'
    //     }
    //   ],
    //   usage: { prompt_tokens: 96, completion_tokens: 17, total_tokens: 113 }
    // }
    return completion;
};

export const SystemMessage = content => ({
    content,
    role: 'system'
});

export const AIMessage = content => ({
    content,
    role: 'assistant'
});

export const UserMessage = (content, name = 'User') => ({
    content,
    role: 'user',
    name
});

export const cl100k_base = get_encoding('cl100k_base');
export const p50k_base = get_encoding('p50k_base');

export const encoding = {
    cl100k_base,
    p50k_base
};

export const encodingMap = {
    'gpt-4': 'cl100k_base',
    'gpt-4-0613': 'cl100k_base',
    'gpt-4-32k': 'cl100k_base',
    'gpt-4-32k-0613': 'cl100k_base',
    'gpt-4-0613': 'cl100k_base',
    'gpt-3.5-turbo': 'cl100k_base',
    'gpt-3.5-turbo-16k': 'cl100k_base',
    'gpt-3.5-turbo-0613': 'cl100k_base',
    'gpt-3.5-turbo-16k-0613': 'cl100k_base',
    'text-embedding-ada-002': 'cl100k_base',
    'text-davinci-002': 'p50k_base',
    'text-davinci-003': 'p50k_base',
    'text-curie-001': 'p50k_base',
    'text-babbage-001': 'p50k_base',
    'text-ada-001': 'p50k_base'
};

export const maxTokenMap = {
    'gpt-4': 8192,
    'gpt-4-0613': 8192,
    'gpt-4-32k': 32768,
    'gpt-4-32k-0613': 32768,
    'gpt-4-0613': 8192,
    'gpt-3.5-turbo': 4096,
    'gpt-3.5-turbo-16k': 16384,
    'gpt-3.5-turbo-0613': 4096,
    'gpt-3.5-turbo-16k-0613': 16384,
    'text-embedding-ada-002': 4096,
    'text-davinci-002': 4096,
    'text-davinci-003': 4096,
    'text-curie-001': 4096,
    'text-babbage-001': 4096,
    'text-ada-001': 4096
};

export const countContentTokens = input => {
    if (input == null) return 0;
    const r = cl100k_base.encode(input);
    //cl100k_base.free();
    return r.length;
};

export const calculateCompletionTokens = input => {
    const r = p50k_base.encode(input);
    //p50k_base.free();
    return r;
};

// remember to add 4 for the chat overhead
export const calculateChatMessageTokenLength = ({ content, name, function_call }, model = 'gpt-3.5-turbo') => {
    content = content ?? '';
    if (function_call) {
        try {
            content += JSON.stringify(function_call);
        } catch (error) {
            console.error('strange data...', error.stack);
        }
    }
    // every reply is primed with <|start|>assistant<|message|> ... so, extra tokens
    let extra_tokens_per_message = 3;
    let extra_tokens_per_name = 1;
    // hmmm https://github.com/Cainier/gpt-tokens/blob/main/index.js#L132C9-L132C9
    //if (model == 'gpt-3.5-turbo-0301') {
        //extra_tokens_per_message = 4;
        //extra_tokens_per_name = -1;
    //}
    const content_tokens = countContentTokens(content);
    return content_tokens + extra_tokens_per_message + (name ? extra_tokens_per_name : 0);
}

export const calculateChatCompletionUsage = (model, messages, functions) => {
    console.log('calculateChatCompletionUsage', { model, messages, functions });
    const fnTokenCount = (functions ?? []).reduce((acc, fn) => acc + countContentTokens(fn && JSON.stringify(fn)), 0);
    const usageInfo = new GPTTokens({
        // if calculating costs set plus to true for "plus" account
        // plus : false,
        model: model ?? 'gpt-4',
        messages: messages.map(({ content, role }) => ({ content, role }))
    });
    usageInfo.totalTokens = + usageInfo.usedTokens + fnTokenCount;
    console.table({
        'promptUsedTokens'    : usageInfo.promptUsedTokens,
        'completionUsedTokens': usageInfo.completionUsedTokens,
        'usedTokens'          : usageInfo.usedTokens,
        'totalTokens'         : usageInfo.totalTokens,
        'usedUSD'             : usageInfo.usedUSD
    });
    return usageInfo;
}


export const getEmbedding = async input => {
    const { data: { data: [ { embedding } ] } } = await openai.createEmbedding({
        input,
        model: 'text-embedding-ada-002'
    });
    return embedding;
};

