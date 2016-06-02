'use strict';

const R = require('ramda');
const I = require('immutable');

const KEY_PRESS_EVENT = 'keyPress';

const KEY_CODE_LEFT = 37;
const KEY_CODE_RIGHT = 39;
const MOVING_KEY_CODES = [ KEY_CODE_LEFT, KEY_CODE_RIGHT ];
const PLAYER_MOVE_STEP = 2;

const degToRad = deg => deg * 2 * Math.PI / 360;

const nameProperty = R.prop('name');
const keyCodeProperty = R.prop('keyCode');

const minusOne = R.always(-1);
const plusOne = R.always(+1);

const isLeftKeyCode = R.equals(KEY_CODE_LEFT);

const isEvent = name => R.compose(R.equals(name), nameProperty);
const isKeyPressEvent = isEvent(KEY_PRESS_EVENT);

const isMoveKey = keyCode => R.contains(keyCode, MOVING_KEY_CODES);
const isMoveEvent = R.and(isKeyPressEvent, R.compose(isMoveKey, keyCodeProperty));
const moveEventsFilter = R.filter(isMoveEvent);
const moveStepDirectionSign = R.ifElse(isLeftKeyCode, plusOne, minusOne);

const Boss = I.Record({ angle: 0 });

const Player = I.Record({
  angle: 0,
  x: 1,
  y: 0
});

const State = I.Record({
  frame: 1,
  player: new Player,
  boss: new Boss,
  playerActions: new I.Set,
  bossActions: new I.Set
});

const nextAngle = (angle, move) => {
  const nextAngle = angle + PLAYER_MOVE_STEP * moveStepDirectionSign(move);
  return nextAngle < 0 ? nextAngle + 360 : (nextAngle > 359 ? nextAngle - 360 : nextAngle);
};

const updatePlayerXY = player => {
  const rad = degToRad(player.angle);
  return player.set('x', Math.cos(rad)).set('y', Math.sin(rad));
};

const compactMoves = moves => {
  if (!moves.length) return moves;
  const groups = R.groupWith(R.equals)(moves);
  if (groups.length < 2) return R.head(groups);
  const len0 = groups[0].length;
  const len1 = groups[1].length;
  if (len0 === len1) return [];
  const d = len0 - len1;
  if (d) groups[0] = groups[0].splice(0, len1);
  else groups[1] = groups[1].splice(0, len0);
  return groups[0].concat(groups[1]);
};

const movePlayer = player => moves => {
  const recurse = () => movePlayer(player.set('angle', nextAngle(player.angle, R.head(moves))))(R.tail(moves));
  return R.ifElse(R.isEmpty, R.always(updatePlayerXY(player)), recurse)(moves);
};

const RCB = function() {

  const initialState = new State;

  const compute = (events, state) => {
    const playerMoves = compactMoves(moveEventsFilter(events).map(keyCodeProperty));
    const player = playerMoves.length ? movePlayer(state.player)(playerMoves) : state.player;
    return state.set('player', player);
  };

  return {
    initialState: initialState,
    compute: compute
  };
};

module.exports = RCB;
