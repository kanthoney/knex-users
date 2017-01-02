'use strict';

var tick = 1000;

module.exports = [{id: 'alexa', password: '123456', new_password: 'abc123'},
                  {id: 'admin', password: 'letmein', new_password: 'letmeout', lockable: false },
                  {id: 'bones', password: 'scotty', new_password: 'spock', freeze_time: tick, max_attempts: 2},
                  {id: 'jerry', password: 'letmeout', new_password: 'letmein', lockable: false, freeze_time: tick, max_attempts: 2 },
                  {id: 'sam', password: 'welly', new_password: 'welly', freeze_time: tick, max_attempts: 4},
                  {id: 'sharky', password: 'llama', new_password: 'giraffe', freeze_time: tick, max_attempts: 2},
                  {id: 'nosher', password: 'fooood', new_password: 'driiink', freeze_time: tick, max_attempts: 2},
                  {id: 'zebedee', password: 'dougal', new_password: 'erminetrude', freeze_time: tick, max_attempts: 2}];
