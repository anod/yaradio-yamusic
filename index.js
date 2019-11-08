const path = require('path');
const fs = require('mz/fs');
const {
  app,
  BrowserWindow,
  session
} = require('electron');
const store = require('./src/store/store');
const contextMenu = require('./src/menu/contextMenu');
const dockMenu = require('./src/menu/dockMenu');
const globalShortcut = require('./src/menu/globalShortcut');
const nextSongNotification = require('./src/notification/nextSong');

if (process.env.node_env == 'dev')
  require('electron-debug')({
    enabled: true,
    showDevTools: 'undocked'
  });

let win;
let appRunning = app.requestSingleInstanceLock();

if (!appRunning) {
  app.quit();
}

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) {
      win.restore();
    }
    win.focus();
  }
})

function createWindow() {
  const lastWindowState = store.get('lastWindowState')
  const lastApp = store.get('lastApp');

  const win = new BrowserWindow({
    title: 'YaRadio',
    show: false,
    x: lastWindowState.x,
    y: lastWindowState.y,
    height: lastWindowState.height || 700,
    width: lastWindowState.width || 848,
    icon: path.join(__dirname, 'media/icon', 'yaradio.png'),
    titleBarStyle: 'customButtonsOnHover',
    movable: true,
    minHeight: 700,
    minWidth: 848,
    autoHideMenuBar: true,
    backgroundColor: '#fff',
    webPreferences: {
      preload: path.join(__dirname, 'src/runtime/js', 'browser.js'),
      nodeIntegration: false,
      plugins: true
    }
  })

  win.loadURL((() => {
    if (lastApp == 'YaMusic') {
      return 'https://music.yandex.ru/'
    }
    return 'https://radio.yandex.ru/'
  })());

  win.on('close', e => {
    if (!store.get('quit?')) {
      e.preventDefault();
    }

    switch (process.platform) {
      case 'win32':
        win.hide();
        break;
      case 'linux':
        win.hide();
        break;
      case 'darwin':
        app.hide();
        break;
      default:
    }
  });

  win.on('page-title-updated', e => {
    let history = e.sender.webContents.history;
    if (/radio/.test(history[history.length - 1])) {
      win.setTitle('YaRadio');
      if (process.platform !== 'darwin') {
        win.setIcon(path.join(__dirname, 'media/icon', 'yaradio_32x32.png'));
      }
    } else {
      win.setTitle('YaMusic');
      if (process.platform !== 'darwin') {
        win.setIcon(path.join(__dirname, 'media/icon', 'yamusic_32x32.png'));
      }
    }
    e.preventDefault();
  });

  return win
}

app.on("ready", () => {
  win = createWindow()
  contextMenu.create(win, app);
  dockMenu.create(win, app)
  globalShortcut.init(win, app);
  win.setMenu(null);
  let page = win.webContents;
  page.on('dom-ready', () => {
    page.insertCSS(fs.readFileSync(path.join(__dirname, '/src/runtime/css', 'styles.css'), 'utf8'));
    win.show();
  })

  let notify = nextSongNotification.init(win);

  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    // Skip advertising
    if (/awaps.yandex.net/.test(details.url) || /vh-bsvideo-converted/.test(details.url) || /get-video-an/.test(details.url)) {
      return {
        cancel: true
      }
    }
    // Notification for next song
    if (/start\?__t/.test(details.url)) {
      setTimeout(notify, 1000)
    }

    callback(details);
  })
})

app.on('before-quit', () => {
  store.set('quit', true);

  if (!win.isFullScreen()) {
    store.set('lastWindowState', win.getBounds());
  }

  store.set('lastApp', win.getTitle());
});
