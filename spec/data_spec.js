
var users = require('./users')();
var Promise = require('bluebird');

describe("data setting and getting", function() {

  var user_list = [ {id: 'alexa', password: '123456', data: {name: { first: 'alexa' }}},
                    {id: 'admin', password: 'letmein', data: {name: { first: 'admin' }}},
                    {id: 'jerry', password: 'letmeout', data: {name: { first: 'jerry' }}} ];

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

  it("should count correct number of users", function(done) {
    users.count()
      .then(function(n) {
        expect(n).toEqual(user_list.length);
      })
      .catch(function(error) {
        fail(error);
      })
        .finally(function() {
          done();
        });
  });

  it("should retreive empty map for each user", function(done) {
    Promise.map(user_list,
                function(user) {
                  return users.get(user.id)
                    .then(function(record) {
                      expect(record.data).toEqual({});
                    })
                    .catch(function(error) {
                      fail(error);
                    });
                })
      .finally(function() {
        done();
      });
  });

  it("should set name property of data for each user", function(done) {
    Promise.map(user_list,
                function(user) {
                  return users.data_set(user.id, 'name', user.data.name)
                    .then(function() {
                      return users.data_get(user.id, 'name.first');
                    })
                    .then(function(name) {
                      expect(name).toEqual(user.data.name.first);
                    })
                    .catch(function(error) {
                      fail(error);
                    })
                      })
      .finally(function() {
        done();
      });
  });
    
  it("should delete name property for each user", function(done) {
    Promise.map(user_list,
                function(user) {
                  return users.data_unset(user.id, 'name')
                    .then(function() {
                      return users.data_get(user.id, 'name');
                    })
                    .then(function(name) {
                      expect(name).toBeUndefined();
                    })
                    .catch(function(error) {
                      fail(error);
                    })
                      })
      .finally(function() {
        done();
      });
  });

});

