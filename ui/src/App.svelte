<script>

    import { createHashSource } from './lib/hashHistory.js';
    import Chat from './routes/Chat.svelte';
    import BotStudio from './routes/BotStudio.svelte';
    import Welcome from './routes/Welcome.svelte';
    import Settings from './routes/Settings.svelte';
    import { Router, Route, createHistory } from 'svelte-navigator';

    const history = createHistory(createHashSource());

    export let url = '';
    export let basepath = '/';
</script>

<Router primary={false} {basepath} {url} {history}>
    <Route path="" component={Welcome} />
    <Route path="bots" component={BotStudio} />
    <Route path="bot/*">
        <Route path=":bot_id/chat/:chat_id" let:params>
            <BotStudio id={params.bot_id} chat_id={params.chat_id} />
        </Route>
        <Route path=":bot_id" let:params>
            <BotStudio id={params.bot_id} />
        </Route>
    </Route>
    <Route path="chats" component={Chat} />
    <Route path="chat/:id" let:params>
        <Chat id={params.id} />
    </Route>
    <Route path="user" component={Settings} />
</Router>
