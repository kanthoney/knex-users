
var users = require('./users')();
var Promise = require('bluebird');
var user_list = require('./user_list');
var helpers = require('./helpers')(users);

describe("record removal", function() {

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

  it("should fail to authenticate 'jerry' with 'Unknown user' message", function(done) {
    helpers.auth('jerry', 'letmeout', 'Unknown user')
      .finally(function() {
        done();
      });
  });

});

