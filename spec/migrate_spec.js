
'use strict';

var users = require('./users')({table_name: 'users'});

describe('test migration', function() {

  // Clear any existing table
  beforeAll(function(done) {
    users.migrate_down()
      .then(function() {
        done();
      });
  });

  it('should create users database table', function(done) {

    users.migrate_up()
      .catch(function(error) {
        fail(error);
      })
        .finally(function() {
          done();
        });
  });

  it("should count zero users", function(done) {
    users.count()
      .then(function(n) {
        expect(n).toEqual(0);
      })
      .catch(function(error) {
        fail(error);
      })
        .finally(function() {
          done();
        });
  });

  it('should drop users database table', function(done) {

    users.migrate_down()
      .catch(function(error) {
        fail(error);
      })
        .finally(function() {
          done();
        });
  });

  it("should fail when querying table", function(done) {
    users.count()
      .then(function() {
        fail('Managed to read non-existent database table');
      })
      .catch(function(error) {
        return;
      })
        .finally(function() {
          done();
        });
  });

});

