<script>
    import { location } from './location.js';

    let component;

    // [ [ <routeExpression>, <Component> ] ]
    export let routes = new Map();

    function is(routeExpression, location) {
        let pass = false;
        if (routeExpression instanceof RegExp) {
            pass = routeExpression.test(location.pathname);
        } else {
            pass = routeExpression == location.pathname;
        }
        return pass;
    }

    function match(location, routes) {
        for (const [ routeExpression, Component ] of routes) {
            if (is(routeExpression, location)) {
                component = Component;
                break;
            }
        }
    }

    $: pathname = $location?.pathname;

    $: {
        if (pathname) match($location, routes);
    }

</script>

<svelte:component this={component} />

<!--
<script>
    import Router from './routes/Router.svelte';
    const routes = new Map([
        [ '/', Conversation ],
        [ '/home', Conversation ]
    ]);
</script>
<Router {routes} />
-->

