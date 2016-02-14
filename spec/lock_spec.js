
var users = require('./users')();
var Promise = require('bluebird');
var user_list = require('./user_list');

describe("Account locking", function() {

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

  it("should lock user 'alexa'", function(done) {
    users.lock('alexa')
      .then(function() {
        return users.get('alexa');
      })
      .then(function(record) {
        expect(record.locked).toBeTruthy();
      })
      .catch(function(error) {
        fail(error);
      })
        .finally(function() {
          done();
        });
  });

  it("should reject 'alexa' twice with 'Account locked' error", function(done) {
    var passwords = ['123456', 'g%$2;oF&'];
    Promise.map(passwords,
                function(password)
                {
                  return Promise
                    .delay(20,
                           users.authenticate('alexa', password)
                           .then(function() {
                             fail('Authenticated locked user');
                           })
                           .catch(function(error) {
                             expect(error).toEqual('Account locked');
                           }))
                })
      .finally(function() {
        done();
      });
  });

  it("should unlock 'alexa'", function(done) {
    users.unlock('alexa')
      .then(function() {
        return users.get('alexa');
      })
      .then(function(record) {
        expect(record.locked).toBeFalsy();
        expect(record.failed_logins).toEqual(0);
        expect(record.frozen_at).toBeNull();
      })
      .finally(function() {
        done();
      });
  });

  it("should reject 'alexa' with password 'g%$2;oF&' with 'Password rejected'", function(done) {
    users.authenticate('alexa', 'g%$2;oF&')
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

  it("should accept 'alexa' with password '123456'", function(done) {
    users.authenticate('alexa', '123456')
      .catch(function(error) {
        fail(error);
      })
        .finally(function() {
          done();
        });
  });

  it("should not lock 'jerry'", function(done) {
    users.lock('jerry')
      .then(function() {
        fail('Locked unlockable account');
      })
      .catch(function(error) {
        expect(error).toEqual('Account not lockable');
        return users.get('jerry');
      })
        .then(function(record) {
          expect(record.locked).toBeFalsy();
        })
      .finally(function() {
        done();
      });
  });

  it("should reject 'jerry' with password 'g%$2;oF&' with 'Password rejected'", function(done) {
    users.authenticate('jerry', 'g%$2;oF&')
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

  it("should leave 'jerry' unlocked", function(done) {
    users.unlock('jerry')
      .then(function() {
        return users.get('jerry');
      })
      .then(function(record) {
        expect(record.locked).toBeFalsy();
        expect(record.failed_logins).toEqual(0);
        expect(record.frozen_at).toBeNull();
      })
      .finally(function() {
        done();
      });
  });

  it("should reject 'jerry' with password 'g%$2;oF&' with 'Password rejected'", function(done) {
    users.authenticate('jerry', 'g%$2;oF&')
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

  it("should accept 'jerry' with password 'letmeout'", function(done) {
    users.authenticate('jerry', 'letmeout')
      .catch(function(error) {
        fail(error);
      })
        .finally(function() {
          done();
        });
  });

});

