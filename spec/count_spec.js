
var users = require('./users')();
var Promise = require('bluebird');
var user_list = require('./user_list');

describe("record counting", function() {

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

});

