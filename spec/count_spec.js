
var users = require('./users')();
var Promise = require('bluebird');
var user_list = require('./user_list');
var helpers = require('./helpers')(users);

describe("record counting", function() {

  beforeAll(function(done) {
    helpers.reset()
      .then(function() {
        return helpers.populate(user_list);
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

