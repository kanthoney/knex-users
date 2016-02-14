
var users = require('./users')();
var Promise = require('bluebird');
var user_list = require('./user_list');
var uuid = require('uuid');
var sha1 = require('sha1');
var _ = require('lodash');

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
          var user_copy = _.defaults({password: hash_password(user.password), lockable: false}, user);
          return users.add(user_copy);
        });
      })
      .finally(function() {
        done();
      });
  });

  it("should reject users when sending plain password", function(done) {
    Promise.map(user_list,
                function(user)
                {
                  return users.authenticate(user.id, user.password)
                    .then(function() {
                      fail('Authenticated user with hashed password when using plain password');
                    })
                    .catch(function(error) {
                      expect(error).toEqual('Password rejected');
                    })
                      })
      .finally(function() {
        done();
      });
  });

  it("should accept users when sending hashed password", function(done) {
    Promise.map(user_list,
                function(user) 
                {
                  return users.authenticate(user.id, hash_password(user.password))
                    .catch(function(error) {
                      fail(error);
                    })
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
    Promise.map(user_list,
                function(user)
                {
                  return users.authenticate(user.id, user.password, compare)
                    .then(function() {
                      fail('Authenticated user with challenge when using plain password');
                    })
                    .catch(function(error) {
                      expect(error).toEqual('Password rejected');
                    })
                      })
      .finally(function() {
        done();
      });
  });

  it("should reject users when sending hashed password", function(done) {
    Promise.map(user_list,
                function(user)
                {
                  return users.authenticate(user.id, hash_password(user.password), compare)
                    .then(function() {
                      fail('Authenticated user with challenge when using hash password');
                    })
                    .catch(function(error) {
                      expect(error).toEqual('Password rejected');
                    })
                      })
      .finally(function() {
        done();
      });
  });

  it("should accept users when sending challenge password", function(done) {
    Promise.map(user_list,
                function(user) 
                {
                  return users.authenticate(user.id, sha1(hash_password(user.password) + challenge), compare)
                    .catch(function(error) {
                      fail(error);
                    })
                      })
      .finally(function() {
        done();
      });
  });

});

