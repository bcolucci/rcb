'use strict';

const R = require('ramda');
const I = require('immutable');

const KEY_PRESS_EVENT = 'keyPress';

const KEY_CODE_LEFT = 37;
const KEY_CODE_RIGHT = 39;
const MOVING_KEY_CODES = [ KEY_CODE_LEFT, KEY_CODE_RIGHT ];

const PLAYER_MOVE_STEP = 2;
const BOSS_MOVE_STEP = 5;

const degToRad = deg => deg * 2 * Math.PI / 360;
const randomNumber = max => Math.floor(Math.random() * (max || 1));

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

const Boss = I.Record({
  angleDg: 0,
  angleRd: 0,
  x: 1,
  y: 0,
  moves: null
});

const Player = I.Record({
  angleDg: 0,
  angleRd: 0,
  x: 1,
  y: 0,
  moves: null
});

const State = I.Record({
  frame: 1,
  player: new Player,
  boss: new Boss
});

const nextAngle = (angleDg, move, moveStep) => {
  const nextAngle = angleDg + moveStep * moveStepDirectionSign(move);
  return nextAngle < 0 ? nextAngle + 360 : (nextAngle > 359 ? nextAngle - 360 : nextAngle);
};

const updateXY = movable => {
  const rd = degToRad(movable.angleDg);
  return movable
    .set('angleRd', rd)
    .set('x', Math.cos(rd))
    .set('y', Math.sin(rd));
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

const moveEntity = entity => moveStep => moves => {
  const recurse = () => moveEntity(entity.set('angleDg', nextAngle(entity.angleDg, R.head(moves), moveStep)))(moveStep)(R.tail(moves));
  return R.ifElse(R.isEmpty, R.always(updateXY(entity)), recurse)(moves);
};

const randomBossMoves = () => {
  const moves = [];
  const nbMoves = randomNumber(3);
  const acc = (moves, i) => {
    if (!i) return moves;
    return acc(moves.concat(MOVING_KEY_CODES[randomNumber(MOVING_KEY_CODES.length)]), i - 1);
  };
  return acc([], nbMoves);
};

const RCB = function() {

  const initialState = new State;

  const compute = (events, state) => {
    const playerMoves = compactMoves(moveEventsFilter(events).map(keyCodeProperty));
    const bossMoves = compactMoves(randomBossMoves());
    const player = (playerMoves.length ? moveEntity(state.player)(PLAYER_MOVE_STEP)(playerMoves) : state.player)
      .set('moves', playerMoves);
    const boss = (bossMoves.length ? moveEntity(state.boss)(BOSS_MOVE_STEP)(bossMoves) : state.boss)
      .set('moves', bossMoves);
    return state
      .set('frame', state.frame + 1)
      .set('player', player)
      .set('boss', boss);
  };

  return {
    initialState: initialState,
    compute: compute
  };
};

module.exports = RCB;
