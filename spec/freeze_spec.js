
'use strict';

var db = require('./db');
var users = require('../index')(db);
var tick = 1000;
var _ = require('lodash');
var Promise = require('bluebird');
var helpers = require('./helpers')(users);

var user = {id:'alexa', password: '123456'}

describe("Freeze accounts test", function() {

  var setup = function(max_attempts, lockable)
  {
    return users.add(_.defaults({max_attempts: max_attempts, freeze_time: tick, lockable: lockable}, user));
  }

  var test = function(max_attempts, cycles, lockable, locked)
  {
    var p = Promise.coroutine(function*() {
      var attempts = max_attempts;
      if(attempts == 0) {
        attempts = 2;
      }
      var wait = tick;
      for(var i = 0; i < cycles; i++) {
        for(var j = 0; j < attempts; j++) {
          yield Promise.delay(tick/2)
            .then(function() {
              if(lockable && locked) {
                return helpers.auth('alexa', 'fail', 'Account locked');
              } else {
                return helpers.auth('alexa', 'fail', 'Password rejected');
              }
            });
        }
        yield Promise.delay(wait - tick)
          .then(function() {
            return users.get('alexa');
          }).then(function(record) {
            if(!lockable || (!locked && max_attempts == 0)) {
              expect(record.frozen_at).toBeNull();
              return helpers.auth('alexa', 'fail', 'Password rejected')
                .then(function() {
                  return helpers.auth('alexa', '123456');
                });
            } else if(locked) {
              return helpers.auth('alexa', 'fail', 'Account locked')
                .then(function() {
                  return helpers.auth('alexa', '123456', 'Account locked');
                });
            } else {
              expect(record.current_freeze_time).toEqual(wait);
              wait *= 2;
              return helpers.auth('alexa', 'fail', 'Account frozen')
                .then(function() {
                  return helpers.auth('alexa', '123456', 'Account frozen');
                })
            }
          })
          .delay(tick);
      }
      return Promise
        .delay(tick)
        .then(function() {
          if(lockable && locked) {
            return helpers.auth('alexa', 'fail', 'Account locked');
          } else {
            return helpers.auth('alexa', 'fail', 'Password rejected')
              .then(function() {
                if(max_attempts == 1) {
                  return Promise.delay(wait);
                }
              });
          }
        })
        .then(function() {
          if(lockable && locked) {
            return helpers.auth('alexa', '123456', 'Account locked');
          } else {
            return helpers.auth('alexa', '123456');
          }
        });
    });
    return setup(max_attempts, lockable)
      .then(function() {
        return helpers.auth('alexa', '123456')
      })
      .then(function() {
        if(locked) {
          return users.lock('alexa')
            .then(function() {
              if(!lockable) {
                fail("locked unlockable account");
              }
            })
            .catch(function(error) {
              if(lockable) {
                fail(error);
              }
            });
        }
      })
      .then(function() {
        return p();
      })
      .finally(function() {
        return users.remove('alexa');
      });
  }

  beforeAll(function(done) {
    users.migrate_down()
      .then(function() {
        return users.migrate_up();
      })
      .finally(function() {
        done();
      });
  });

  var max_attempts = 3;
  var cycles = 3;

  var make_spec = function(max_attempts, cycles, lockable, locked) {
    var description = "should test for " + i + " max attempts with " + cycles + " failed login cycles, for ";
    if(lockable) {
      description += "a lockable ";
    } else {
      description += "an unlockable ";
    }
    description += "user, ";
    if(locked) {
      description += "with ";
    } else {
      description += "without ";
    }
    description += "a lock attempt";
    return it(description, function(done) {
      test(max_attempts, cycles, lockable, locked)
        .finally(function() {
          done();
        });
    }, 2 * tick * (max_attempts * Math.pow(cycles, 2) + 5));
  }

  for(var i = 0; i <= max_attempts; i++) {
    for(var j = 1; j <= cycles; j++ ) {
      for(var lockable of [false, true]) {
        for(var locked of [false, true]) {
          var spec = make_spec(i, j, lockable, locked);
        }
      }
    }
  }

});

