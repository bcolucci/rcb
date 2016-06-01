'use strict';

const R = require('ramda');
const I = require('immutable');

const KEY_CODE_LEFT = 37;
const KEY_CODE_RIGHT = 39;
const MOVING_KEY_CODES = [ KEY_CODE_LEFT, KEY_CODE_RIGHT ];
const PLAYER_MOVE_STEP = 2;

const isEvent = name => event => event.name === name;
const isKeyPressEvent = isEvent('keyPress');

const isMoveKey = keyCode => MOVING_KEY_CODES.indexOf(keyCode) > -1;
const isMoveEvent = event => isKeyPressEvent(event) && isMoveKey(event.keyCode);
const moveStepDirectionSign = keyCode => keyCode === KEY_CODE_LEFT ? -1 : 1;

const Boss = I.Record({ angle: 0 });

const Player = I.Record({ angle: 0 });

const State = I.Record({
  frame: 1,
  player: new Player,
  boss: new Boss,
  playerActions: new I.Set,
  bossActions: new I.Set
});

const nextAngle = (angle, event) => {
  const direction = moveStepDirectionSign(event.keyCode);
  const nextAngle = angle + PLAYER_MOVE_STEP * direction;
  return nextAngle < 0 ? nextAngle + 360 : (nextAngle > 359 ? nextAngle - 360 : nextAngle);
};

const movePlayer = (player, events) => {
  if (!events.length)
    return player;
  return movePlayer(
    player.set('angle', nextAngle(player.angle, events[0])),
    events.slice(1)
  );
};

const RCB = function() {

  const initialState = new State;

  const compute = (events, state) => {
    const player = movePlayer(state.player, events.filter(isMoveEvent));
    return state.set('player', player);
  };

  return {
    initialState: initialState,
    compute: compute
  };
};

module.exports = RCB;
