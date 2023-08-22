<!--
    Minimalist HashRouter - no history, etc.

    Usage:

    <script>
        import Router from './routes/Router.svelte';
        const routes = new Map([
            [ '/', Conversation ],
            [ '/home', Conversation ]
        ]);
    </script>

    <Router {routes} />

-->

<script context="module">
    import { writable } from 'svelte/store';

    // just to make this work from inside the svelte.dev's iframe
    const _window = window.parent;

    export const createVirtualLocation = (location = _window.location) => {
        const url = new URL((url => url.origin + url.hash.substring(1))(location));
        console.log(`new virtual location: ${url}`);
        return url;
    }

    const virtualLocation = writable(createVirtualLocation()); // use parent for demo

    export const location = {
        subscribe(cb) {
            const hashChangeHandler = event => {
                if (!event.newURL.includes('#/')) {
                    cb(new URL(window.parent.location.origin + '#/'))
                    return;
                }
                cb(createVirtualLocation(new URL(event.newURL)));
            };
            _window.addEventListener('hashchange', hashChangeHandler);
            const _locationUnsubscribe = virtualLocation.subscribe(cb); 
            return () => {
                _window.removeEventListener('hashchange', hashChangeHandler);
                return _locationUnsubscribe();
            };
        },

        // set with location string
        //
        //      $location = '/foo/bar?baz=qux';
        //
        // note: must be absolute path

        set(loc) {
            if (!loc.startsWith('/')) return console.log(`can't set invalid location`);
            _window.location.hash = '#' + loc;
        }
    }

    export const is = (routeExpression, loc) =>
        loc == null                           ? false
      : routeExpression instanceof RegExp     ? routeExpression.test(loc.pathname)
      : typeof routeExpression === 'function' ? routeExpression(location)
      : typeof routeExpression === 'boolean'  ? routeExpression
      :                                         routeExpression == loc.pathname;

    export function match(loc, routes) {
        let component;
        for (const [ routeExpression, Component ] of routes) {
                if (is(routeExpression, loc)) {
                        component = Component;
                        break;
                }
        }
        return component;
    }
</script>

<script>
    export let routes = new Map(); // [ [ <routeExpression>, <Component> ] ]

    $: pathname = $location?.pathname;
    $: component = match($location, routes);
</script>

{#if component}
    <svelte:component this={component} />
{/if}
