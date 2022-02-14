const EventEmitter = require('events')

var virtualKeyboardID = 1;

class VirtualKeyboard extends EventEmitter {
  constructor(ipcMain, webContent) {
    super();

    this.webContent = webContent;
    this.keyBuffer = [];
    this.keyPressWait = 30;
    this.ipcMain = ipcMain;
    this.id = virtualKeyboardID++;

    this.init();
  }

  init() {
    // renderer to main process message api handlers
    this.ipcMain.handle(`secure-virtual-keyboard${this.id}:keypress`, this.receiveKeyPress.bind(this));
    this.ipcMain.handle(`secure-virtual-keyboard${this.id}:config`, this.config.bind(this));

    // redirect select events back to renderer process
    this.on('buffer-empty', () => {
      this.webContent.send('keyboard-buffer-empty');
    });
  }

  config(_, propName, value) {
    if (propName === 'keyPressWait') {
      if (arguments.length === 2)
        return this.keyPressWait;

      this.keyPressWait = parseInt(value, 10);
    }
  }

  receiveKeyPress(_, value) {
    // continues adding keys to the key buffer without stopping a flush
    var chars = ('' + value).split('');
    for (var i = 0, il = chars.length; i < il; i++) {
      this.keyBuffer.push(chars[i]);
    }

    // don't call flushBuffer if already flushing
    if (!this.flushing) {
      this.flushBuffer();
    }
  }

  flushBuffer() {
    var keyCode = this.keyBuffer.shift();
    if (keyCode === undefined) {
      this.flushing = false;
      this.emit('buffer-empty');
      return;
    }

    this.flushing = true;

    // keydown
    this.webContent.sendInputEvent({
      type: 'keyDown',
      keyCode
    });

    // keypres
    this.webContent.sendInputEvent({
      type: 'char',
      keyCode,
    });

    // keyup
    this.webContent.sendInputEvent({
      type: 'keyUp',
      keyCode,
    })

    setTimeout(this.flushBuffer.bind(this), this.keyPressWait);
  }
}

function setupSecureBridge(contextBridge, ipcRenderer, _keyboardID) {
  var keyboardID = _keyboardID;

  if (!keyboardID)
    keyboardID = virtualKeyboardID;

  contextBridge.exposeInMainWorld('secureVirtualKeyboardIPC', {
    sendKeyPress: (key) => ipcRenderer.invoke(`secure-virtual-keyboard${keyboardID}:keypress`, key),
    getConfigProp: (propName) => ipcRenderer.invoke(`secure-virtual-keyboard${keyboardID}:config`, propName),
    setConfigProp: (propName, value) => ipcRenderer.invoke(`secure-virtual-keyboard${keyboardID}:config`, propName, value),
  });
};

module.exports = {
  VirtualKeyboard,
  setupSecureBridge,
};
