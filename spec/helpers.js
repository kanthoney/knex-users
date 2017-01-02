
'use strict';

var Promise = require('bluebird');

module.exports = function(users) {

  var reset = function()
  {
    return users.migrate_down()
      .then(function() {
        return users.migrate_up();
      });
  }

  var populate = function(user_list)
  {
    return Promise.map(user_list, function(user) {
      return users.add(user);
    });
  }

  var update = function(user_list)
  {
    return Promise.map(user_list, function(user) {
      return users.set_password(user.id, user.new_password);
    });
  }

  var auth = function(id, password, message)
  {
    return users.authenticate(id, password)
      .then(function() {
        if(message) {
          fail("Authenticated user when expecting '" + message + "'");
        }
      })
      .catch(function(error) {
        if(!message) {
          fail(error);
        } else {
          expect(error).toEqual(message);
        }
      });
  }

  var auth_compare = function(id, password, compare, message)
  {
    return users.authenticate(id, password, compare)
      .then(function() {
        if(message) {
          fail("Authenticated user when expecting '" + message + "'");
        }
      })
      .catch(function(error) {
        if(!message) {
          fail(error);
        } else {
          expect(error).toEqual(message);
        }
      });
  }

  return {
    auth: auth,
    auth_compare: auth_compare,
    populate: populate,
    update: update,
    reset: reset
  }
}

