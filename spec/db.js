
'use strict';

var config = {
  sqlite3: { client: 'sqlite3', connection:{ filename: 'test.sqlite' }, useNullAsDefault: true },
  mysql: { client: 'mysql',
           connection: {
             host: 'localhost',
             user: 'kevin',
             database: 'knex_users_test' } },
  pg: { client: 'pg',
        connection: "postgresql://knex_users_test:test@localhost/knex_users_test" }
}

module.exports = require('knex')(config.sqlite3);

