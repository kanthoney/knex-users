
'use strict';

module.exports = require('knex')({ dialect: 'sqlite3', connection:{ filename: 'test.sqlite' }, useNullAsDefault: true });

