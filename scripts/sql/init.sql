/*
 * users
 */

create table if not exists users (
    id text primary key,
    username text unique,
    as_of timestamp default current_timestamp
);

insert or ignore into users (id, username) values ('default', 'default');

/*
 * projects
 */

create table if not exists projects (
    id text primary key,
    user_id text,
    label text,
    description text,
    as_of timestamp default current_timestamp
);

create index if not exists projects_user_id on projects (user_id);

insert or ignore into projects (id, label, description) values ('default', 'default', 'default');

/*
 * workspaces
 */

create table if not exists workspaces (
    id text primary key,
    label text,
    description text,
    location_type text,
    location_ref text,
    as_of timestamp default current_timestamp
);

insert or ignore into workspaces (id, label, description, location_type, location_ref) values ('default', 'default', 'default', 'local', './tmp');

/*
 * bots
 */

create table if not exists bots (
    id text primary key,
    project_id text default 'default',
    ka text,
    aka text,
    description text,
    voice_provider text,
    voice_key text,
    completion_config_id text,
    prelude_id text,
    function_set_id text,
    as_of timestamp default current_timestamp
);

create index if not exists bots_project_id on bots (project_id);

insert or ignore into bots (
    id, ka, aka, description,
    voice_provider, voice_key,
    completion_config_id, prelude_id, function_set_id
) values (
    'default', 'bot', 'default bot', 'a preconfigured bot with sensible defaults',
    'google', 'en-US/en-US-Neural2-F/FEMALE',
    'default', 'default', 'default'
);

create table if not exists messages (
    id text primary key,
    root_id text,
    parent_id text,
    content text,
    function_call_name text,
    function_call_args text,
    ssml text,
    role text not null,
    name text,
    finish_reason text default 'stop',
    total_tokens integer default 0,
    as_of timestamp default current_timestamp
);

create index if not exists messages_parent_id on messages (parent_id);

insert or ignore into messages (
    id, content, role
) values (
    'default', 'You are a helpful assistant.', 'system'
);

create table if not exists chats (
    id text primary key,
    message_id text,
    workspace_id text,
    label text,
    model text not null,
    max_tokens integer,
    temperature real,
    top_p real,
    n real,
    frequency_penalty real,
    presence_penalty real,
    prompt_tokens integer default 0,
    completion_tokens integer default 0,
    total_tokens integer default 0,
    as_of timestamp default current_timestamp
);

insert or ignore into chats (
    id, message_id, workspace_id, label, model, max_tokens, temperature, top_p, n, frequency_penalty, presence_penalty
) values (
    'default', 'default', 'default', 'default', 'gpt-4', 1000, 0.3, 1, 1, 0.3, 0.15
);

create table if not exists completion_configs (
    id text primary key,
    label text,
    model text not null,
    max_tokens integer,
    temperature real,
    top_p real,
    n real,
    frequency_penalty real,
    presence_penalty real,
    as_of timestamp default current_timestamp
);

insert or ignore into completion_configs (
    id, label, model, max_tokens, temperature, top_p, n, frequency_penalty, presence_penalty
) values (
    'default', 'default', 'gpt-4', 1000, 0.3, 1, 1, 0.3, 0.15
);

create table if not exists functions (
    id text primary key,
    name text,
    description text,
    parameters text,
    as_of timestamp default current_timestamp
);

create index if not exists functions_name on functions (name);

create table if not exists function_sets (
    id text primary key,
    label text,
    description text,
    as_of timestamp default current_timestamp
);

insert or ignore into function_sets (
    id, label, description
) values (
    'default', 'default', 'default'
);

create table if not exists function_set_lookup (
    id text primary key,
    function_set_id text,
    function_name text,
    as_of timestamp default current_timestamp
);

create table if not exists bot_chats (
    id text primary key,
    bot_id text,
    message_id text,
    workspace_id text,
    label text,
    prompt_tokens integer default 0,
    completion_tokens integer default 0,
    total_tokens integer default 0,
    as_of timestamp default current_timestamp
);

insert or ignore into bot_chats (
    id, bot_id, message_id, workspace_id, label
) values (
    'default', 'default', 'default', 'default', 'default'
);

insert or ignore into functions (name, description, parameters)
values
    ('vkxcK-lEsXPq-a-Dm5AZI', 'set_chat_label',      'Set the label of the current chat',             '{"type":"object","properties":{"label":{"type":"string","description":"A clever descriptive label of the current chat, e.g. Mysterious Penguin Story"}},"required":["label"]}'),
    ('hCTmB3tw6y3h9_SBBqaC3', 'set_timer',           'Sets a timer with given minutes',               '{"type":"object","properties":{"minutes":{"type":"number","description":"number of minutes to set on timer"}},"required":["minutes"]}'),
    ('NnP4M9xMUWaiNq-5Bm6DI', 'search_web',          'Search the internet',                           '{"type":"object","properties":{"q":{"type":"string","description":"Search query"}},"required":["q"]}'),
    ('U8gioshhHaTZN2GUyJffH', 'fetch_webpage',       'Fetch text content of a url',                   '{"type":"object","properties":{"url":{"type":"string","description":"URL to fetch"}},"required":["url"]}'),
    ('-ANMVEU6xiXGTQfci4U_Q', 'extract_main_content','Extract the main content from given text',      '{"type":"object","properties":{"text":{"type":"string","description":"Subject text from which to extract main content"}},"required":["text"]}'),
    ('c3pOKspvXyEvP6GCExW6y', 'shell_command',       'Executes a bash shell command on Mac OS',       '{"type":"object","properties":{"command":{"type":"string","description":"Command to run"}},"required":["command"]}'),
    ('lhlLHrbUWuOZkmGfYo8kJ', 'mkdir',               'Recursivey make a new directory on disk',       '{"type":"object","properties":{"dir_path":{"type":"string","description":"Directory path to create"}},"required":["dir_path"]}'),
    ('_WurUw5ZD5ekBpU3bG7dc', 'read_file',           'Read file from disk',                           '{"type":"object","properties":{"file_path":{"type":"string","description":"File path to read"}},"required":["file_path"]}'),
    ('Da9fOsg2MKNlmyugm05Rd', 'write_file',          'Write file to disk',                            '{"type":"object","properties":{"file_path":{"type":"string","description":"File path to write to"},"text":{"type":"string","description":"Text to write to file"}},"required":["file_path","text"]}'),
    ('f2GPO3wwlBU_kYYpBbX-G', 'copy_to_clipboard',   'Copy text to system clipboard',                 '{"type":"object","properties":{"text":{"type":"string","description":"Text to copy"}},"required":["file_path","text"]}'),
    ('dHH70vSu-heuyOKE_m2tt', 'remember',            'Remember something you may have forgotten',     '{"type":"object","properties":{"subject":{"type":"string","description":"The subject of your quandry"}},"required":["subject"]}');
