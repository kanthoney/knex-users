
var db = require('./db');
var users = require('../index')(db);
var tick = 1000;
var _ = require('lodash');
var Promise = require('bluebird');

user = {id:'alexa', password: '123456'}

describe("Freeze accounts test", function() {

  var setup = function(max_attempts)
  {
    return users.add(_.defaults({max_attempts: max_attempts, freeze_time: tick}, user));
  }

  var auth_check = function(password, message)
  {
    return users.authenticate('alexa', password)
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

  var test = function(max_attempts, cycles)
  {
    var p = Promise.coroutine(function*() {
      var wait = tick;
      for(var i = 0; i < cycles; i++) {
        for(var j = 0; j < max_attempts; j++) {
          yield Promise.delay(tick/2)
            .then(function() {
              return auth_check('fail', 'Password rejected');
            });
        }
        yield Promise.delay(wait - tick)
          .then(function() {
            return users.get('alexa');
          }).then(function(record) {
            expect(record.current_freeze_time).toEqual(wait);
            console.log("Account freeze cycle completed for max_attempts " + max_attempts + " - freeze time now " + record.current_freeze_time + " ms");
            wait *= 2;
            return auth_check('fail', 'Account frozen');
          })
          .then(function() {
            return auth_check('123456', 'Account frozen');
          })
          .delay(tick);
      }
      return Promise
        .delay(tick)
        .then(function() {
          return auth_check('fail', 'Password rejected');
        })
        .then(function() {
          return auth_check('123456');
        });
    });
    return setup(max_attempts)
      .then(function() {
        return auth_check('123456')
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

  var max_attempts = 2;
  var cycles = 2;

  it("should authenticate user, then fail max_attempts with 'Password rejected', then freeze account for appropriate time, finally unlock account ", function(done) {
    test(max_attempts, cycles)
      .finally(function() {
        done();
      });
  }, tick * (max_attempts * Math.pow(2, cycles) + 5));

});

