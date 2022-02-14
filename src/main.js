const EventEmitter = require('events');

// Singleton reference
var virtualKeyboard;

class VirtualKeyboard extends EventEmitter {
  constructor() {
    super();

    if (virtualKeyboard)
      throw new Error('Error: Attempting to create another virtual keyboard. The VirtualKeyboard class is a singleton class, and only one should be created inside your main process. One VirtualKeyboard can handle many BrowserWindows or BrowserViews.');

    this.keyBuffer = [];
    this.keyPressWait = 30;
  }

  config(_, propName, value) {
    if (propName === 'keyPressWait') {
      if (arguments.length === 2)
        return this.keyPressWait;

      this.keyPressWait = parseInt(value, 10);
    }
  }

  receiveKeyPress(event, value) {
    const webContent = event.sender;

    // continues adding keys to the key buffer without stopping a flush
    var chars = ('' + value).split('');
    for (var i = 0, il = chars.length; i < il; i++) {
      this.keyBuffer.push({ webContent, keyCode: chars[i] });
    }

    // don't call flushBuffer if already flushing
    if (!this.flushing) {
      this.flushBuffer();
    }
  }

  flushBuffer() {
    var result = this.keyBuffer.shift();
    if (result === undefined) {
      this.flushing = false;
      this.emit('buffer-empty');
      return;
    }

    var { webContent, keyCode } = result;

    this.flushing = true;

    // keydown
    webContent.sendInputEvent({
      type: 'keyDown',
      keyCode
    });

    // keypres
    webContent.sendInputEvent({
      type: 'char',
      keyCode,
    });

    // keyup
    webContent.sendInputEvent({
      type: 'keyUp',
      keyCode,
    })

    setTimeout(this.flushBuffer.bind(this), this.keyPressWait);
  }
}

function setupVirtualKeyboard(ipcMain) {
  if (virtualKeyboard)
    return virtualKeyboard;

  virtualKeyboard = new VirtualKeyboard();

  ipcMain.handle(`secure-virtual-keyboard:keypress`, virtualKeyboard.receiveKeyPress.bind(virtualKeyboard));
  ipcMain.handle(`secure-virtual-keyboard:config`, virtualKeyboard.config.bind(virtualKeyboard));

  return virtualKeyboard;
}

function setupSecureBridge(contextBridge, ipcRenderer) {
  contextBridge.exposeInMainWorld('secureVirtualKeyboardIPC', {
    sendKeyPress: (key) => ipcRenderer.invoke(`secure-virtual-keyboard:keypress`, key),
    getConfigProp: (propName) => ipcRenderer.invoke(`secure-virtual-keyboard:config`, propName),
    setConfigProp: (propName, value) => ipcRenderer.invoke(`secure-virtual-keyboard:config`, propName, value),
  });
};

module.exports = {
  VirtualKeyboard,
  setupVirtualKeyboard,
  setupSecureBridge,
};
