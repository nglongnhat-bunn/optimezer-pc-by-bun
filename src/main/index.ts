process.env.UV_THREADPOOL_SIZE = "32"

import { app, shell, BrowserWindow, ipcMain, Tray } from "electron"
import { join } from "path"
import log from "electron-log"
import { createTray } from "@main/tray"
import { setupPowerShellHandlers } from "@main/powershell"
import { setupSystemHandlers } from "@main/system"
import { setupTweaksHandlers } from "@main/tweakHandler"
import { setupDNSHandlers } from "@main/dnsHandler"
import { setupBackupHandlers } from "@main/backup"
import { setupDebloatHandlers } from "@main/debloat"
import { setupCleanerHandlers } from "@main/cleaner"
import { initAutoUpdater } from "@main/updates"
import { setMainWindow } from "@main/windowState"
import Store from "electron-store"
import { is, getResourcePath } from "@main/utils"
import { startDiscordRPC } from "@main/rpc"

console.log = log.log
console.error = log.error
console.warn = log.warn

log.initialize()

const store = new Store()

let trayInstance: Tray | null = null
if (store.get("showTray") === undefined) {
  store.set("showTray", false)
}

ipcMain.handle("tray:get", () => {
  return store.get("showTray")
})
ipcMain.handle("tray:set", (_event: Electron.IpcMainInvokeEvent, value: boolean) => {
  store.set("showTray", value)
  if (mainWindow) {
    if (value) {
      if (!trayInstance) {
        trayInstance = createTray(mainWindow)
      }
    } else {
      if (trayInstance) {
        trayInstance.destroy()
        trayInstance = null
      }
    }
  }
  return store.get("showTray")
})

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  console.log("[LongNhat]: createWindow called")
  console.log("[LongNhat]: __dirname =", __dirname)
  console.log("[LongNhat]: icon path =", getResourcePath("sparkle2.ico"))
  console.log("[LongNhat]: preload path =", join(__dirname, "../preload/index.js"))
  console.log("[LongNhat]: renderer path =", join(__dirname, "../renderer/index.html"))

  try {
    mainWindow = new BrowserWindow({
      width: 1380,
      backgroundColor: "#0c121f",
      height: 760,
      // minWidth: 1380,
      // minHeight: 760,
      minWidth: 790,
      center: true,
      frame: false,
      show: false,
      autoHideMenuBar: true,
      icon: getResourcePath("sparkle2.ico"),
      webPreferences: {
        preload: join(__dirname, "../preload/index.js"),
        devTools: app.isPackaged ? false : true,
        sandbox: false,
        spellcheck: false,
      },
    })
    console.log("[LongNhat]: BrowserWindow created")
    setMainWindow(mainWindow)
  } catch (err: any) {
    console.error("[LongNhat]: BrowserWindow creation failed:", err)
    throw err
  }

  mainWindow.webContents.setWindowOpenHandler((details: Electron.HandlerDetails) => {
    shell.openExternal(details.url)
    return { action: "deny" }
  })

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    console.log("[LongNhat]: Loading renderer from URL:", process.env["ELECTRON_RENDERER_URL"])
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"])
  } else {
    console.log("[LongNhat]: Loading renderer from file")
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"))
  }

  mainWindow.once("ready-to-show", () => {
    console.log("[LongNhat]: Window ready to show")
    mainWindow!.show()
  })

  mainWindow.webContents.on(
    "did-fail-load",
    (_event: Electron.Event, errorCode: number, errorDescription: string) => {
      console.error("[LongNhat]: Renderer failed to load:", errorCode, errorDescription)
    },
  )
}
app.commandLine.appendSwitch("no-sandbox")
app
  .whenReady()
  .then(() => {
    console.log("[LongNhat]: App ready, creating window...")
    try {
      createWindow()
      console.log("[LongNhat]: Window created successfully")
    } catch (err: any) {
      console.error("[LongNhat]: createWindow failed:", err)
    }
    initAutoUpdater(() => mainWindow)
    console.log("[LongNhat]: Auto updater initialized")
    if (store.get("showTray")) {
      console.log("[LongNhat]: Creating tray...")
      try {
        trayInstance = createTray(mainWindow!)
        console.log("[LongNhat]: Tray created")
      } catch (err: any) {
        console.error("[LongNhat]: Tray creation failed:", err)
      }
    }
    setupPowerShellHandlers()
    setupSystemHandlers()
    setupTweaksHandlers()
    setupDNSHandlers()
    setupBackupHandlers()
    setupDebloatHandlers()
    setupCleanerHandlers()
    if (store.get("rpcEnabled") !== false) {
      startDiscordRPC()
    }
    console.log("[LongNhat]: Handlers setup complete")

    ipcMain.on("window-minimize", () => {
      if (mainWindow) mainWindow.minimize()
    })

    ipcMain.on("window-toggle-maximize", () => {
      if (mainWindow) {
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize()
        } else {
          mainWindow.maximize()
        }
      }
    })

    ipcMain.on("window-close", () => {
      if (mainWindow) {
        if (store.get("showTray")) {
          mainWindow.hide()
        } else {
          app.quit()
        }
      }
    })

    ipcMain.handle("open-devtools", () => {
      if (mainWindow) {
        mainWindow.webContents.openDevTools()
      }
    })

    app.on("activate", function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
  .catch((err: any) => {
    console.error("[LongNhat]: app.whenReady failed:", err)
  })
