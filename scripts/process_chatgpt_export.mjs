#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { EOL } from 'node:os';
import { inspect } from 'node:util';
import path from 'node:path';
import url from 'node:url';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const target_dir = path.resolve(__dirname, 'chatgpt-export-2023-07-04-03-08-01');

const conversations_json_file_path = path.resolve(target_dir,'conversations.json');

const json = JSON.parse(await readFile(conversations_json_file_path, 'utf8'));

const processed = json.reduce((chats, {
    id,
    current_node: message_id,
    title: label,
    create_time,
    update_time,
    mapping
}) => {
    const conversation = {
        id,
        message_id,
        label,
        as_of: update_time ?? create_time,
        messages: []
    };
    let next_message_id = message_id;
    let next_message_data;
    let i = 0;
    while (next_message_id != null) {
        next_message_data = mapping[next_message_id];
        if (next_message_data.message == null || next_message_data.message.content?.content_type != 'text') {
            next_message_id = next_message_data.parent;
            continue;
        }
        conversation.messages.unshift({
            id: next_message_data.id,
            role: next_message_data.message.author.role,
            as_of: next_message_data.message.update_time ?? next_message_data.message.create_time,
            parent_id: next_message_data.parent,
            content: next_message_data.message.content.parts.join(EOL)
        });
        next_message_id = next_message_data.parent;
    }
    chats.push(conversation);
    return chats;
}, []);

await writeFile(path.resolve(target_dir, 'conversations_processed.json'), JSON.stringify(processed, null, 4), 'utf8');

//.load ./lines0

//create table articles(
  //headline text,
  //headline_embedding blob,
  //description text,
  //description_embedding blob,
  //link text,
  //category text,
  //authors text,
  //date
//);

//insert into articles(headline, description, link, category, authors, date)
  //select
    //line ->> '$.headline'           as headline,
    //line ->> '$.short_description'  as description,
    //line ->> '$.link'               as link,
    //line ->> '$.category'           as category,
    //line ->> '$.authors'            as authors,
    //line ->> '$.date'               as date
  //from lines_read('News_Category_Dataset_v3.json');
