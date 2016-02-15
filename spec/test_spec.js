
'use strict';

var tick = 1000;
var users = require('./users')({table_name: 'users', max_attempts: 2, freeze_time: tick});

describe('Eclectic set of tests test', function() {

  beforeAll(function(done) {
    users.migrate_down()
      .then(function() {
        return users.migrate_up();
      })
      .finally(function() {
        done();
      });
  });

  it("should count zero users", function(done) {
    users.count()
      .then(function(users) {
        expect(users).toEqual(0);
      })
      .finally(function() {
        done();
      });
  });

  it("should add a user 'alexa' with password '123456'", function(done) {
    users.add({id: 'alexa', password: '123456'})
      .then(function() {
        return users.get('alexa');
      })
      .then(function(record) {
        expect(record.id).toEqual('alexa');
        expect(record.password).toBeUndefined();
        expect(record.locked).toBeFalsy();
        expect(record.freeze_time).toEqual(tick);
        expect(record.current_freeze_time).toEqual(0);
        expect(record.failed_logins).toEqual(0);
        expect(record.max_attempts).toEqual(2);
        expect(record.data).toEqual({});
      })
      .then(function() {
        return users.authenticate('alexa', '123456');
      })
      .catch(function(error) {
        fail(error);
      })
        .finally(function() {
          done();
        });
  });

  it("should retrieve record for user 'alexa'", function(done) {
    users.get('alexa')
      .then(function(record) {
        expect(record.id).toEqual('alexa');
      })
      .finally(function() {
        done();
      });
  });

  it("should count one user", function(done) {
    users.count()
      .then(function(users) {
        expect(users).toEqual(1);
      })
      .finally(function() {
        done();
      });
  });

  it("should reject 'alexa' with password '654321' with 'Password rejected' error", function(done) {
    users.authenticate('alexa', '654321')
      .then(function() {
        fail('authenticated user with wrong password');
      })
      .catch(function(error) {
        expect(error).toEqual('Password rejected');
      })
        .finally(function() {
          done();
        });
  });

  it("should count 1 failed login attempt against 'alexa'", function(done) {
    users.get('alexa')
      .then(function(record) {
        expect(record.failed_logins).toEqual(1);
      })
      .finally(function() {
        done();
      });
  });

  it("should reject 'alex' with password '123456' with 'Unknown user' error", function(done) {
    users.authenticate('alex', '123456')
      .then(function() {
        fail('authenticated nonexistent user');
      })
      .catch(function(error) {
        expect(error).toEqual('Unknown user');
      })
        .finally(function() {
          done();
        });
  });

  it("should count 1 failed login attempt against 'alexa'", function(done) {
    users.get('alexa')
      .then(function(record) {
        expect(record.failed_logins).toEqual(1);
      })
      .finally(function() {
        done();
      });
  });

  it("should lock user 'alexa' and fail authentication with 'Account locked' error", function(done) {
    users.lock('alexa')
      .then(function() {
        return users.get('alexa');
      })
      .then(function(record) {
        expect(record.locked).toBeTruthy();
      })
      .then(function() {
        return users.authenticate('alexa', '123456')
          .then(function() {
            fail('authenticated locked user');
          })
          .catch(function(error) {
            expect(error).toEqual('Account locked');
          })
            .finally(function() {
              done();
            });
      });
  });

  it("should count 1 failed login attempt against 'alexa'", function(done) {
    users.get('alexa')
      .then(function(record) {
        expect(record.failed_logins).toEqual(1);
      })
      .finally(function() {
        done();
      });
  });

  it("should unlock 'alexa' and failed_logins should be zero", function(done) {
    users.unlock('alexa')
      .then(function() {
        return users.get('alexa');
      })
      .then(function(record) {
        expect(record.locked).toBeFalsy();
        expect(record.failed_logins).toEqual(0);
      })
      .finally(function() {
        done();
      });
  });

  it("should reject 'alexa' with password '654321' with 'Password rejected' error", function(done) {
    users.authenticate('alexa', '654321')
      .then(function() {
        fail('authenticated user with wrong password');
      })
      .catch(function(error) {
        expect(error).toEqual('Password rejected');
      })
        .finally(function() {
          done();
        });
  });

  it("should count 1 failed login attempt against 'alexa'", function(done) {
    users.get('alexa')
      .then(function(record) {
        expect(record.failed_logins).toEqual(1);
      })
      .finally(function() {
        done();
      });
  });

  it("should fail to add user 'alexa'", function(done) {
    users.add({id: 'alexa', password:'456789'})
      .then(function() {
        fail('Added duplicate user');
      })
      .catch(function(error) {
        return;
      })
        .finally(function() {
          done();
        });
  });

  it("should add user 'admin' with password 'letmein' and max_attempts = 0", function(done) {
    users.add({id: 'admin',
               password: 'letmein',
               max_attempts: 0})
      .then(function() {
        return users.get('admin');
      })
      .then(function(record) {
        expect(record.id).toEqual('admin');
        expect(record.created).not.toBeNull();
        expect(record.password_changed).not.toBeNull();
        expect(record.max_attempts).toEqual(0);
      })
      .finally(function() {
        done();
      });
  });

  it("should count 2 users", function(done) {
    users.count()
      .then(function(n) {
        expect(n).toEqual(2);
      })
      .finally(function() {
        done();
      });
  });

  it("should reject 'admin' using password '&%j$s;]]cj'", function(done) {
    users.authenticate('admin', '&%j$s;]]cj')
      .then(function() {
        fail('Authenticated user with wrong password');
      })
      .catch(function(error) {
        expect(error).toEqual('Password rejected');
        return users.get('admin');
      })
        .then(function(record) {
          expect(record.frozen_at).toBeNull();
          expect(record.max_attempts).toEqual(0);
          expect(record.failed_logins).toEqual(1);
        })
      .finally(function() {
        done();
      });
  });

  it("should reject 'admin' using password '5H(*@d!b+W'", function(done) {
    users.authenticate('admin', '5H(*@d!b+W')
      .then(function() {
        fail('Authenticated user with wrong password');
      })
      .catch(function(error) {
        expect(error).toEqual('Password rejected');
        return users.get('admin');
      })
        .then(function(record) {
          expect(record.frozen_at).toBeNull();
          expect(record.max_attempts).toEqual(0);
          expect(record.failed_logins).toEqual(2);
          expect(record.locked).toBeFalsy();
        })
      .finally(function() {
        done();
      });
  });

  it("should allow 'admin' with password 'letmein'", function(done) {
    users.authenticate('admin', 'letmein')
      .catch(function(error) {
        fail(error);
      })
        .finally(function() {
          done();
        });
  });

  it("should delete user 'alexa'", function(done) {
    users.remove('alexa')
      .then(function() {
        return users.get('alexa');
      })
      .then(function(record) {
        fail('Got record for deleted user');
      })
      .catch(function(error) {
        expect(error).toEqual('Unknown user');
      })
        .finally(function() {
          done();
        });
  });

  it("should reject 'alexa' with password '123456' with 'Unknown user' error", function(done) {
    users.authenticate('alexa', '123456')
      .then(function() {
        fail('Authenticated deleted user');
      })
      .catch(function(error) {
        expect(error).toEqual('Unknown user');
      })
        .finally(function() {
          done();
        });
  });

  it("should count one user", function(done) {
    users.count()
      .then(function(n) {
        expect(n).toEqual(1);
      })
      .catch(function(error) {
        fail(error);
      })
      .finally(function() {
        done();
      });
  });

  it("should change password for 'admin' to 'password' and then fail authentication with 'let me in'", function(done) {
    var password_changed;
    users.get('admin')
      .then(function(record) {
        password_changed = record.password_changed;
        return users.set_password('admin', 'password');
      })
      .then(function() {
        return users.authenticate('admin', 'letmein');
      })
      .then(function() {
        fail('Authenticated with incorrect password');
      })
      .catch(function(error) {
        expect(error).toEqual('Password rejected');
      })
        .finally(function() {
          done();
        });
  });

  it("should allow 'admin' with password 'password'", function(done) {
    users.authenticate('admin', 'password')
      .catch(function(error) {
        fail(error);
      })
        .finally(function() {
          done();
        });
  });

});

