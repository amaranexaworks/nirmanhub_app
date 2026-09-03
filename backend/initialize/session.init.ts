/**
 * session.init — builds the express-session middleware backed by connect-pg-simple
 * (Postgres). Exposes the store globally as `global.sessionStore` so the auth
 * middleware can validate a request's token against the session saved at login.
 * Mirrors the WMS `initialize/session.init.ts`.
 */
export {};
const session = require('express-session');
const connectPgSimple = require('connect-pg-simple');
const sqldb = require((global as any).appRoot + '/config/db.config');
const sessionConfig = require((global as any).appRoot + '/config/session.config');

exports.buildSessionMiddleware = function () {
  const PgStore = connectPgSimple(session);
  const store = new PgStore({
    pool: sqldb.SessionPool,
    tableName: sessionConfig.session.pgStore.tableName,
    schemaName: sessionConfig.session.pgStore.schemaName,
    createTableIfMissing: sessionConfig.session.pgStore.createTableIfMissing,
    pruneSessionInterval: sessionConfig.session.pgStore.pruneSessionInterval,
  });

  // Expose for the authenticate() middleware.
  (global as any).sessionStore = store;

  return session({
    name: sessionConfig.session.cookieName,
    store,
    secret: sessionConfig.session.secret,
    resave: sessionConfig.session.resave,
    saveUninitialized: sessionConfig.session.saveUninitialized,
    rolling: sessionConfig.session.rolling,
    cookie: sessionConfig.session.cookie,
  });
};
