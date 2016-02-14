
'use strict';

var db = require('./db');
module.exports = function(config)
{
  return require('../index')(db, config);
}

