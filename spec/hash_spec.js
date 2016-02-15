
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

describe("Authentication tests", function() {

  beforeAll(function(done) {
    users.migrate_down()
      .then(function() {
        return users.migrate_up();
      })
      .then(function() {
        return Promise.map(user_list, function(user) {
          var user_copy = _.clone(user);
          user_copy.lockable = false;
          return users.add(user_copy);
        });
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
    Promise.map(user_list,
                function(user) 
                {
                  return users.authenticate(user.id, add_challenge(user.password), check_password)
                    .catch(function(error) {
                      fail(error);
                    })
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
                      fail('Authenticated user with stored hashed password when using plain password');
                    })
                    .catch(function(error) {
                      expect(error).toEqual('Password rejected');
                    })
                      })
      .finally(function() {
        done();
      });
  });

  it("should accept users when sending hashed password with no compare function", function(done) {
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

  it("should reject users when sending plain password when using straight compare function", function(done) {
    Promise.map(user_list,
                function(user)
                {
                  return users.authenticate(user.id, user.password, _.eq)
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

  it("should accept users when sending hashed password when using a straight compare function", function(done) {
    Promise.map(user_list,
                function(user) 
                {
                  return users.authenticate(user.id, hash_password(user.password), _.eq)
                    .catch(function(error) {
                      fail(error);
                    })
                      })
      .finally(function() {
        done();
      });
  });

});

