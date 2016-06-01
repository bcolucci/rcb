'use strict';

const sprintf = require('sprintf');
const randomString = require('random-string');

const COMPUTE_DELAY_MS = 50;

const RCB = require('./rcb');

let game // the game instance
  , state // the current state
  , events // events pool
  , intervalCtx; // setInterval ctx

const stopComputing = () => intervalCtx && clearInterval(intervalCtx);

const clearEvents = () => events = [];

const newGame = socket => {
  stopComputing();
  clearEvents();
  game = new RCB;
  state = game.initialState;
  intervalCtx = setInterval(() => compute(socket), COMPUTE_DELAY_MS);
};

const compute = socket => {
  if (!game || !socket)
    return;
  state = game.compute(events, state);
  socket.broadcast.emit('compute', state);
  clearEvents();
};

const connectionHandler = socket => {
  newGame(socket);
  socket.id = randomString() + '-' + sprintf('%04d', Math.floor(Math.random() * 1000));
  socket.on('disconnect', disconnectHandler(socket));
  socket.on('keyPress', keyPressHandler(socket));
};

const disconnectHandler = socket => () => stopComputing();

const keyPressHandler = socket => keyCode => events.push({ name: 'keyPress', keyCode: keyCode });

module.exports = http => {
  const io = require('socket.io')(http);
  io.on('connection', connectionHandler);
};
