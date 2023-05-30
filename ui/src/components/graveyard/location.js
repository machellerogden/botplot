export const createVirtualLocation = (location = window.location) => new URL((url => url.origin + url.hash.substring(1))(location));

const virtualLocation = writable(createVirtualLocation());

export const location = {
    subscribe(cb) {
        const hashChangeHandler = event => {
            if (!event.newURL.includes('#/')) {
                log.set('assume root hash');
                cb(new URL(window.location.origin + '#/'))
                return;
            }
            cb(createVirtualLocation(new URL(event.newURL)));
        };
        addEventListener('hashchange', hashChangeHandler);
        const _locationUnsubscribe = virtualLocation.subscribe(cb); 
        return () => {
            removeEventListener('hashchange', hashChangeHandler);
            return _locationUnsubscribe();
        };
    },

    // set with location string
    //
    //      $location = '/foo/bar?baz=qux';
    //
    // note: must be absolute path
    set(loc) {
        if (!loc.startsWith('/')) return log.set(`can't set invalid location`);
        window.location.hash = '#' + loc;
    }
};
