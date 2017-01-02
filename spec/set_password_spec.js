
var Promise = require('bluebird');
var user_list = require('./user_list');
var uuid = require('uuid');
var sha1 = require('sha1');
var _ = require('lodash');

var salt = uuid.v4();
var hash_password = function(password)
{
  return sha1(sha1(password) + salt);
}

var users = require('./users')({hash_password: hash_password});
var helpers = require('./helpers')(users);

describe("Authentication tests", function() {

  beforeAll(function(done) {
    helpers.reset()
      .then(function() {
        return helpers.populate(user_list);
      })
      .then(function() {
        return helpers.update(user_list);
      })
      .finally(function() {
        done();
      });
  });

  var challenge = uuid.v4();
  var check_password = function(supplied, stored)
  {
    return supplied == sha1(stored + challenge);
  }
  
  var add_challenge = function(password)
  {
    return sha1(hash_password(password) + challenge);
  }

  it("should accept users when sending challenged password", function(done) {
    Promise
      .map(user_list,
           function(user) 
           {
             return helpers.auth_compare(user.id, add_challenge(user.new_password), check_password);
           })
      .finally(function() {
        done();
      });
  });
  
  it("should reject users when sending plain password", function(done) {
    Promise
      .map(user_list,
           function(user)
           {
             return helpers.auth(user.id, user.new_password, 'Password rejected');
           })
      .finally(function() {
        done();
      });
  });

  it("should accept users when sending hashed password with no compare function", function(done) {
    Promise
      .map(user_list,
           function(user)
           {
             return helpers.auth(user.id, hash_password(user.new_password))
           })
      .finally(function() {
        done();
      });
  });

  it("should reject users when sending plain password when using straight compare function", function(done) {
    Promise
      .map(user_list,
           function(user)
           {
             return helpers.auth_compare(user.id, user.new_password, _.eq, 'Password rejected')
           })
      .finally(function() {
        done();
      });
  });

  it("should accept users when sending hashed password when using a straight compare function", function(done) {
    Promise
      .map(user_list,
           function(user) 
           {
             return helpers.auth_compare(user.id, hash_password(user.new_password), _.eq);
           })
      .finally(function() {
        done();
      });
  });

});

