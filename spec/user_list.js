'use strict';

var tick = 1000;

module.exports = [{id: 'alexa', password: '123456'},
                  {id: 'admin', password: 'letmein', lockable: false },
                  {id: 'bones', password: 'scotty', freeze_time: tick, max_attempts: 2},
                  {id: 'jerry', password: 'letmeout', lockable: false, freeze_time: tick, max_attempts: 2 },
                  {id: 'sam', password: 'welly', freeze_time: tick, max_attempts: 4},
                  {id: 'sharky', password: 'llama', freeze_time: tick, max_attempts: 2},
                  {id: 'nosher', password: 'fooood', freeze_time: tick, max_attempts: 2},
                  {id: 'zebedee', password: 'dougal', freeze_time: tick, max_attempts: 2}];
