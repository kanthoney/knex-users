
var users = require('./users')();
var Promise = require('bluebird');
var user_list = require('./user_list');
var uuid = require('uuid');
var sha1 = require('sha1');
var _ = require('lodash');
var helpers = require('./helpers')(users);

var salt = uuid.v4();

describe("Authentication tests", function() {

  var hash_password = function(password)
  {
    return sha1(sha1(password) + salt);
  }

  beforeAll(function(done) {
    users.migrate_down()
      .then(function() {
        return users.migrate_up();
      })
      .then(function() {
        return Promise.map(user_list, function(user) {
          var user_copy = _.clone(user);
          _.assign(user_copy, {password: hash_password(user.password), lockable: false});
          return users.add(user_copy);
        });
      })
      .finally(function() {
        done();
      });
  });

  it("should reject users when sending plain password", function(done) {
    Promise.
      map(user_list,
          function(user)
          {
            return helpers.auth(user.id, user.password, 'Password rejected');
          })
      .finally(function() {
        done();
      });
  });

  it("should accept users when sending hashed password", function(done) {
    Promise
      .map(user_list,
           function(user) 
           {
             return helpers.auth(user.id, hash_password(user.password));
           })
      .finally(function() {
        done();
      });
  });

  var challenge = uuid.v4();
  var compare = function(supplied, stored)
  {
    return supplied == sha1(stored + challenge);
  }

  it("should reject users when sending plain password", function(done) {
    Promise
      .map(user_list,
           function(user)
           {
             return helpers.auth_compare(user.id, user.password, compare, 'Password rejected');
           })
      .finally(function() {
        done();
      });
  });

  it("should reject users when sending hashed password", function(done) {
    Promise
      .map(user_list,
           function(user)
           {
             return helpers.auth_compare(user.id, hash_password(user.password), compare, 'Password rejected');
           })
      .finally(function() {
        done();
      });
  });

  it("should accept users when sending challenge password", function(done) {
    Promise
      .map(user_list,
           function(user) 
           {
             return helpers.auth_compare(user.id, sha1(hash_password(user.password) + challenge), compare);
           })
      .finally(function() {
        done();
      });
  });

});

