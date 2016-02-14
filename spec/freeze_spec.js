
var users = require('./users')();
var Promise = require('bluebird');
var user_list = require('./user_list');

describe("Account freezing", function() {


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

  it("should successfully authenticate all users", function(done) {
    return Promise.map(user_list,
                       function(user)
                       {
                         return users.authenticate(user.id, user.password)
                           .catch(function(error) {
                             fail(error);
                           });
                       })
      .finally(function() {
        done();
      });
  });

  it("should fail to authenticate all users with 'Password rejected' error", function(done) {
    return Promise.map(user_list,
                       function(user)
                       {
                         return users.authenticate(user.id, 'G5e>&s!t')
                           .then(function() {
                             fail('Authenticated user ' + user.id + ' with wrong password');
                           })
                           .catch(function(error) {
                             expect(error).toEqual('Password rejected');
                           })
                             .then(function() {
                               return users.get(user.id);
                             })
                           .then(function(records) {
                             expect(records.failed_logins).toEqual(1);
                           })
                       })
      .finally(function() {
        done();
      });
  });

  it("should successfully authenticate all users", function(done) {
    return Promise.map(user_list,
                       function(user)
                       {
                         return users.authenticate(user.id, user.password)
                           .catch(function(error) {
                             fail(error);
                           })
                             .then(function() {
                               return users.get(user.id);
                             })
                           .then(function(record) {
                             expect(record.failed_logins).toEqual(0);
                           })
                       })
      .finally(function() {
        done();
      });
  });

  it("should fail to authenticate all users with the appropriate errors", function(done) {
    var passwords = ['4Hn</$kW]', '@#t&d¬pQ', 'y:[f^kD~'];
    return Promise.map(passwords,
                       function(password)
                       {
                         return Promise
                           .delay(10,
                                  Promise
                                  .map(user_list,
                                       function(user)
                                       {
                                         return users.authenticate(user.id, password)
                                           .then(function() {
                                             fail('Authenticated user ' + user.id + ' with wrong password');
                                           })
                                           .catch(function(error) {
                                             return users.get(user.id)
                                               .then(function(record) {
                                                 if(record.max_attempts == 0
                                                    || !record.lockable
                                                    || record.failed_logins < record.max_attempts ) {
                                                   expect(error).toEqual('Password rejected');
                                                 } else if(record.locked) {
                                                   expect(error).toEqual('Account locked');
                                                 } else if(record.frozen_at) {
                                                   expect(error).toEqual('Account frozen');
                                                 }
                                               });
                                           })
                                             }))
                       })
      .finally(function() {
        done();
      });
  });

  it("should reject 'bones' with 'Account frozen' error", function(done) {
    var passwords = ['scotty', 't5Ku;(@'];
    Promise.map(passwords,
                function(password)
                {
                  return Promise
                    .delay(10,
                           users.authenticate('bones', password)
                           .then(function() {
                             fail('Authenticated user with frozen account');
                           })
                           .catch(function(error) {
                             expect(error).toEqual('Account frozen');
                           }))
                })
      .finally(function() {
        done();
      });
  });

  it("should authenticate 'sam' with password 'welly'", function(done) {
    users.authenticate('sam', 'welly')
      .catch(function(error) {
        fail(error);
      })
        .finally(function() {
          done();
        });
  });

  it("should reject 'sharky' with password 'llama' with error 'Account frozen'", function(done) {
    users.authenticate('sharky', 'llama')
      .then(function() {
        fail('authenticated frozen user');
      })
      .catch(function(error) {
        expect(error).toEqual('Account frozen');
      })
        .finally(function() {
          done();
        });
  });

  it("should reject 'nosher' twice with error 'Account locked'", function(done) {
    var passwords = ['fooood', 'fat-free'];
    users.lock('nosher')
    .then(function() {
      return Promise
        .delay(10,
               Promise.map(passwords,
                           function(password)
                           {
                             return users.authenticate('nosher', password)
                               .then(function() {
                                 fail('Account authenticated while locked');
                               })
                               .catch(function(error) {
                                 expect(error).toEqual('Account locked');
                               })
                                 }))
    })
      .finally(function() {
        done();
      });
  });

  it("should reject 'nosher' with password 'fat_free' with error 'Password rejected'", function(done) {
    users.unlock('nosher')
      .then(function() {
        return users.authenticate('nosher', 'fat_free');
      })
      .then(function() {
        fail('Authenticated user with wrong password');
      })
      .catch(function(error) {
        expect(error).toEqual('Password rejected');
      })
        .finally(function() {
          done();
        });
  });

  it("should authenticate 'nosher' with password 'fooood'", function(done) {
    users.authenticate('nosher', 'fooood')
      .catch(function(error) {
        fail(error);
      })
        .finally(function() {
          done();
        });
  });

  it("should authenticate 'sharky' with password 'llama' after waiting 200 ms", function(done) {
    setTimeout(function() {
      users.authenticate('sharky', 'llama')
        .catch(function(error) {
          fail(error);
        })
          .finally(function() {
            done();
          });
    }, 200);
  });

  it("should reject 'zebedee' twice with 'Password rejected' error", function(done) {
    var passwords = ['j&:[flu', 'g$7K!ds'];
    return Promise.map(passwords,
                       function(password)
                       {
                         return users.authenticate('zebedee', password)
                           .then(function() {
                             fail('Authenticated user with wrong password');
                           })
                           .catch(function(error) {
                             expect(error).toEqual('Password rejected');
                           })
                             })
      .finally(function() {
        done();
      });
  });

  it("should reject 'zebedee' with password 'ermintrude' after waiting 250ms with 'Account frozen' error", function(done) {
    setTimeout(function() {
      users.authenticate('zebedee', 'dougal')
        .then(function() {
          fail('Authenticated user when account was frozen');
        })
        .catch(function(error) {
          expect(error).toEqual('Account frozen');
        })
          .finally(function() {
            done();
          });
    }, 250);
  });

  it("should reject 'zebedee' with password 'dougal' after waiting 250ms with 'Account frozen' error", function(done) {
    users.authenticate('zebedee', 'dougal')
      .then(function() {
        fail('Authenticated user when account was frozen');
      })
      .catch(function(error) {
        expect(error).toEqual('Account frozen');
      })
        .finally(function() {
          done();
        });
  });

  it("should reject 'zebedee' with password 'ermintrude' after waiting 200 ms with 'Password rejected' error", function(done) {
    setTimeout(function() {
      users.authenticate('zebedee', 'ermintrude')
        .then(function() {
          fail('Authenticated user using the wrong password');
        })
        .catch(function(error) {
          expect(error).toEqual('Password rejected');
        })
          .finally(function() {
            done();
          });
    }, 200);
  });

  it("should accept 'zebedee' with password 'dougal'", function(done) {
    users.authenticate('zebedee', 'dougal')
      .catch(function(error) {
        fail(error);
      })
        .finally(function() {
          done();
        });
  });

});

