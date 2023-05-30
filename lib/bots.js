import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { writeFile } from 'node:fs/promises';
import { Configuration as OpenAIConfiguration, OpenAIApi } from 'openai';
import { logError } from './util.js';
import Joi from 'joi';
import { createMachine, interpret, actions, spawn } from 'xstate';

// schema

export const completionUsageSchema = Joi.object({
    prompt_tokens: Joi.number().required(),
    completion_tokens: Joi.number().required(),
    total_tokens: Joi.number().required()
});

export const chatCompletionMessageSchema = Joi.object({
    role: Joi.string().valid('system','user','assistant').required(),
    content: Joi.string().required(),
    name: Joi.string().optional()
});

export const chatCompletionChoicesSchema = Joi.array().items(Joi.object({
    index: Joi.number().required(),
    message: chatCompletionMessageSchema.required(),
    finish_reason: Joi.string().required()
}));

export const chatCompletionResponseSchema = Joi.object({
    id: Joi.string().required(),
    created: Joi.number().required(),
    object: Joi.string().required(),
    model: Joi.string().required(),
    usage: completionUsageSchema.required(),
    choices:chatCompletionChoicesSchema.min(1)
});

// chat api

const openai = new OpenAIApi(new OpenAIConfiguration({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_API_ORG
}));

const buildChatCompletionConfig = options => {
    if (!options?.messages?.length) throw new Error('cannot send empty messages');

    const config = {};

    config.messages = options.messages;
    config.model = options?.model ?? 'gpt-3.5-turbo';
    config.functions = options?.functions ?? [];
    config.function_call = options?.function_call ?? 'auto';
    config.max_tokens = options?.max_tokens ?? 500;
    config.temperature = options?.temperature ?? 0.8;
    config.n = options?.n ?? 1;
    config.top_p = options?.top_p ?? 1;
    config.frequency_penalty = options?.frequency_penalty ?? 0.2;
    config.presence_penalty = options?.presence_penalty ?? 0.1;

    return config;
};

const getChatCompletion = async options => {
    const config = buildChatCompletionConfig(options);
    const res = await openai.createChatCompletion(config);
    return res.data;
};


const baseDefinition = {
    predictableActionArguments: true,
    preserveActionOrder: true
};


const state = {};

state.AWAITING_INPUT = '@state/AWAITING_INPUT';
state.PROCESSING = '@state/PROCESSING';
state.CHAT_REQUEST = '@state/CHAT_REQUEST';
state.CHAT_REQUEST_SEND = '@state/CHAT_REQUEST_SEND';
state.CHAT_REQUEST_DATA = '@state/CHAT_REQUEST_DATA';
state.CHAT_REQUEST_ERROR = '@state/CHAT_REQUEST_ERROR';
state.RESOLVED = '@state/RESOLVED';
state.REJECTED = '@state/REJECTED';


const event = {};

event.INPUT = '@event/INPUT';
event.RESOLVE = '@event/RESOLVE';
event.REJECT = '@event/REJECT';


const guard = {};

guard.IS_VALID_CHAT_COMPLETION = '@guard/IS_VALID_CHAT_COMPLETION';
guard.IS_DONE = '@guard/IS_DONE';
guard.IS_EMPTY = '@guard/IS_EMPTY';


const actor = {};

actor.getChatCompletion = '@actor/getChatCompletion';


