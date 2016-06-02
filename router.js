'use strict';

const sprintf = require('sprintf');
const randomString = require('random-string');

const COMPUTE_DELAY_MS = 30;

const RCB = require('./rcb');

let game // the game instance
  , state // the current state
  , events // events pool
  , intervalCtx; // setInterval ctx

const stopComputing = () => intervalCtx && clearInterval(intervalCtx);

const clearEvents = () => events = [];

const newGame = socket => config => {
  stopComputing();
  clearEvents();
  game = new RCB(config);
  state = game.initialState();
  intervalCtx = setInterval(() => compute(socket), COMPUTE_DELAY_MS);
};

const compute = socket => {
  if (!game || !socket) return;
  state = game.compute(events, state);
  socket.emit('compute', state);
};

const pushEvent = (name, keyCode) => {
  events = events.filter(val => val.name !== name || val.keyCode !== keyCode)
    .concat({ name: name, keyCode: keyCode, ts: new Date().getTime() });
};

const delEvent = (name, keyCode) => {
  events = events.filter(val => val.name !== name && val.keyCode !== keyCode);
};

const init = socket => config => {
  newGame(socket)(config);
  socket.on('disconnect', disconnectHandler(socket));
  socket.on('keydown', keyDownPressHandler)
  socket.on('keyup', keyUpPressHandler);
  socket.emit('initialized', socket.id);
};

const connectionHandler = socket => {
  socket.id = randomString() + '-' + sprintf('%04d', Math.floor(Math.random() * 1000));
  socket.on('init', init(socket));
};

const disconnectHandler = socket => stopComputing;

const keyDownPressHandler = keyCode => pushEvent('keyPress', keyCode);
const keyUpPressHandler = keyCode => delEvent('keyPress', keyCode);

module.exports = http => {
  const io = require('socket.io')(http);
  io.on('connection', connectionHandler);
};
