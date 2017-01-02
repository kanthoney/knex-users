'use strict';

var _ = require('lodash')
, Promise = require('bluebird');

module.exports = function(db, config)
{

  var self = {};
  config = config || {};

  _.defaults(config, {table_name: 'users',
                      max_attempts: 0,
                      freeze_time: 0,
                      hash_password: _.identity,
                      check_password: _.eq});

  self.migrate_up = function()
  {
    return db.schema.createTableIfNotExists(config.table_name, function(table) {
      table.string('id').notNullable().primary();
      table.text('password');
      table.dateTime('created').notNullable();
      table.dateTime('password_changed').notNullable();
      table.boolean('locked').notNullable();
      table.boolean('lockable').notNullable();
      table.integer('max_attempts');
      table.integer('failed_logins');
      table.dateTime('frozen_at');
      table.integer('current_freeze_time');
      table.integer('freeze_time');
      table.text('data');
    });
  }

  self.migrate_down = function()
  {
    return db.schema.dropTableIfExists(config.table_name);
  }

  var table = function()
  {
    return db(config.table_name);
  }

  self.add = function(user)
  {
    var now = new Date().toISOString();
    var user_copy = _.pick(user, ['id',
                                  'password',
                                  'created',
                                  'password_changed',
                                  'locked',
                                  'lockable',
                                  'max_attempts',
                                  'failed_logins',
                                  'frozen_at',
                                  'current_freeze_time',
                                  'freeze_time',
                                  'data']);
    _.assign(user_copy, {password: config.hash_password(user_copy.password),
                         created: now,
                         password_changed: now,
                         current_freeze_time: 0,
                         failed_logins: 0,
                         frozen_at: null,
                         data: JSON.stringify({})});
    return table().insert(_.defaults(user_copy, {locked: false,
                                                 lockable: true,
                                                 max_attempts: config.max_attempts,
                                                 freeze_time: config.freeze_time}));
  }

  self.remove = function(id)
  {
    return table().where({id: id}).delete();
  }

  self.rename = function(id, new_id)
  {
    return self.get(id)
      .then(function() {
        return table().where({id: id}).update({id: new_id});
      });
  }

  var lockable = function(id)
  {
    return self.get(id)
      .then(function(record) {
        if(!record.lockable) {
          return Promise.reject('Account not lockable');
        }
      })
  }

  self.lock = function(id)
  {
    return lockable(id)
      .then(function() {
        return table().where({id: id}).update({locked: true});
      });
  }

  self.unlock = function(id)
  {
    return self.get(id)
      .then(function(record) {
        return table().where({id: id}).update({locked: false});
      })
      .then(function() {
        return reset_login_attempts(id);
      });
  }

  self.set_lockable = function(id)
  {
    return self.get(id)
      .then(function(record) {
        return table().where({id: id}).update({lockable: true});
      });
  }

  self.set_unlockable = function(id)
  {
    return self.get(id)
      .then(function(record) {
        return table().where({id: id}).update({lockable: false})
          .then(function() {
            return self.unlock(id);
          });
      });
  }

  self.get = function(id)
  {
    return table().where({id: id}).select()
      .then(function(rows) {
        if(rows.length == 0) {
          return Promise.reject('Unknown user');
        }
        delete rows[0].password;
        rows[0].created = new Date(Date.parse(rows[0].created));
        rows[0].password_changed = new Date(Date.parse(rows[0].password_changed));
        if(rows[0].frozen_at) {
          rows[0].frozen_at = new Date(Date.parse(rows[0].frozen_at));
        }
        rows[0].data = JSON.parse(rows[0].data);
        return rows[0];
      });
  }

  var freeze_account = function(id)
  {
    return self.get(id)
      .then(function(record) {
        var current_freeze_time = 2*record.current_freeze_time;
        if(current_freeze_time == 0) {
          current_freeze_time = record.freeze_time;
        }
        return table().where({id: id}).update({current_freeze_time: current_freeze_time,
                                               frozen_at: new Date().toISOString(),
                                               failed_logins:0});
      });
  }

  var increment_login_attempts = function(id)
  {
    return self.get(id)
      .then(function(record) {
        return table().where({id: record.id}).increment('failed_logins', 1)
          .then(function() {
            return self.get(id);
          })
          .then(function(record) {
            // Do not freeze account if user not lockable or max_attempts <= 0
            if(record.max_attempts > 0 && record.lockable && record.failed_logins >= record.max_attempts) {
              return freeze_account(record.id);
            }
            return;
          });
      });
  }

  var reset_login_attempts = function(id)
  {
    return self.get(id)
      .then(function(user) {
        return table().where({id: user.id}).update({failed_logins: 0, current_freeze_time: 0, frozen_at: null});
      });
  }

  self.set_password = function(id, password)
  {
    return table().where({id: id}).update({password: config.hash_password(password), password_changed: new Date().toISOString()});
  }

  self.data_set = function(id, path, value)
  {
    return self.get(id)
      .then(function(record) {
        _.set(record.data, path, value);
        return table().where({id: id}).update({data:JSON.stringify(record.data)});
      });
  }

  self.data_get = function(id, path)
  {
    return self.get(id)
      .then(function(record) {
        return _.get(record.data, path);
      });
  }

  self.data_unset = function(id, path)
  {
    return self.get(id)
      .then(function(record) {
        _.unset(record.data, path);
        return table().where({id: id}).update({data:JSON.stringify(record.data)});
      });
  }

  self.authenticate = function(id, password, compare)
  {
    return table().where({id: id})
      .then(function(rows) {
        if(rows.length == 0) {
          return Promise.reject('Unknown user');
        }
        var user = rows[0];
        if(user.locked) {
          return Promise.reject('Account locked');
        }
        if(user.frozen_at && user.current_freeze_time) {
          var frozen_at = new Date(Date.parse(user.frozen_at));
          if(new Date() < new Date(frozen_at.getTime() + user.current_freeze_time)) {
            return Promise.reject('Account frozen');
          }
        }
        if(compare) {
          if(!compare(password, user.password)) {
            return Promise.reject('Password rejected');
          }
        } else if(!config.check_password(password, user.password)) {
          return Promise.reject('Password rejected');
        }
      })
      .catch(function(error) {
        if(error == 'Password rejected') {
          return increment_login_attempts(id)
            .finally(function() {
              return Promise.reject(error);
            });
        }
        return Promise.reject(error);
      })
      .then(function() {
        return reset_login_attempts(id).
          catch(function(error) {
            console.warn('Failed to reset login attempts for user ' + id);
            return;
          });
      })
  }

  self.count = function()
  {
    return table().count('* as n')
      .then(function(value) {
        // PostgreSQL returns a string
        if(_.isString(value[0].n)) {
          return parseInt(value[0].n);
        }
        return value[0].n;
      });
  }

  self.list = function(start, limit, orderBy)
  {
    if(start == undefined) {
      start = 0;
    }
    if(orderBy == undefined) {
      orderBy = 'created';
    }
    var q = table().offset(start);
    if(limit != undefined) {
      q = q.limit(limit);
    }
    if(_.isString(orderBy)) {
      q.orderBy(orderBy);
    } else if(_.isArray(orderBy)) {
      _.forEach(orderBy, function(field) {
        q.orderBy(field.name, field.dir);
      });
    } else if(orderBy.name) {
      q.orderBy(orderBy.name, orderBy.dir);
    }
    return q.select()
      .then(function(rows) {
        return _.chain(rows).forEach(function(row) {
          delete row.password;
          row.password_changed = new Date(Date.parse(row.password_changed));
          row.created = new Date(Date.parse(row.created));
          if(row.frozen_at) {
            row.frozen_at = new Date(Date.parse(row.frozen_at));
          }
          row.data = JSON.parse(row.data);
        }).value();
      });
  }

  return self;

}

