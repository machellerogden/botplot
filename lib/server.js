#!/usr/bin/env node

import './version_check.js';
import { nanoid } from 'nanoid';
import { chatCompletionRequestSchema } from './schema.js';

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { EOL } from 'node:os';
import { mkdir } from 'node:fs/promises';

import multer from 'multer';
import { logError, pprint } from './util.js';
import { DB, insertRow, updateRow, upsertRow } from './sql.js';
import { createHttpServer } from './server/http.js';
import { createWsServer } from './server/ws.js';
import { getSynthAudio, googleSynth, mimicSynth, toSSML } from './synth.js';
import functions from './functions.js';
import { openai, getChatCompletion, calculateChatCompletionUsage, calculateChatMessageTokenLength, maxTokenMap } from './openai.js';
import express from 'express';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const project_root = path.resolve(__dirname, '..');

const db_filename = process.env.SQLITE_DB ?? path.resolve(project_root, 'tmp', 'sqlite.db');
console.log('SQLITE:', db_filename);
const db = DB(db_filename);

try {

    /**
     * HTTP API
     */

    const httpServer = await createHttpServer();


    /**
     * HEARTBEAT
     */

    httpServer.get('/heartbeat', async (req, res) => {
        console.log('GET /heartbeat');
        res.send({ message: 'OK' });
    });


    /**
     * STATIC
     */

    httpServer.use(express.static(path.resolve(project_root, 'public')));

    /**
     * STANDALONE CHAT - LEGACY
     */

    function buildChatPatch(data) {
        const chat = {};
        if (data.message_id != null) chat.message_id = data.message_id;
        if (data.model != null) chat.model = data.model;
        if (data.label != null) chat.label = data.label;
        if (data.max_tokens != null) chat.max_tokens = data.max_tokens;
        if (data.temperature != null) chat.temperature = data.temperature;
        if (data.frequency_penalty != null) chat.frequency_penalty = data.frequency_penalty;
        if (data.presence_penalty != null) chat.presence_penalty = data.presence_penalty;
        if (data.top_p != null) chat.top_p = data.top_p;
        if (data.n != null) chat.n = data.n;
        if (data.prompt_tokens != null) chat.prompt_tokens = data.prompt_tokens;
        if (data.completion_tokens != null) chat.completion_tokens = data.completion_tokens;
        if (data.total_tokens != null) chat.total_tokens = data.total_tokens;
        return chat;
    }

    httpServer.get('/v1/chats', async (req, res) =>{
        console.log('GET /v1/chats');
        try {
            const results = db.prepare(`select * from chats`).all();
            res.send({ results });
        } catch (error) {
            logError(error);
            res.status(500).end();
        }
    });

    httpServer.post('/v1/chats', async (req, res) =>{
        console.log('POST /v1/chats');
        try {
            const chat = { id: nanoid() };
            chat.message_id = req.body.message_id;
            chat.model = req.body.model ?? 'gpt-4-0613';
            chat.label = req.body.label ?? 'new chat';
            chat.max_tokens = req.body.max_tokens ?? 100;
            chat.temperature = req.body.temperature ?? 0.7;
            chat.frequency_penalty = req.body.frequency_penalty ?? 0.3;
            chat.presence_penalty = req.body.presence_penalty ?? 0.1;
            chat.top_p = req.body.top_p ?? 1;
            chat.n = req.body.n ?? 1;
            const result = insertRow(db, 'chats', chat);
            res.send(result);
        } catch (error) {
            logError(error);
            res.status(500).end();
        }
    });

    httpServer.get('/v1/chat/:id', async (req, res) =>{
        console.log('GET /v1/chat/:id');
        const { id } = req.params;
        try {
            const result = db.prepare(`select * from chats where id = @id`).get({ id });
            res.send(result);
        } catch (error) {
            logError(error);
            res.status(500).end();
        }
    });

    httpServer.delete('/v1/chat/:id', async (req, res) =>{
        console.log('DELETE /v1/chat/:id');
        const { id } = req.params;
        try {
            const result = db.prepare(`delete from chats where id = @id`).run({ id });
            res.send(result);
        } catch (error) {
            logError(error);
            res.status(500).end();
        }
    });

    httpServer.patch('/v1/chat/:id', async (req, res) =>{
        console.log('PATCH /v1/chat/:id');
        const { id } = req.params;
        try {
            const chat = buildChatPatch(req.body);
            console.log('chat patch:', chat);
            const result = updateRow(db, 'chats', id, chat);
            res.send(result);
        } catch (error) {
            logError(error);
            res.status(500).end();
        }
    });


    /**
     * MESSAGES
     */

    function unpackMessage(message, parseArgs = true) {
        const { function_call_name, function_call_args, ...msg } = message;

        if (function_call_name != null) {
            msg.function_call = {
                name: function_call_name,
                arguments: parseArgs ? JSON.parse(function_call_args) : function_call_args // nb, let this blow up if invalid
            };
        }
        return msg;
    }

    function buildMessagePatch(data) {

        const total_tokens = calculateChatMessageTokenLength(data);

        const message = {};

        if (data.id != null) message.id = data.id;
        if (data.root_id != null) message.root_id = data.root_id;
        if (data.parent_id != null) message.parent_id = data.parent_id;
        if (data.role != null) message.role = data.role;
        if (data.name != null) message.name = data.name;

        if (data.content != null) message.content = data.content;

        let { name:function_call_name, arguments:function_call_args } = data.function_call ?? {};
        if (function_call_name != null) message.function_call_name = function_call_name;

        if (function_call_args != null) {
            //message.function_call_args = JSON.stringify(function_call_args);
            message.function_call_args = function_call_args;
        }

        if (data.ssml != null) message.ssml = data.ssml;
        if (data.finish_reason != null) message.finish_reason = data.finish_reason;
        if (total_tokens != null) message.total_tokens = total_tokens;

        return message;
    }

    httpServer.get('/v1/messages', async (req, res) =>{
        console.log('GET /v1/messages');
        try {
            const messages = db.prepare(`select * from messages order by as_of desc limit 100`).all(); // TODO
            const results = messages.map(unpackMessage);
            res.send({ results });
        } catch (error) {
            logError(error);
            res.sendStatus(500);
        }
    });

    httpServer.post('/v1/messages', async (req, res) =>{
        console.log('POST /v1/messages', req.body);
        const row = buildMessagePatch({ id: nanoid(), ...req.body });
        try {
            const result = upsertRow(db, 'messages', row);
            res.send(result);
        } catch (error) {
            logError(error);
            res.sendStatus(500);
        }
    });

    httpServer.get('/v1/message/:id', async (req, res) =>{
        console.log('GET /v1/message/:id');
        const { id } = req.params;
        try {
            const message = db.prepare(`select * from messages where id = @id`).get({ id });
            const result = unpackMessage(message);
            res.send(result);
        } catch (error) {
            logError(error);
            res.sendStatus(500);
        }
    });

    httpServer.patch('/v1/message/:id', async (req, res) =>{
        console.log('PATCH /v1/message/:id');
        const { id } = req.params;
        try {
            const message = buildMessagePatch(req.body);
            console.log('message patch:', message);
            const result = updateRow(db, 'messages', id, message);
            res.send(result);
        } catch (error) {
            logError(error);
            res.status(500).end();
        }
    });


    /**
     * USERS
     */

    function buildUserPatch(data) {
        const user = {};
        if (data.id != null) user.id = data.id;
        if (data.username != null) user.username = data.username;
        return user;
    }

    httpServer.get('/v1/users', async (req, res) =>{
        console.log('GET /v1/users');
        try {
            const results = db.prepare(`select * from users order by as_of desc limit 100`).all(); // TODO
            res.send({ results });
        } catch (error) {
            logError(error);
            res.sendStatus(500);
        }
    });

    httpServer.get('/v1/user/:id', async (req, res) =>{
        console.log('GET /v1/user/:id');
        const { id } = req.params;
        try {
            const result = db.prepare(`select * from users where id = @id`).get({ id });
            res.send(result);
        } catch (error) {
            logError(error);
            res.sendStatus(500);
        }
    });

    httpServer.post('/v1/users', async (req, res) =>{
        console.log('POST /v1/users');
        try {
            const user = buildUserPatch({ id: nanoid(), ...req.body });
            const result = insertRow(db, 'users', user);
            res.send(result);
        } catch (error) {
            logError(error);
            res.status(500).end();
        }
    });

    httpServer.patch('/v1/user/:id', async (req, res) =>{
        console.log('PATCH /v1/user/:id');
        const { id } = req.params;
        try {
            const user = buildUserPatch(req.body);
            console.log('user patch:', user);
            const result = updateRow(db, 'users', id, user);
            res.send(result);
        } catch (error) {
            logError(error);
            res.status(500).end();
        }
    });


    /**
     * PROJECTS
     */

    function buildProjectPatch(data) {
        const project = {};
        if (data.id != null) project.id = data.id;
        if (data.label != null) project.label = data.label;
        if (data.description != null) project.description = data.description;
        return project;
    }

    httpServer.get('/v1/projects', async (req, res) =>{
        console.log('GET /v1/projects');
        try {
            const results = db.prepare(`select * from projects order by as_of desc limit 100`).all(); // TODO
            res.send({ results });
        } catch (error) {
            logError(error);
            res.sendStatus(500);
        }
    });

    httpServer.get('/v1/project/:id', async (req, res) =>{
        console.log('GET /v1/project/:id');
        const { id } = req.params;
        try {
            const result = db.prepare(`select * from projects where id = @id`).get({ id });
            res.send(result);
        } catch (error) {
            logError(error);
            res.sendStatus(500);
        }
    });

    httpServer.post('/v1/projects', async (req, res) =>{
        console.log('POST /v1/projects');
        try {
            const project = buildProjectPatch({ id: nanoid(), ...req.body });
            const result = insertRow(db, 'projects', project);
            res.send(result);
        } catch (error) {
            logError(error);
            res.status(500).end();
        }
    });

    httpServer.patch('/v1/project/:id', async (req, res) =>{
        console.log('PATCH /v1/project/:id');
        const { id } = req.params;
        try {
            const project = buildProjectPatch(req.body);
            console.log('req.body:', req.body);
            console.log('project patch:', project);
            const result = updateRow(db, 'projects', id, project);
            res.send(result);
        } catch (error) {
            logError(error);
            res.status(500).end();
        }
    });

    /**
     * WORKSPACES
     */

    function buildWorkspacePatch(data) {
        const workspace = {};
        if (data.id != null) workspace.id = data.id;
        if (data.label != null) workspace.label = data.dlabel;
        if (data.description != null) workspace.description = data.description;
        if (data.location_type != null) workspace.location_type = data.location_type;
        if (data.location_ref != null) workspace.location_ref = data.location_ref;
        return workspace;
    }

    httpServer.get('/v1/workspaces', async (req, res) =>{
        console.log('GET /v1/workspaces');
        try {
            const results = db.prepare(`select * from workspaces order by as_of desc limit 100`).all(); // TODO
            res.send({ results });
        } catch (error) {
            logError(error);
            res.sendStatus(500);
        }
    });

    httpServer.get('/v1/workspace/:id', async (req, res) =>{
        console.log('GET /v1/workspace/:id');
        const { id } = req.params;
        try {
            const result = db.prepare(`select * from workspaces where id = @id`).get({ id });
            res.send(result);
        } catch (error) {
            logError(error);
            res.sendStatus(500);
        }
    });

    httpServer.post('/v1/workspaces', async (req, res) =>{
        console.log('POST /v1/workspaces');
        try {
            const workspace = buildWorkspacePatch({ id: nanoid(), ...req.body });
            const result = insertRow(db, 'workspaces', workspace);
            res.send(result);
        } catch (error) {
            logError(error);
            res.status(500).end();
        }
    });

    httpServer.patch('/v1/workspace/:id', async (req, res) =>{
        console.log('PATCH /v1/workspace/:id');
        const { id } = req.params;
        try {
            const workspace = buildWorkspacePatch(req.body);
            console.log('workspace patch:', workspace);
            const result = updateRow(db, 'workspaces', id, workspace);
            res.send(result);
        } catch (error) {
            logError(error);
            res.status(500).end();
        }
    });


    /**
     * BOTS
     */

    function buildBotPatch(data) {
        const bot = {};
        if (data.id != null) bot.id = data.id;
        if (data.ka != null) bot.ka = data.ka;
        if (data.aka != null) bot.aka = data.aka;
        if (data.description != null) bot.description = data.description;
        if (data.voice_provider != null) bot.voice_provider = data.voice_provider;
        if (data.voice_key != null) bot.voice_key = data.voice_key;
        if (data.completion_config_id != null) bot.completion_config_id = data.completion_config_id;
        if (data.prelude_id != null) bot.prelude_id = data.prelude_id;
        if (data.function_set_id != null) bot.function_set_id = data.function_set_id;
        return bot;
    }

    httpServer.get('/v1/bots', async (req, res) =>{
        console.log('GET /v1/bots');
        try {
            const results = db.prepare(`select * from bots order by as_of desc limit 100`).all(); // TODO
            res.send({ results });
        } catch (error) {
            logError(error);
            res.sendStatus(500);
        }
    });

    httpServer.get('/v1/bot/:id', async (req, res) =>{
        console.log('GET /v1/bot/:id');
        const { id } = req.params;
        try {
            const result = db.prepare(`select * from bots where id = @id`).get({ id });
            res.send(result);
        } catch (error) {
            logError(error);
            res.sendStatus(500);
        }
    });

    httpServer.post('/v1/bots', async (req, res) =>{
        console.log('POST /v1/bots');
        try {
            const bot = buildBotPatch({ id: nanoid(), ...req.body });
            const result = insertRow(db, 'bots', bot);
            res.send(result);
        } catch (error) {
            logError(error);
            res.status(500).end();
        }
    });

    httpServer.patch('/v1/bot/:id', async (req, res) =>{
        console.log('PATCH /v1/bot/:id');
        const { id } = req.params;
        try {
            const bot = buildBotPatch(req.body);
            console.log('bot patch:', bot);
            const result = updateRow(db, 'bots', id, bot);
            res.send(result);
        } catch (error) {
            logError(error);
            res.status(500).end();
        }
    });

    httpServer.delete('/v1/bot/:id', async (req, res) =>{
        console.log('DELETE /v1/bot/:id');
        const { id } = req.params;
        try {
            const result = db.prepare(`delete from bots where id = @id`).run({ id });
            res.send(result);
        } catch (error) {
            logError(error);
            res.status(500).end();
        }
    });


    /**
     * BOT CHATS
     */

    function buildBotChatPatch(data) {
        const chat = {};
        if (data.id != null) chat.id = data.id;
        if (data.bot_id != null) chat.bot_id = data.bot_id;
        if (data.message_id != null) chat.message_id = data.message_id;
        if (data.workspace_id != null) chat.workspace_id = data.workspace_id;
        if (data.label != null) chat.label = data.label;
        if (data.prompt_tokens != null) chat.prompt_tokens = data.prompt_tokens;
        if (data.completion_tokens != null) chat.completion_tokens = data.completion_tokens;
        if (data.total_tokens != null) chat.total_tokens = data.total_tokens;
        return chat;
    }

    httpServer.get('/v1/bot-chats', async (req, res) =>{
        console.log('GET /v1/bot-chats');
        try {
            const { bot_id } = req.query;
            let results;
            if (bot_id) {
                results = db.prepare(`select * from bot_chats where bot_id = @bot_id order by as_of desc limit 100`).all({ bot_id }); // TODO
            } else {
                results = db.prepare(`select * from bot_chats order by as_of desc limit 100`).all({ bot_id }); // TODO
            }
            res.send({ results });
        } catch (error) {
            logError(error);
            res.sendStatus(500);
        }
    });

    httpServer.get('/v1/bot-chat/:id', async (req, res) =>{
        console.log('GET /v1/bot-chat/:id');
        const { id } = req.params;
        try {
            const result = db.prepare(`select * from bot_chats where id = @id`).get({ id });
            res.send(result);
        } catch (error) {
            logError(error);
            res.sendStatus(500);
        }
    });

    httpServer.post('/v1/bot-chats', async (req, res) =>{
        console.log('POST /v1/bot-chats');
        try {
            const chat = buildBotChatPatch({ id: nanoid(), ...req.body });
            const result = insertRow(db, 'bot_chats', chat);
            res.send(result);
        } catch (error) {
            logError(error);
            res.status(500).end();
        }
    });

    httpServer.patch('/v1/bot-chat/:id', async (req, res) =>{
        console.log('PATCH /v1/bot-chat/:id');
        const { id } = req.params;
        try {
            const chat = buildBotChatPatch(req.body);
            console.log('bot chat patch:', chat);
            const result = updateRow(db, 'bot_chats', id, chat);
            res.send(result);
        } catch (error) {
            logError(error);
            res.status(500).end();
        }
    });

    httpServer.delete('/v1/bot-chat/:id', async (req, res) =>{
        console.log('DELETE /v1/bot-chat/:id');
        const { id } = req.params;
        try {
            const result = db.prepare(`delete from bot_chats where id = @id`).run({ id });
            res.send(result);
        } catch (error) {
            logError(error);
            res.status(500).end();
        }
    });


    /**
     * FUNCTIONS
     */

    function buildFunctionSetPatch(data) {
        const function_set = {};
        if (data.id != null) function_set.id = data.id;
        if (data.label != null) function_set.label = data.label;
        if (data.description != null) function_set.description = data.description;
        return function_set;
    }

    httpServer.post('/v1/function-call', async (req, res) =>{
        console.log('GET /v1/function-call');
        const { context, name, arguments:args } = req.body;
        // context == { cwd, project_id, bot_id, bot_chat_id }
        try {
            if (!name) {
                console.log('wtf', req.body);
            }
            const content = await functions[name](context, args);
            res.send({ role: 'function', name, content });
        } catch (error) {
            logError(error);
            // function owns the error boundary so we SHOULDN'T end up here because of the function
            res.send({ role: 'function', name, content: 'Something went wrong.' });
        }
    });

    httpServer.get('/v1/functions', async (req, res) =>{
        console.log('GET /v1/functions');
        try {
            const rows = db.prepare(`select * from functions order by as_of desc limit 100`).all(); // TODO
            const results = rows.map(fn => ({
                id: fn.id,
                name: fn.name,
                description: fn.description,
                parameters: JSON.parse(fn.parameters)
            }));
            res.send({ results });
        } catch (error) {
            logError(error);
            res.sendStatus(500);
        }
    });

    httpServer.get('/v1/function-sets', async (req, res) =>{
        console.log('GET /v1/functions-sets');
        try {
            const results = db.prepare(`select * from function_sets order by as_of desc limit 100`).all(); // TODO
            res.send({ results });
        } catch (error) {
            logError(error);
            res.sendStatus(500);
        }
    });

    httpServer.get('/v1/function-set/:id', async (req, res) =>{
        console.log('GET /v1/function-set/:id');
        const { id } = req.params;
        try {
            const function_set = db.prepare(`select * from function_sets where id = @id`).get({ id });
            const functions = db.prepare(`select l.id as id, name, description, parameters from function_set_lookup l join functions f on l.function_name = f.name where l.function_set_id = @id`).all({ id });
            const result = { ...function_set, functions };
            res.send(result);
        } catch (error) {
            logError(error);
            res.sendStatus(500);
        }
    });

    httpServer.patch('/v1/function-set/:id', async (req, res) =>{
        console.log('PATCH /v1/function-set/:id');
        const { id } = req.params;
        try {
            const function_set = buildFunctionSetPatch(req.body);
            console.log('function set patch:', function_set);
            const result = updateRow(db, 'function_sets', id, function_set);
            res.send(result);
        } catch (error) {
            logError(error);
            res.sendStatus(500);
        }
    });

    httpServer.post('/v1/function-sets', async (req, res) =>{
        console.log('POST /v1/function-sets');
        const row = buildFunctionSetPatch({ id: nanoid(), ...req.body });
        row.label = row.label ?? 'new function set';
        row.description = row.description ?? 'add description here';
        try {
            const result = upsertRow(db, 'function_sets', row);
            res.send(result);
        } catch (error) {
            logError(error);
            res.sendStatus(500);
        }
    });

    httpServer.post('/v1/function-lookups', async (req, res) =>{
        console.log('POST /v1/function-lookups');
        const { function_set_id, function_name } = req.body;
        if (!(function_name && function_name)) return res.sendStatus(400);
        const fn = {
            id: nanoid(),
            function_set_id,
            function_name
        };
        try {
            const [ result ] = db.prepare(`insert into function_set_lookup ( id, function_set_id, function_name ) values ( @id, @function_set_id, @function_name ) returning *`).all(fn);
            res.send(result);
        } catch (error) {
            logError(error);
            res.sendStatus(500);
        }
    });

    httpServer.delete('/v1/function-lookup/:id', async (req, res) =>{
        console.log('DELETE /v1/function-lookup/:id');
        const { id } = req.params;
        try {
            const result = db.prepare(`delete from function_set_lookup where id = @id`).run({ id });
            res.send(result);
        } catch (error) {
            logError(error);
            res.sendStatus(500);
        }
    });


    /**
     * COMPLETIONS
     */

    function buildCompletionConfigPatch(data) {
        const config = {};
        if (data.id != null) config.id = data.id;
        if (data.label != null) config.label = data.label;
        if (data.model != null) config.model = data.model;
        if (data.max_tokens != null) config.max_tokens = data.max_tokens;
        if (data.temperature != null) config.temperature = data.temperature;
        if (data.top_p != null) config.top_p = data.top_p;
        if (data.n != null) config.n = data.n;
        if (data.frequency_penalty != null) config.frequency_penalty = data.frequency_penalty;
        if (data.presence_penalty != null) config.presence_penalty = data.presence_penalty;
        return config;
    }

    httpServer.get('/v1/completion-configs', async (req, res) =>{
        console.log('GET /v1/completion-configs');
        try {
            const results = db.prepare(`select * from completion_configs order by as_of desc limit 100`).all(); // TODO
            res.send({ results });
        } catch (error) {
            logError(error);
            res.sendStatus(500);
        }
    });

    httpServer.get('/v1/completion-config/:id', async (req, res) =>{
        console.log('GET /v1/completion-config/:id');
        const { id } = req.params;
        try {
            const result = db.prepare(`select * from completion_configs where id = @id`).get({ id }); // TODO
            res.send(result);
        } catch (error) {
            logError(error);
            res.sendStatus(500);
        }
    });

    httpServer.patch('/v1/completion-config/:id', async (req, res) =>{
        console.log('PATCH /v1/completion-config/:id');
        const { id } = req.params;
        try {
            const config = buildCompletionConfigPatch(req.body);
            console.log('completion config patch:', config);
            const result = updateRow(db, 'completion_configs', id, config);
            res.send(result);
        } catch (error) {
            logError(error);
            res.status(500).end();
        }
    });

    httpServer.post('/v1/completion-configs', async (req, res) =>{
        console.log('POST /v1/completion-configs');
        try {
            const config = buildCompletionConfigPatch({ id: nanoid(), ...req.body });
            config.model = config.model ?? 'gpt-4-0613';
            config.label = config.label ?? 'new config';
            config.max_tokens = config.max_tokens ?? 100;
            config.temperature = config.temperature ?? 0.7;
            config.frequency_penalty = config.frequency_penalty ?? 0.3;
            config.presence_penalty = config.presence_penalty ?? 0.1;
            config.top_p = config.top_p ?? 1;
            config.n = config.n ?? 1;
            console.log('completion config:', config);
            const result = upsertRow(db, 'completion_configs', config);
            res.send(result);
        } catch (error) {
            logError(error);
            res.status(500).end();
        }
    });

    httpServer.post('/v1/chat-completions', async (req, res) =>{

        let {
            model, n, max_tokens, functions,
            temperature, top_p, frequency_penalty, presence_penalty
        } = req.body;

        let { message_id } = req.body;

        let messages = [];

        const s = new Set();

        const tokenCapacity = (maxTokenMap[model] ?? 4096) - (max_tokens ?? 500);

        let totalMessageTokenCount = 0;

        while (message_id && !s.has(message_id)) {
            s.add(message_id); // cycle prevention

            const messageRow = db.prepare(`select * from messages where id = @message_id`).get({ message_id });

            totalMessageTokenCount += messageRow.total_tokens ?? 0;
            console.log('********************************************************************************');
            console.log('max_tokens', max_tokens);
            console.log('totalMessageTokenCount', totalMessageTokenCount);
            console.log('********************************************************************************');

            const message = unpackMessage(messageRow, false);
            const messageRequest = {};
            messageRequest.content = message.content ?? '';
            if (message.name !== null) messageRequest.name = message.name;
            if (message.role !== null) messageRequest.role = message.role;
            if (message.function_call !== null) messageRequest.function_call = message.function_call;
            messages.unshift(messageRequest);
            message_id = message.parent_id;
        }

        const options = {};

        if (model != null) options.model = model;
        if (max_tokens != null) options.max_tokens = +max_tokens;
        if (temperature != null) options.temperature = +temperature;
        if (functions != null) options.functions = functions;
        if (top_p != null) options.top_p = +top_p;
        if (n != null) options.n = options.n = +n;
        if (frequency_penalty != null) options.frequency_penalty = +frequency_penalty;
        if (presence_penalty != null) options.presence_penalty = +presence_penalty;

        let finish_reason;

        try {

            const request = {
                ...options,
                messages
            };

            console.log('OPENAI REQUEST:');
            pprint(request);

            console.log('chatCompletionRequestSchema', chatCompletionRequestSchema.validate(request).error ?? 'OK');

            /**
             * auto-truncate history
             * TODO: make an option
             * truncate chat history so that we dont send more than we can send but retain system message(s)
             */

            //let calculatedUsage = calculateChatCompletionUsage(model, request.messages, functions);
            //console.log('calculatedUsage.totalTokens', calculatedUsage.totalTokens);
            //console.log('tokenCapacity', tokenCapacity);
            //if (calculatedUsage.totalTokens > tokenCapacity) {
                //const continuationPrompt = {
                    //role: 'system',
                    //content: 'This is a truncated continuation of a previous chat. Ask the user for more details there seems to be details you cannot remember.'
                //}
                //let head = [];
                //while (request.messages[0].role === 'system') {
                    //console.log('retaining system messsge', request.messages[0]);
                    //head = [ ...head, request.messages[0] ];
                    //request.messages = request.messages.slice(1);
                //}
                //head = [ ...head, continuationPrompt ]
                //do  {
                    //console.log('further truncating request...');
                    //request.messages = request.messages.slice(1);
                    //calculatedUsage = calculateChatCompletionUsage(model, [ ...head, ...request.messages ], functions);
                //} while (calculatedUsage.totalTokens > tokenCapacity)
            //}

            const response = await getChatCompletion(request);
            // {
            //   id: 'chatcmpl-7ZUVIe4vEIWqEgDFFTw9WiD2joC7O',
            //   object: 'chat.completion',
            //   created: 1688693092,
            //   model: 'gpt-4-0613',
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
            res.send(response);

        } catch (error) {
            let msgData = error?.response?.data;
            if (!msgData) {
                try {
                    msgData = msgData ?? error.toJSON();
                } catch {}
            }
            if (!msgData) {
                msgData = { stack: error.stack };
            }
            res.status(400).send(msgData);
        }
    });


    /**
     * AUDIO
     */

    // file upload
    const upload_dest = path.resolve(project_root, 'tmp', 'uploads');
    const storage = multer.diskStorage({
          destination(req, file, cb) {
              cb(null, upload_dest)
          },
          filename(req, file, cb) {
              const { name, ext } = path.parse(file.originalname);
              cb(null, name + '-' + Date.now() + ext);
          }
    });
    await mkdir(upload_dest, { recursive: true });

    const upload = multer({ storage })

    httpServer.post('/v1/transcribe', upload.single('file'), async (req, res) => {
        const { file } = req;
        console.log('POST - /v1/transcribe', file.path);
        const { data: { text: transcript } } = await openai.createTranscription(
            fs.createReadStream(file.path),
            'whisper-1'
        );
        console.log('POST - /v1/transcribe', transcript);
        res.send({ file, transcript });
    });

    httpServer.post('/v1/ssml', async (req, res) => {
        console.log('POST - /v1/ssml');
        const content = req.body.content;
        const ssml = await toSSML(content);
        res.send({ content, ssml });
    });

    httpServer.post('/v1/synth/:provider', async (req, res) => {
        const { provider } = req.params;
        console.log(`POST - /v1/synth/${provider}`);
        const content = req.body.ssml ?? req.body.content;
        const ssml = !!req.body.ssml;
        try {
            const audio = await getSynthAudio(provider, content, { ssml });
            res.send(200, audio);
        } catch (error) {
            console.log(error);
            res.sendStatus(400);
        }
    });

    httpServer.post('/v1/ss-synth/google', async (req, res) => {
        console.log('POST - /v1/ss-synth/google', req.body);
        const content = req.body.ssml ?? req.body.content;
        const ssml = !!req.body.ssml;
        const voice = req.body.voice ?? 'en-US/en-US-Neural2-F/FEMALE';
        try {
            await googleSynth(content, { ssml, voice: req.body.voice });
            res.sendStatus(200);
        } catch (error) {
            console.log(error);
            res.sendStatus(400);
        }
    });

    httpServer.post('/v1/ss-synth/mimic', async (req, res) => {
        console.log('POST - /v1/ss-synth/mimic');
        const content = req.body.ssml ?? req.body.content;
        const ssml = !!req.body.ssml;
        const options = { ssml };
        if (req.body.voice) options.voice = req.body.voice;
        try {
            await mimicSynth(content, options);
            res.sendStatus(200);
        } catch (error) {
            console.log(error);
            res.sendStatus(400);
        }
    });


    /**
     * WEBSOCKET API
     */

    const wsServer = await createWsServer();

    wsServer.on('connection', socket => {

        console.log('new ws connection');

        // handle message

        socket.on('message', message => {
            const messageData = JSON.parse(message.toString());
            console.log('message data:', messageData);
            socket.send(JSON.stringify(messageData));
        });

    });


    /**
     * START SERVER
     */

    const port = process.env.PORT || 8888;
    const app = httpServer.listen(port, () => console.log(`http: listening on ${port}`));
    app.on('upgrade', (req, socket, head) => {
        if (req.url === '/events') {
            console.log('handling upgrade request');
            wsServer.handleUpgrade(req, socket, head, socket => wsServer.emit('connection', socket, req));
        }
    });

} catch (error) {
    console.error('error caught at entrypoint');
    logError(error);
}

/**
 * CLEANUP
 */

let clean = false;

const cleanup = async () => {
    clean = true;
    console.log('cleaning up...');
    // TODO
};

async function onExit () {
    try {
        if (!clean) await cleanup();
        process.exit(0);
    } catch (e) {
        console.error(e.stack);
        process.exit(1);
    }
}

process.on('exit', onExit);
process.on('beforeExit', onExit);
