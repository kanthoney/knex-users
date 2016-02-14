
var users = require('./users')();
var Promise = require('bluebird');
var user_list = require('./user_list');

describe("record listing", function() {

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

  it("should return three records", function(done) {
    users.list(0,3)
      .then(function(records) {
        expect(records.length).toEqual(3);
      })
      .catch(function(error) {
        fail(error);
      })
        .finally(function() {
          done();
        });
  });

  it("should return all records ordered ascending by id", function(done) {
    users.list(null, null, {name:'id', dir:'asc'})
      .then(function(records) {
        expect(records.length).toEqual(user_list.length);
        expect(records[0].id).toEqual('admin');
        expect(records[records.length-1].id).toEqual('zebedee');
      })
      .catch(function(error) {
        fail(error);
      })
        .finally(function() {
          done();
        });
  });

  it("should return records 'sam', 'nosher', 'jerry' in that order", function(done) {
    users.list(2, 3, {name: 'id', dir: 'desc'})
      .then(function(records) {
        expect(records.length).toEqual(3);
        expect(records[0].id).toEqual('sam');
        expect(records[1].id).toEqual('nosher');
        expect(records[2].id).toEqual('jerry');
      })
      .catch(function(error) {
        fail(error);
      })
        .finally(function() {
          done();
        });
  });

  it("should return records 'bones', 'admin', 'alexa' in that order", function(done) {
    users.lock('bones')
    .then(function() {
      return users.list(null, 3, [{name: 'locked', dir: 'desc'},
                                  {name: 'id'}])
    })
      .then(function(records) {
        expect(records.length).toEqual(3);
        expect(records[0].id).toEqual('bones');
        expect(records[1].id).toEqual('admin');
        expect(records[2].id).toEqual('alexa');
      })
      .catch(function(error) {
        fail(error);
      })
        .finally(function() {
          done();
        });
  });
     
});

