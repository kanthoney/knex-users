
'use strict';

module.exports = require('knex')({ client: 'sqlite3', connection:{ filename: 'test.sqlite' }, useNullAsDefault: true });

