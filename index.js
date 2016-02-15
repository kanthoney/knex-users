'use strict';

var _ = require('lodash')
, Promise = require('bluebird');

module.exports = function(db, config)
{

  var table_name = 'users';
  if(config && config.table_name) {
    table_name = config.table_name;
  }
  var max_attempts = 0;
  if(config && config.max_attempts) {
    max_attempts = config.max_attempts;
  }
  var freeze_time = 0;
  if(config && config.freeze_time) {
    freeze_time = config.freeze_time;
  }
  var hash_password;
  var check_password;
  if(config && config.hash_password) {
    hash_password = config.hash_password;
  } else {
    hash_password = function(password) {
      return password;
    }
  }
  if(config && config.check_password) {
    check_password = config.check_password;
  } else {
    check_password = function(supplied, stored) {
      return supplied == stored;
    }
  }

  var up = function()
  {
    return db.schema.createTableIfNotExists(table_name, function(table) {
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
      table.json('data');
    });
  }

  var down = function()
  {
    return db.schema.dropTableIfExists(table_name);
  }

  var table = function()
  {
    return db(table_name);
  }

  var add = function(user)
  {
    var now = new Date().toISOString();
    var new_user = _.pick(user, ['id',
                                 'password',
                                 'locked',
                                 'lockable',
                                 'max_attempts',
                                 'freeze_time']);
    return table().insert(_.defaults(_.assign(new_user,
                                              {created: now,
                                               password_changed: now,
                                               current_freeze_time: 0,
                                               data: JSON.stringify({})}),
                                     {locked: false,
                                      lockable: true,
                                      failed_logins: 0,
                                      frozen_at: null,
                                      max_attempts: max_attempts,
                                      freeze_time: freeze_time}));
  }

  var remove = function(id)
  {
    return table().where({id: id}).delete();
  }

  var rename = function(id, new_id)
  {
    return get(id)
      .then(function() {
        return table().where({id: id}).update({id: new_id});
      });
  }

  var lockable = function(id)
  {
    return get(id)
      .then(function(record) {
        if(!record.lockable) {
          return Promise.reject('Account not lockable');
        }
      })
  }

  var lock = function(id)
  {
    return lockable(id)
      .then(function() {
        return table().where({id: id}).update({locked: true});
      });
  }

  var unlock = function(id)
  {
    return get(id)
      .then(function(record) {
        return table().where({id: id}).update({locked: false});
      })
      .then(function() {
        return reset_login_attempts(id);
      });
  }

  var get = function(id)
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
    return get(id)
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
    return get(id)
      .then(function(record) {
        return table().where({id: record.id}).increment('failed_logins', 1)
          .then(function() {
            return get(id);
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
    return get(id)
      .then(function(user) {
        return table().where({id: id}).update({failed_logins: 0, current_freeze_time: 0, frozen_at: null});
      });
  }

  var set_password = function(id, password)
  {
    return table().where({id: id}).update({password:password, password_changed: new Date().toISOString()});
  }

  var data_set = function(id, path, value)
  {
    return get(id)
      .then(function(record) {
        _.set(record.data, path, value);
        return table().where({id: id}).update({data:JSON.stringify(record.data)});
      });
  }

  var data_get = function(id, path)
  {
    return get(id)
      .then(function(record) {
        return _.get(record.data, path);
      });
  }

  var data_unset = function(id, path)
  {
    return get(id)
      .then(function(record) {
        _.unset(record.data, path);
        return table().where({id: id}).update({data:JSON.stringify(record.data)});
      });
  }

  var authenticate = function(id, password, compare)
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
        } else if(!check_password(user.password, password)) {
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
          catch(function() {
            console.warn('Failed to reset login attempts for user ' + id);
            return;
          });
      })
  }

  var count = function()
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

  var list = function(start, limit, orderBy)
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

  return {
    migrate_up: up,
    migrate_down: down,
    add: add,
    get: get,
    remove: remove,
    rename: rename,
    lock: lock,
    unlock: unlock,
    set_password: set_password,
    data_set: data_set,
    data_get: data_get,
    data_unset: data_unset,
    authenticate: authenticate,
    count: count,
    list: list
  }

}