const createChatMachineDefinition = id => ({
    id,
    initial: state.AWAITING_INPUT,
    context: {
        input: null,
        messages: [],
        chatCompletionConfig: buildChatCompletionConfig(),
    },
    states: {
        [state.AWAITING_INPUT]: {
            on: {
                [event.INPUT]: [
                    {
                        cond: guard.IS_DONE,
                        target: state.RESOLVED
                    },
                    {
                        cond: guard.IS_EMPTY,
                        target: state.AWAITING_INPUT
                    },
                    {
                        actions: actions.assign({ input: (context, event) => event.data }),
                        target: state.PROCESSING
                    }
                ]
            }
        },
        [state.PROCESSING]: {
            initial: state.CHAT_REQUEST,
            states: {
                [state.CHAT_REQUEST]: {
                    initial: state.CHAT_REQUEST_SEND,
                    states: {
                        [state.CHAT_REQUEST_SEND]: {
                            invoke: {
                                src: actor.getChatCompletion,
                                onError: {
                                    target: state.CHAT_REQUEST_ERROR
                                },
                                onDone: [
                                    {
                                        cond: {
                                            type: guard.IS_VALID_CHAT_COMPLETION,
                                            foo: 'bar'
                                        },
                                        actions: [
                                            actions.assign({
                                                messages: (context, event) => {
                                                    const message = event.data.choices[0].message;
                                                    return [ ...context.messages, message ];
                                                },
                                                prompt_tokens: (context, event) => {
                                                    const { usage } = event.data;
                                                    const { prompt_tokens } = usage;
                                                    return (context.prompt_tokens ?? 0) + prompt_tokens;
                                                },
                                                completion_tokens: (context, event) => {
                                                    const { usage } = event.data;
                                                    const { completion_tokens } = usage;
                                                    return (context.completion_tokens ?? 0) + completion_tokens;
                                                },
                                                total_tokens: (context, event) => {
                                                    const { usage } = event.data;
                                                    const { total_tokens } = usage;
                                                    return (context.total_tokens ?? 0) + total_tokens;
                                                }
                                            })
                                        ],
                                        target: state.CHAT_REQUEST_DATA
                                    },
                                    {
                                        target: state.CHAT_REQUEST_ERROR
                                    }
                                ]
                            }
                        },
                        [state.CHAT_REQUEST_DATA]: {
                            always: {
                                target: `#${id}.${state.AWAITING_INPUT}`
                            }
                        },
                        [state.CHAT_REQUEST_ERROR]: {
                            always: {
                                target: `#${id}.${state.REJECTED}`
                            }
                        }
                    }
                }
            }
        },
        [state.RESOLVED]: {
            type: 'final'
        },
        [state.REJECTED]: {
            type: 'final'
        }
    }
});


const definition = {};

definition.conversation = createChatMachineDefinition('(conversation)');


const SystemMessage = content => ({
    content,
    role: 'system'
});

const AIMessage = content => ({
    content,
    role: 'assistant'
});

const UserMessage = (content, name = 'User') => ({
    content,
    role: 'user',
    name
});


function isValidChatCompletion(completion) {
    const { error, value } = chatCompletionResponseSchema.validate();
    if (error) {
        console.error(error?.annotate());
        return false;
    }
    return true;
}

const isDone = data => data == 'done';

const isEmpty = data =>
    data == null || data?.length == 0 || (typeof data === 'object' && Object.keys(data).length == 0);

const getChatCompletionActor = async context => {

    const message = UserMessage(context.input, 'Mac');
    const messages = [ ...context.messages, message ];
    const completion = await getChatCompletion({ ...context.chatCompletionConfig, messages });

    return completion;
};

const chatMachineBaseConfig = {
    services: {
        [actor.getChatCompletion]: getChatCompletionActor,
    },
    guards: {
        [guard.IS_DONE]: (context, event, state) => isDone(event.data),
        [guard.IS_EMPTY]: (context, event, state) => isEmpty(event.data),
        [guard.IS_VALID_CHAT_COMPLETION]: (context, event, state) => isValidChatCompletion(event.data),
    },
    delays: {},
    actions: {},
};

async function run() {

    const machine = createMachine({
        ...baseDefinition,
        ...definition.conversation
    }).withConfig(chatMachineBaseConfig);

    // debug
    //await writeFile("machine-data.js", `createMachine(${JSON.stringify(machine, null, 4)})`, 'utf8');

    const service = interpret(machine);
    const agent = service.start();
    agent.subscribe(async s => {
        console.log('state', s.value);
        if (s.matches(state.AWAITING_INPUT)) {
            const { data } = await inquirer.prompt([{
                message: '>',
                type: 'input',
                name: 'data'
            }]);
            service.send({ type: event.INPUT, data });
        }
    });
}

await run();

