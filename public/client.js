'use strict';

const RCB_Listener = () => {

  const isKey = key => event => event.key === key;

  const isLeftKey = isKey('ArrowLeft');
  const isRightKey = isKey('ArrowRight');

  const property = prop => o => o[prop];
  const keyProperty = property('key');

  const isValidKey = event => isLeftKey(event) || isRightKey(event);

  const keyEventStream = eventType => $(window).asEventStream(eventType).filter(isValidKey);
  const keyDownStream = keyEventStream('keydown');
  const keyUpStream = keyEventStream('keyup');

  const keyStream = keyDownStream.merge(keyUpStream).map(keyProperty);

  keyStream.log();
};

window.addEventListener('load', RCB_Listener);
