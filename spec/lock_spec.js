
var users = require('./users')();
var Promise = require('bluebird');
var helpers = require('./helpers')(users);

describe("Account locking", function() {

  beforeAll(function(done) {
    helpers.reset()
      .finally(function() {
        done();
      });
  });

  var set = function(lockable, locked)
  {
    return users.add({id: 'alexa', password: 'pass', lockable: lockable, locked: locked})
  }

  var reset = function()
  {
    return users.remove('alexa');
  }

  var lock_user = function(user)
  {
    return users.lock(user)
      .then(function() {
        return users.get(user)
          .then(function(record) {
            expect(record.locked).toBeTruthy();
          });
      })
      .catch(function(error) {
        return users.get(user)
          .then(function(record) {
            if(record.lockable) {
              fail(error);
            } else {
              expect(error).toEqual('Account not lockable');
            }
          });
      });
  }

  var unlock_user = function(user)
  {
    return users.unlock(user)
      .then(function() {
        return users.get(user)
          .then(function(record) {
            expect(record.locked).toBeFalsy();
          });
      });
  }

  var lockable_user = function(user)
  {
    return users.set_lockable(user, true)
      .then(function() {
        return users.get(user);
      })
      .then(function(record) {
        expect(record.lockable).toBeTruthy();
      });
  }

  var unlockable_user = function(user)
  {
    return users.set_lockable(user, false)
      .then(function() {
        return users.get(user);
      })
      .then(function(record) {
        expect(record.lockable).toBeFalsy();
      });
  }

  var test = function(init_lockable, locked, lockable, lock)
  {
    return set(init_lockable, locked)
      .then(function() {
        if(lockable) {
          return lockable_user('alexa');
        } else {
          return unlockable_user('alexa');
        }
      })
      .then(function() {
        if(lock) {
          return lock_user('alexa');
        } else {
          return unlock_user('alexa');
        }
      })
      .then(function() {
        if(lockable && lock) {
          return helpers.auth('alexa', 'pass', 'Account locked')
            .then(function() {
              return helpers.auth('alexa', 'fail', 'Account locked')
            });
        } else {
          return helpers.auth('alexa', 'pass')
            .then(function() {
              return helpers.auth('alexa', 'fail', 'Password rejected')
            });
        }
      })
      .finally(function() {
        return reset();
      });
  }

  var make_spec = function(init_lockable, locked, lockable, lock)
  {
    var description = "should test locking when account is ";
    if(init_lockable) {
      description += "initially lockable and ";
    } else {
      description += "not initially lockable and ";
    }
    if(lockable) {
      description += "locked";
    } else {
      description += "not locked";
    }
    description += ", then set to ";
    if(lockable) {
      description += "lockable";
    } else {
      description += "not lockable";
    }
    description += ", then ";
    if(locked) {
      description += "locked";
    } else {
      description += "unlocked";
    }
    return it(description, function(done) {
      test(init_lockable, locked, lockable, lock)
        .finally(function() {
          done();
        });
    });
  }

  for(var init_lockable of [false, true]) {
    for(var locked of [false, true]) {
      for(var lockable of [false, true]) {
        for(var lock of [false, true]) {
          make_spec(init_lockable, locked, lockable, lock);
        }
      }
    }
  }

});

