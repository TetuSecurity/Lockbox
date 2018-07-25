workbox.skipWaiting();
workbox.clientsClaim();

workbox.routing.registerRoute(
    /\/api\/.+/i, 
    workbox.strategies.networkFirst({ 
        networkTimeoutSeconds: 5, 
        cacheName: 'api-cache',
        plugins: [
            new workbox.cacheableResponse.Plugin({
                statuses: [200]
            }),
        ]
    }), 
    'GET'
);

workbox.routing.registerRoute(
    /\/[0-9]+\..*?\.min\.js$/i, 
    workbox.strategies.networkFirst({ 
        networkTimeoutSeconds: 5, 
        cacheName: 'bundle-cache',
        plugins: [
            new workbox.cacheableResponse.Plugin({
                statuses: [200]
            })
        ]
    }), 
    'GET'
);

workbox.routing.registerRoute(
    /^http.*\.((ico)|(jpg)|(png)|(svg)|(woff(2?))|(eot)|(ttf)|(xml))$/i, 
    workbox.strategies.staleWhileRevalidate({ 
        cacheName: 'asset-cache', 
        plugins: [
            new workbox.cacheableResponse.Plugin({
                statuses: [0, 200],
            }),
            new workbox.expiration.Plugin({
                maxAgeSeconds: 86400,
                purgeOnQuotaError: true // they are images, get rid of them for more important stuff
            })
        ] 
    }), 
    'GET'
);

workbox.routing.registerNavigationRoute('/index.html'); // always serve index, just like when the internet is live

self.addEventListener('fetch', function() {}); // empty fetch so google will prompt for install

self.__precacheManifest = [].concat(self.__precacheManifest || []);
workbox.precaching.suppressWarnings();
workbox.precaching.precacheAndRoute(self.__precacheManifest, {});
