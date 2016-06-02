'use strict';

const RCB = (() => {

  const TO_RAD = Math.PI/180;

  const createImage = src => {
    const image = new Image;
    image.src = src;
    return image;
  };

  const Config = function (args) {

    this.leftKeyCode = 37;
    this.rightKeyCode = 39;
    this.movingKeyCodes = [
      this.leftKeyCode,
      this.rightKeyCode
    ];

    args = args || {};

    this.anchor = args.anchor || document.body;
    this.canvasSize = args.canvasSize || window.innerHeight;

    this.robotImage = createImage(args.robotSrc || 'public/images/robot.png');
    this.bossImage = createImage(args.bossSrc || 'public/images/boss.png');

    this.movingCircleRadius = this.canvasSize/2 - this.robotImage.width;

    this.textMargin = args.textMargin || 20;

    this.server = {
      KEY_CODE_LEFT: this.leftKeyCode,
      KEY_CODE_RIGHT: this.rightKeyCode,
      MOVING_KEY_CODES: this.movingKeyCodes,
      TO_RAD: TO_RAD,
      robotImage: { width: this.robotImage.width, height: this.robotImage.height },
      bossImage: { width: this.bossImage.width, height: this.bossImage.height }
    };
  };

  const Client = function (config) {

    const getCanvas = anchor => {
      const anchorNode = typeof(anchor) === 'string' ? document.querySelector(anchor) : anchor;
      const existing = anchorNode.querySelector('canvas');
      if (existing)
        return canvasContext(existing);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = config.canvasSize;
      anchorNode.appendChild(canvas);
      return getCanvas(anchor);
    };

    const canvasContext = canvas => {
      const ctx = canvas.getContext('2d');
      ctx.width = ctx.height = canvas.width;
      ctx.center = ctx.width/2;
      return ctx;
    };

    const clearCanvas = canvas => canvas.clearRect(0, 0, canvas.width, canvas.width);

    const writeDebugInformations = (canvas, infos) => {
      let textIndex = 0;
      const write = str => canvas.fillText(str, 10, ++textIndex * config.textMargin);
      canvas.fillStyle = '#FFF';
      infos.forEach(write);
    };

    const drawDebugVector = (canvas, fromx, fromy, tox, toy, color) => {
      const headLength = 20;
      const angle = Math.atan2(toy - fromy, tox - fromx);
      const cosHead = sign => Math.cos(angle - Math.PI * sign/6);
      const sinHead = sign => Math.sin(angle - Math.PI * sign/6);
      canvas.beginPath();
      canvas.moveTo(fromx, fromy);
      canvas.lineTo(tox, toy);
      canvas.moveTo(tox, toy);
      canvas.lineTo(tox - headLength * cosHead(-1), toy - headLength * sinHead(-1));
      canvas.moveTo(tox, toy);
      canvas.lineTo(tox - headLength * cosHead(+1), toy - headLength * sinHead(+1));
      if (color) canvas.strokeStyle = color;
      canvas.stroke();
    };

    const drawMovingCircle = canvas => {
      canvas.beginPath();
      canvas.arc(canvas.center, canvas.center, config.movingCircleRadius, 0, 2 * Math.PI, 0);
      canvas.fillStyle = 'rgba(250, 250, 250, 0.1)';
      canvas.fill();
    };

    const setPlayerAbsolutePosition = player => {
      player.x = config.movingCircleRadius * (player.x + 1) + config.robotImage.width;
      player.y = config.movingCircleRadius * (player.y + 1) + config.robotImage.width;
    };

    const relRotation = (canvas, image, rad, refX, refY) => {
      const relX = x => (x || 0) - image.width/2;
      const relY = y => (y || 0) - image.height/2;
      canvas.save();
      canvas.translate(refX, refY);
      canvas.rotate(rad);
      canvas.drawImage(config.robotImage, relX(), relY());
      canvas.rotate(-rad);
      canvas.translate(relX(refX), relY(refY));
      canvas.restore();
    };

    const drawPlayer = (canvas, player) => {
      const imageX = x => (x || 0) - config.robotImage.width/2;
      const imageY = y => (y || 0) - config.robotImage.height/2;
      relRotation(canvas, config.robotImage, player.angleRd, player.x, player.y);
    };

    const drawBoss = (canvas, boss) => {
      const x = config.bossImage.width * (boss.x + 1) + config.bossImage.width;
      const y = config.bossImage.width * (boss.y + 1) + config.bossImage.width;
      canvas.beginPath();
      canvas.arc(x, y, 15, 0, 2 * Math.PI, 0);
      canvas.fillStyle = 'rgba(255, 0, 0, 0.7)';
      canvas.fill();
    };

    const emitKeyPress = (socket, source, eventName) => source.asEventStream(eventName)
      .map(event => event.keyCode)
      .filter(keyCode => config.movingKeyCodes.indexOf(keyCode) > -1)
      .onValue(keyCode => socket.emit(eventName, keyCode));

    const drawState = (socketId, state) => {
      const startedAt = performance.now();
      const canvas = getCanvas(config.anchor);
      const player = state.player;
      const boss = state.boss;
      setPlayerAbsolutePosition(player);
      clearCanvas(canvas);
      drawMovingCircle(canvas);
      drawPlayer(canvas, player);
      drawBoss(canvas, boss);
      drawDebugVector(canvas, player.x, player.y, canvas.center, canvas.center, 'yellow');
      writeDebugInformations(canvas, [
        `SKID ${socketId}`,
        `Frame ${state.frame}`,
        `Player ${player.angleDg}° (${player.x}, ${player.y}) --> ${player.moves.join(',')}`,
        `Boss ${boss.angleDg}° (${boss.x}, ${boss.y}) --> ${boss.moves.join(',')}`,
        `CFR ${Math.floor((performance.now() - startedAt) * 1000)}μs`
      ]);
    };

    return {
      start: (eventSource, socket) => {
        socket.emit('init', config.server);
        socket.on('initialized', id => {
          socket.id = id;
          emitKeyPress(socket, eventSource, 'keydown');
          emitKeyPress(socket, eventSource, 'keyup');
          socket.on('compute', state => drawState(socket.id, state));
        });
      }
    };

  };

  return { Config: Config, Client: Client }

})();
