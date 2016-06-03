'use strict';

const sprintf = require('sprintf');
const randomString = require('random-string');

const RCB = require('./rcb');

const IO_Router = http => {

  const ctx = {
    game: null,
    state: null,
    events: null,
    interval: null
  };

  const newGame = socket => (config, initialState) => {
    ctx.game = new RCB(config);
    ctx.state = initialState || ctx.game.initialState();
    ctx.events = [];
    ctx.interval = setInterval(() => compute(socket), ctx.game.COMPUTE_DELAY);
  };

  const compute = socket => {
    ctx.state = ctx.game.compute(ctx.events, ctx.state);
    socket.emit('compute', ctx.state);
  };

  const pushKeyPress = keyCode => {
    const filter = val => val.name !== 'keyPress' || val.keyCode !== keyCode;
    ctx.events = ctx.events.filter(filter).concat({ name: 'keyPress', keyCode: keyCode });
  };

  const removeKeyPress = keyCode => {
    const filter = val => val.name !== 'keyPress' && val.keyCode !== keyCode;
    ctx.events = ctx.events.filter(filter);
  };

  const init = socket => config => {
    newGame(socket)(config);
    const stopComputing = () => clearInterval(ctx.interval);

    socket.on('disconnect', stopComputing);

    /*socket.on('updateConfig', config => {
      stopComputing();
      newGame(socket)(config, ctx.state);
    });*/

    socket.on('keysPress', events => {
      events.forEach(e => e[0] === 'keydown' ? pushKeyPress(e[1]) : removeKeyPress(e[1]));
    });

    socket.emit('initialized', {
      COMPUTE_DELAY: ctx.game.COMPUTE_DELAY,
      socketId: socket.id
    });
  };

  require('socket.io')(http).on('connection', socket => {
    socket.id = randomString() + '-' + sprintf('%04d', Math.floor(Math.random() * 1000));
    socket.on('init', init(socket));
  });

};

module.exports = IO_Router;
