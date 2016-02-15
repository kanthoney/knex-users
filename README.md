# knex-users

`knex-users` encapsulates a simple user management table using the [`knex`](http://knexjs.org) query builder. 

## Features

* Authentication.  The `authenticate` method returns a resolved promise if the user authenticates successfully and a rejected promise otherwise.
The password can be checked using a supplied function. The module itself doesn't do any hashing or salting of passwords.
The password field is a `text` field, so there should be enough storage if you want to use exotic authentication methods.

* Account locking.  Accounts can be administratively be locked and unlocked. Specific accounts can be marked as unlockable.

* Account freezing.  Accounts can be set to freeze for a length of time after a number of failed login attempts.  After the freeze expires,
another batch of failed login attempts will double the length of time the account is frozen.

* Custom data (such as real name, email address, security roles, favourite beer) can be stored with each account.

## Installation

```
npm install knex-users
```

## Usage

First create your knex instance:

```
var db = require('knex')({ client: 'sqlite3', connection:{ filename: 'test.sqlite' } });
```

Then create your users module:

```
var users_config = {
  table_name: 'users',
  max_attempts: 5,
  freeze_time: 60000
)
var users = require('knex-users')(db, users_config);
```

The config settings are:

  * `table_name`: the name of the table.  The default is `users`.

  * `max_attempts`: the default maximum number of failed login attempts before an account is frozen.  If this is zero or negative then any
number of attempts is allowed.  This defaults to zero.

  * `freeze_time`: the default length of time in milliseconds before a frozen account is unlocked.  This parameter defaults to zero.

Then create the database table, in a migration or otherwise:

```
module.exports.up = function()
{
  return users.migrate_up();
}

module.exports.down = function()
{
  return users.migrate_down();
}
```

Add your users.  The `add` method returns a promise.  If `freeze_time` or `max_attempts` are missing the defaults are used. `lockable` defaults
to `true` and `locked` defaults to `false`

```
var user_config = {
  id: 'admin',
  password: 'letmein',
  freeze_time: 100000,
  max_attempts: 10,
  lockable: false,
  locked: false
}
users.add(config);
```

Authenticate your users.  The `authenticate(id, password, [compare])` method returns a resolved promise if the user authenticated successfully,
or a rejected promise otherwise. The `compare(supplied, stored)` function can be used to check the supplied password against the stored password,
otherwise the authentication passes if the two are equal.

```
users.authenticate('admin', 'letmein')
.then(function() {
  console.log('Successfully logged in');
})
.catch(function(error) {
  console.error(error);
});
```

Lock/unlock a user account, returning a promise.

```
users.lock('jones');
users.unlock('jones');
```

Retrieve the account information.

```
users.get('smith')
then(function(record) {
  console.log(record);
})
```

The fields retrieved are:

  * `id`: the user id

  * `created`: the time the account was created

  * `password_changed`: the time of the last password change

  * `locked`: `true` if account is administratively locked

  * `lockable`: `true` if account can be locked

  * `max_attempts`: number of failed login attempts before account is frozen

  * `failed_logins`: number of failed login attempts since the last success

  * `frozen_at`: the time the account was frozen

  * `current_freeze_time`: the length of time in milliseconds the account will be frozen

  * `freeze_time`: the length of time in milliseconds that the account is frozen after the initial batch of failed attempts

  * `data`: Custom user data in JSON format.


Set a user's password.  This does not automatically unlock the account if it was locked.

```
users.set_password('trent', 'qwerty');
```

Change a user id:

```
users.rename('ben', 'jerry');
```

Remove a user:

```
users.remove('jenkins');
```

Count your users.

```
users.count()
.then(function(number) {
  console.log("You have " + number + " users");
});
```

List your users using `list([start], [limit], [orderBy])`.  The `orderBy` parameter can be a field name, an object of the form
`{name: field_name, dir: ['asc'|'desc']}`, or an array of such objects.

```
users.list(50, 25, [{name: 'failed_logins', dir: 'desc'}, {name: 'id'}])
.then(function(records) {
  console.log(records);
});
```

Set, get and unset custom user data.  These methods use the lodash get, set and unset so a full path can be supplied.

```
users.data_set('barnes', 'name', {first: 'Jenny', last: 'Barnes'})
.then(function() {
  return users.data_get('barnes', 'name.first');
})
.then(function(result) {
  console.log(result); // Jenny
});
users.data_unset('barnes', 'name.last');
```

