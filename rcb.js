'use strict';

const R = require('ramda');
const I = require('immutable');
const μs = require('microseconds');

const Boss = I.Record({
  level: 1,
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
  paused: false,
  player: new Player,
  boss: new Boss,
  ctime: 0,
  ctimeStr: null
});

const RCB = function (config) {

  //console.log(config);

  const COMPUTE_DELAY = 60;

  const KEY_PRESS_EVENT = 'keyPress';

  const playerMoveStep = 2;
  const bossMoveStep = 5;

  const randomNumber = max => Math.round(Math.random() * (max || 1));

  const nameProperty = R.prop('name');
  const keyCodeProperty = R.prop('keyCode');

  const minusOne = R.always(-1);
  const plusOne = R.always(+1);

  const isEscapeKeyCode = R.equals(config.KEY_CODE_ESCAPE);
  const isSpaceKeyCode = R.equals(config.KEY_CODE_SPACE);
  const isLeftKeyCode = R.equals(config.KEY_CODE_LEFT);
  const isRightKeyCode = R.equals(config.KEY_CODE_RIGHT);
  const isMovingKeyCode = keyCode => R.or(isLeftKeyCode(keyCode), isRightKeyCode(keyCode));

  const isEvent = name => R.compose(R.equals(name), nameProperty);
  const isKeyPressEvent = isEvent(KEY_PRESS_EVENT);
  const keyPressFilter = R.filter(isKeyPressEvent);
  const keyPressKeyCodeMapper = R.map(keyCodeProperty);
  const movingKeyCodeFilter = R.filter(isMovingKeyCode);

  const moveStepDirectionSign = R.ifElse(isLeftKeyCode, plusOne, minusOne);

  const bossLevelFromFrame = frame => frame <= 500 ? 1 : (frame <= 2000 ? 2 : 3);

  const nextAngle = (angleDg, move, moveStep) => {
    const nextAngle = angleDg + moveStep * moveStepDirectionSign(move);
    return nextAngle < 0 ? nextAngle + 360 : (nextAngle > 359 ? nextAngle - 360 : nextAngle);
  };

  const updateXY = movable => {
    const rd = movable.angleDg * config.TO_RAD;
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
    if (randomNumber() < 0.5)
      return moves;
    const acc = (moves, i) => {
      if (!i) return moves;
      return acc(moves.concat(config.MOVING_KEY_CODES[randomNumber(config.MOVING_KEY_CODES.length)]), i - 1);
    };
    return acc([], randomNumber(3));
  };

  const compute = (events, state) => {

    const startedAt = μs.now();

    const keyPressEvents = keyPressFilter(events);
    const keyPressKeyCodes = keyPressKeyCodeMapper(keyPressEvents);

    const moves = movingKeyCodeFilter(keyPressKeyCodes);
    //const pausePushed = ((R.filter(isEscapeKeyCode, moveKeyCodes)).length % 2) > 0;

    const playerMoves = compactMoves(moves);
    const bossMoves = compactMoves(randomBossMoves());

    const player = (playerMoves.length ? moveEntity(state.player)(playerMoveStep)(playerMoves) : state.player)
      .set('moves', playerMoves);

    const boss = (bossMoves.length ? moveEntity(state.boss)(bossMoveStep)(bossMoves) : state.boss)
      .set('level', bossLevelFromFrame(state.frame))
      .set('moves', bossMoves);

    const ctime = μs.now() - startedAt;

    return state
      .set('frame', state.frame + 1)
      .set('player', player)
      .set('boss', boss)
      .set('ctime', ctime)
      .set('ctimeStr', String(μs.parse(ctime)));
  };

  return {
    COMPUTE_DELAY: COMPUTE_DELAY,
    KEY_PRESS_EVENT: KEY_PRESS_EVENT,
    initialState: () => new State,
    compute: compute
  };
};

module.exports = RCB;
