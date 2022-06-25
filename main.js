// main.js

// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, dialog, session } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;

process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    darkTheme: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      webSecurity: false,
      webviewTag: true,
    },
    show: false,
  });

  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: Object.fromEntries(
          Object.entries(details.responseHeaders).filter(
            (header) =>
              !/x-frame-options/i.test(header[0]) &&
              !/content-security-policy/i.test(header[0])
          )
        ),
      });
    }
  );

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
    session.defaultSession.webRequest.onBeforeRequest(
      // { urls: ["*://*./*"] },
      function (details, callback) {
        var url = details.url;
        if (url.includes("adsbygoogle") || url.includes("googleads"))
          callback({ cancel: true });
        else callback({ cancel: false });
      }
    );
  });

  // and load the index.html of the app.
  mainWindow.loadURL("http://localhost:5500/index.html");

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  handleComs();

  createWindow();

  app.on("activate", () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
function handleComs() {
  ipcMain.on("show-msgbox", showMessageBox);
  ipcMain.handle("dir-create", createDirectory);
  ipcMain.handle("dir-root", rootDir);
  ipcMain.handle("file-read", readFile);
  ipcMain.handle("file-write", writeFile);
  ipcMain.handle("path-exists", pathExists);
  ipcMain.handle("path-delete", deletePath);
}

//#region
function showMessageBox(e, text = "", caption = "") {
  if (text.trim() && caption.trim()) {
    dialog.showMessageBoxSync(mainWindow, {
      message: text,
      title: caption,
    });
  }
}

function createDirectory(e, dirPath) {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath);
    } catch {
      return null;
    }
  }
  return dirPath;
}

function deletePath(e, somePath) {
  fs.rmSync(somePath, {
    recursive: true,
    force: true,
  });
}

function writeFile(e, filePath, contents) {
  fs.writeFileSync(filePath, contents);
}

async function pathExists(e, somePath) {
  return fs.existsSync(somePath);
}

async function readFile(e, filePath) {
  return fs.readFileSync(filePath, {
    encoding: "utf8",
  });
}

async function rootDir() {
  return __dirname;
}
//#endregion