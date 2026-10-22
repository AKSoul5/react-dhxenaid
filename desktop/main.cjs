const { app, BrowserWindow, Menu, dialog, shell } = require("electron");
const path = require("node:path");
const { autoUpdater } = require("electron-updater");

let mainWindow;
let manualUpdateCheck = false;
let updateDialogOpen = false;

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = false;
autoUpdater.allowPrerelease = false;

function showUpdateMessage(options) {
  if (updateDialogOpen || !mainWindow || mainWindow.isDestroyed()) return;
  updateDialogOpen = true;
  dialog.showMessageBox(mainWindow, options).finally(() => {
    updateDialogOpen = false;
  });
}

function checkForUpdates(manual = false) {
  if (!app.isPackaged || process.platform !== "win32") {
    if (manual) {
      showUpdateMessage({
        type: "info",
        title: "Kalali updates",
        message: "Automatic updates are available in the installed Windows version.",
        buttons: ["OK"],
        defaultId: 0,
      });
    }
    return;
  }
  manualUpdateCheck = manual;
  autoUpdater.checkForUpdates().catch((error) => {
    console.error("Kalali update check failed:", error);
    if (manual) {
      showUpdateMessage({
        type: "warning",
        title: "Could not check for updates",
        message: "Kalali could not reach GitHub Releases. Check your internet connection and try again.",
        buttons: ["OK"],
        defaultId: 0,
      });
    }
    manualUpdateCheck = false;
  });
}

function buildMenu() {
  const template = [
    {
      label: "Kalali",
      submenu: [
        {
          label: "About Kalali",
          click: () => showUpdateMessage({
            type: "info",
            title: "About Kalali",
            message: "Kalali Procurement\nVersion " + app.getVersion() + "\n\nBilingual procurement prototype.",
            buttons: ["OK"],
            defaultId: 0,
          }),
        },
        { type: "separator" },
        { label: "Check for Updates…", click: () => checkForUpdates(true) },
        { type: "separator" },
        { role: "quit", label: "Exit Kalali" },
      ],
    },
    { role: "editMenu" },
    { role: "viewMenu" },
    {
      label: "Help",
      submenu: [
        {
          label: "Open project on GitHub",
          click: () => shell.openExternal("https://github.com/AKSoul5/react-dhxenaid"),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 640,
    show: false,
    title: "Kalali",
    backgroundColor: "#0b1220",
    autoHideMenuBar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://github.com/")) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("file://")) event.preventDefault();
  });

  const appEntry = app.isPackaged
    ? path.join(process.resourcesPath, "dist", "index.html")
    : path.join(__dirname, "..", "dist", "index.html");

  mainWindow.loadFile(appEntry);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

autoUpdater.on("update-available", (info) => {
  console.info("Kalali update available:", info.version);
  if (manualUpdateCheck) {
    showUpdateMessage({
      type: "info",
      title: "Update available",
      message: "Kalali " + info.version + " is available. It is downloading in the background.",
      buttons: ["OK"],
      defaultId: 0,
    });
  }
});

autoUpdater.on("update-not-available", (info) => {
  console.info("Kalali is up to date:", info.version);
  if (manualUpdateCheck) {
    showUpdateMessage({
      type: "info",
      title: "Kalali is up to date",
      message: "You are using Kalali " + app.getVersion() + "; no newer release was found.",
      buttons: ["OK"],
      defaultId: 0,
    });
  }
  manualUpdateCheck = false;
});

autoUpdater.on("download-progress", (progress) => {
  console.info("Kalali update download: " + Math.round(progress.percent) + "%");
});

autoUpdater.on("update-downloaded", (info) => {
  console.info("Kalali update downloaded:", info.version);
  manualUpdateCheck = false;
  showUpdateMessage({
    type: "info",
    title: "Kalali is ready to update",
    message: "Kalali " + info.version + " has been downloaded. Restart now to install the update, or choose Later to keep working.",
    buttons: ["Restart now", "Later"],
    defaultId: 0,
    cancelId: 1,
  }).then(({ response }) => {
    if (response === 0) autoUpdater.quitAndInstall();
  });
});

autoUpdater.on("error", (error) => {
  console.error("Kalali updater error:", error);
  if (manualUpdateCheck) {
    showUpdateMessage({
      type: "warning",
      title: "Kalali update failed",
      message: "Kalali could not complete the update check. You can keep using the installed version and try again later.",
      buttons: ["OK"],
      defaultId: 0,
    });
  }
  manualUpdateCheck = false;
});

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  if (app.isPackaged && process.platform === "win32") {
    setTimeout(() => checkForUpdates(false), 5000);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
