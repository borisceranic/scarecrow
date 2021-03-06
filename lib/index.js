'use strict';

// Load modules

const Hoek = require('hoek');
const Oz = require('oz');


// Declare internals

const internals = {};


// Defaults

internals.defaults = {

    // Oz options

    oz: {
        encryptionPassword: null,
        loadAppFunc: null,
        loadGrantFunc: null,
        hawk: null,
        ticket: null
    },

    // Scarecrow options

    urls: {
        app: '/oz/app',
        reissue: '/oz/reissue',
        rsvp: '/oz/rsvp'
    }
};


exports.register = function (server, options, next) {

    server.auth.scheme('oz', internals.oz);
    next();
};


exports.register.attributes = {
    pkg: require('../package.json')
};


internals.oz = function (server, options) {

    Hoek.assert(options, 'Invalid hawk scheme options');
    Hoek.assert(options.oz, 'Missing required oz configuration');

    const settings = Hoek.applyToDefaults(internals.defaults, options);

    // Add protocol endpoints

    const endpoint = (name) => {

        const route = {
            auth: false,                            // Override any defaults
            handler: function (request, reply) {

                Oz.endpoints[name](request.raw.req, request.payload, settings.oz, reply);
            }
        };

        return route;
    };

    server.route([
        { method: 'POST', path: settings.urls.app, config: endpoint('app') },
        { method: 'POST', path: settings.urls.reissue, config: endpoint('reissue') },
        { method: 'POST', path: settings.urls.rsvp, config: endpoint('rsvp') }
    ]);

    const scheme = {
        api: { settings },
        authenticate: function (request, reply) {

            Oz.server.authenticate(request.raw.req, settings.oz.encryptionPassword, { hawk: settings.oz.hawk }, (err, credentials, artifacts) => {

                const result = { credentials, artifacts };
                if (err) {
                    return reply(err, null, result);
                }

                return reply.continue(result);
            });
        }
    };

    return scheme;
};
