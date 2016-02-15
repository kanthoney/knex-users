
var users = require('./users')();
var Promise = require('bluebird');
var user_list = require('./user_list');

describe("Password change", function() {

  beforeAll(function(done) {
    users.migrate_down()
      .then(function() {
        return users.migrate_up();
      })
      .then(function() {
        return Promise.map(user_list, function(user) {
          return users.add(user);
        });
      })
      .finally(function() {
        done();
      });
  });

  it("should change password of 'jerry' to 'guest' after 1000ms", function(done) {
    var old_password_change;
      users.get('jerry')
        .then(function(record) {
          old_password_change = record.password_changed;
          return Promise.delay(1000);
        })
      .then(function() {
        return users.set_password('jerry', 'guest');
      })
      .then(function() {
        return users.get('jerry');
      })
      .then(function(record) {
        expect(record.password_changed).toBeGreaterThan(old_password_change);
      })
      .catch(function(error) {
        fail(error);
      })
        .finally(function() {
          done();
        });
  });

  it("should reject 'jerry' with password 'letmeout'", function(done) {
    users.authenticate('jerry', 'letmeout')
      .then(function() {
        fail('Authenticated user with wrong password');
      })
      .catch(function(error) {
        expect(error).toEqual('Password rejected');
      })
        .finally(function() {
          done();
        });
  });

  it("should accept 'jerry' with password 'guest'", function(done) {
    users.authenticate('jerry', 'guest')
      .catch(function(error) {
        fail(error);
      })
        .finally(function() {
          done();
        });
  });
});

