const Path = require('path');

const {
  app,
  BrowserWindow,
  ipcMain,
} = require('electron');

const { VirtualKeyboard } = require('../index');

app.commandLine.appendSwitch('ignore-gpu-blacklist')

var mainWindow;
var virtualKeyboard;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    backgroundColor: '#000000',
    webPreferences: {
      preload: Path.join(__dirname, 'preload.js')
    },
  });

  mainWindow.loadFile(Path.join(__dirname, 'demo.html'));

  mainWindow.webContents.setFrameRate(30);

  mainWindow.show();
  mainWindow.maximize();
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null
  });

  virtualKeyboard = new VirtualKeyboard(ipcMain, mainWindow.webContents);
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow()
  }
});
