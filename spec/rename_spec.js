
var users = require('./users')();
var Promise = require('bluebird');
var user_list = require('./user_list');
var helpers = require('./helpers')(users);

describe("Account renaming", function() {

  beforeAll(function(done) {
    helpers.reset()
      .then(function() {
        return helpers.populate(user_list);
      })
      .then(function() {
        return users.data_set('jerry', 'marker', true);
      })
      .finally(function() {
        done();
      });
  });

  it("should rename 'jerry' to 'ben'", function(done) {
    users.rename('jerry', 'ben')
      .then(function() {
        return users.get('jerry');
      })
      .then(function(record) {
        fail('Retrieved renamed user under old id');
      })
      .catch(function(error) {
        expect(error).toEqual('Unknown user');
        return users.get('ben');
      })
        .then(function(record) {
          expect(record.data.marker).toBeTruthy();
        })
        .catch(function(error) {
          fail(error);
        })
          .finally(function() {
            done();
          });
  });
  
  it("should authenticate 'ben' using 'letmeout'", function(done) {
    helpers.auth('ben', 'letmeout')
      .finally(function() {
        done();
      });
  });

  it("should fail to rename 'ben' to 'alexa'", function(done) {
    users.rename('ben', 'alexa')
      .then(function() {
        fail('Moved account to one with existing ID');
      })
      .catch(function(error) {
        return;
      })
        .finally(function() {
          done();
        });
  });

  it("should retreive 'alexa'", function(done) {
    users.get('alexa')
      .then(function(record) {
        expect(record.id).toEqual('alexa');
        expect(record.data.marker).toBeUndefined();
      })
      .catch(function(error) {
        fail(error);
      })
        .finally(function() {
          done();
        });
  });

  it("should fail to rename 'statler' to 'waldorf'", function(done) {
    users.rename('statler', 'waldorf')
      .then(function() {
        fail('Renamed non-existant account');
      })
      .catch(function(error) {
        expect(error).toEqual('Unknown user');
      })
        .finally(function() {
          done();
        });
  });

});

