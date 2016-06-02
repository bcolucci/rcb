'use strict';

const RCBClient = (socket, anchor) => {

  const CANVAS_SIZE = $(document).innerHeight();

  const MOVING_CIRCLE_BORDER_SIZE = 4;
  const MOVING_CIRCLE_BORDER_COLOR = '#888';
  const MOVING_CIRCLE_RADIUS = Math.floor(CANVAS_SIZE / 2 - MOVING_CIRCLE_BORDER_SIZE * 2);

  const PLAYER_CIRCLE_BORDER_SIZE = 4;
  const PLAYER_CIRCLE_BORDER_COLOR = '#EEE';
  const PLAYER_CIRCLE_RADIUS = 20;

  const DEBUG_VECTOR_HEAD_LENGTH = 20;

  const KEY_CODES = [ 37/*left*/, 39/*right*/ ];

  const createImage = src => {
    var img = new Image();
    img.src = 'public/images/' + src;
    return img;
  };

  const robotImage = createImage('robot.png');

  const getCanvas = anchor => {
    const anchorNode = document.querySelector(anchor);
    const existing = anchorNode.querySelector('canvas');
    if (existing)
      return canvasContext(existing);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = CANVAS_SIZE;
    anchorNode.appendChild(canvas);
    return getCanvas(anchor);
  };

  const canvasContext = canvas => {
    const ctx = canvas.getContext('2d');
    ctx.width = ctx.height = canvas.width;
    ctx.center = Math.floor(ctx.width / 2);
    return ctx;
  };

  const clearCanvas = canvas => canvas.clearRect(0, 0, canvas.width, canvas.width);

  const drawDebugVector = (canvas, fromx, fromy, tox, toy, opts) => {
    opts = opts || {};
    opts.headlen = opts.headlen || DEBUG_VECTOR_HEAD_LENGTH;
    const angle = Math.atan2(toy - fromy, tox - fromx);
    const cosHead = sign => Math.cos(angle - Math.PI * sign / 6);
    const sinHead = sign => Math.sin(angle - Math.PI * sign / 6);
    canvas.beginPath();
    canvas.moveTo(fromx, fromy);
    canvas.lineTo(tox, toy);
    canvas.moveTo(tox, toy);
    canvas.lineTo(tox - opts.headlen * cosHead(-1), toy - opts.headlen * sinHead(-1));
    canvas.moveTo(tox, toy);
    canvas.lineTo(tox - opts.headlen * cosHead(+1), toy - opts.headlen * sinHead(+1));
    Object.keys(opts).forEach(opt => canvas[opt] = opts[opt]);
    canvas.stroke();
  };

  const drawMovingCircle = canvas => {
    canvas.beginPath();
    canvas.arc(canvas.center, canvas.center, MOVING_CIRCLE_RADIUS, 0, 2 * Math.PI, 0);
    canvas.lineWidth = MOVING_CIRCLE_BORDER_SIZE;
    canvas.strokeStyle = MOVING_CIRCLE_BORDER_COLOR;
    canvas.stroke();
  };

  const drawPlayer = (canvas, player) => {
    player.x = MOVING_CIRCLE_RADIUS * player.x + MOVING_CIRCLE_RADIUS + PLAYER_CIRCLE_RADIUS / 2 - PLAYER_CIRCLE_BORDER_SIZE / 2;
    player.y = MOVING_CIRCLE_RADIUS * player.y + MOVING_CIRCLE_RADIUS + PLAYER_CIRCLE_RADIUS / 2 - PLAYER_CIRCLE_BORDER_SIZE / 2;
    canvas.beginPath();
    canvas.arc(player.x, player.y, PLAYER_CIRCLE_RADIUS, 0, 2 * Math.PI, 0);
    canvas.drawImage(robotImage, player.x - PLAYER_CIRCLE_RADIUS, player.y - PLAYER_CIRCLE_RADIUS, PLAYER_CIRCLE_RADIUS*2, PLAYER_CIRCLE_RADIUS*2);
    canvas.lineWidth = PLAYER_CIRCLE_BORDER_SIZE;
    canvas.strokeStyle = PLAYER_CIRCLE_BORDER_COLOR;
    canvas.stroke();
  };

  const keyDownStream = $(window).asEventStream('keydown');
  const keyUpStream = $(window).asEventStream('keyup');

  const emitKeyPress = (type, stream) => stream.map(event => event.keyCode)
    .filter(keyCode => KEY_CODES.indexOf(keyCode) > -1)
    .onValue(keyCode => socket.emit(type, keyCode));

  emitKeyPress('keyDownPress', keyDownStream);
  emitKeyPress('keyUpPress', keyUpStream);


  const playerVectorOpts = {
    lineWidth: 2,
    strokeStyle: 'yellow'
  };

  const drawState = state => {
    const canvas = getCanvas(anchor);
    const player = state.player;
    clearCanvas(canvas);
    drawMovingCircle(canvas);
    drawPlayer(canvas, player);
    drawDebugVector(canvas, player.x, player.y, canvas.center, canvas.center, playerVectorOpts);
  };

  socket.on('compute', drawState);
};
