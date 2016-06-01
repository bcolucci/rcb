'use strict';

const config = require('config');

const express = require('express');
const app = express();

const http = require('http').Server(app);

app.use('/components', express.static(__dirname + '/bower_components'));
app.use('/public', express.static(__dirname + '/public'));
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

require('./router')(http);

http.listen(config.port, () => console.log('Listening on *:' + config.port));
