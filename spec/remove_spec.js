
var users = require('./users')();
var Promise = require('bluebird');
var user_list = require('./user_list');

describe("record removal", function() {

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

  it("should return the correct number of records", function(done) {
    users.list()
      .then(function(records) {
        expect(records.length).toEqual(user_list.length);
      })
      .catch(function(error) {
        fail(error);
      })
        .finally(function() {
          done();
        });
  });

  it("should remove user 'jerry'", function(done) {
    users.remove('jerry')
      .then(function() {
        return users.get('jerry');
      })
      .then(function(records) {
        fail('retrieved deleted user');
      })
      .catch(function(error) {
        expect(error).toEqual('Unknown user');
        return users.count()
          .then(function(number) {
            expect(number).toEqual(user_list.length-1);
          })
      })
        .finally(function() {
          done();
        });
  });

});

