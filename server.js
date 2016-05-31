'use strict';

const config = require('config');
const bunyan = require('bunyan');
const sprintf = require('sprintf');
const randomString = require('random-string');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const log = bunyan.createLogger(config.logger);

const generateId = () => randomString() + '-' + sprintf('%04d', Math.floor(Math.random() * 1000));

app.use('/components', express.static(__dirname + '/bower_components'));
app.use('/public', express.static(__dirname + '/public'));

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

io.on('connection', socket => {
  socket.id = generateId();
  log.trace('Connection', socket.id);
  socket.on('disconnect', () => {
    log.trace('Disconnection', socket.id);
  });
});

http.listen(config.port, () => log.info('Listening on *:' + config.port));
