if (typeof global.File === "undefined") {
  global.File = class File extends Blob {
    constructor(bits, name, options) {
      super(bits, options);
      this.name = name;
      this.lastModified = options?.lastModified || Date.now();
    }
  };
}

const { app, BrowserWindow, Tray, nativeImage, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const Store = require("electron-store");
const StockDBUpdater = require("../services/StockDBUpdater");
const { createCanvas } = require("canvas");

const store = new Store();
const dbUpdater = new StockDBUpdater();

let tray = null;
let window = null;

if (process.platform === "darwin") {
  app.dock.hide();
}

function createWindow() {
  window = new BrowserWindow({
    width: 360,
    height: 500,
    show: false,
    frame: false,
    resizable: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  window.loadFile(path.join(__dirname, "../renderer/index.html"));

  window.on("blur", () => {
    if (!window.webContents.isDevToolsOpened()) {
      window.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, "../../assets/chartIcon.png");
  let icon = nativeImage.createFromPath(iconPath);
  icon = icon.resize({ width: 18, height: 18 });
  icon.setTemplateImage(true);

  tray = new Tray(icon);
  tray.setToolTip("Maantano Ticker - 국내 주식 티커");
  tray.on("click", toggleWindow);
  tray.on("right-click", toggleWindow);
}

function toggleWindow() {
  if (window.isVisible()) {
    window.hide();
  } else {
    showWindow();
  }
}

function showWindow() {
  const trayBounds = tray.getBounds();
  const windowBounds = window.getBounds();
  const x = Math.round(
    trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2
  );
  const y = Math.round(trayBounds.y + trayBounds.height);
  window.setPosition(x, y, false);
  window.show();
  window.focus();
}

app.whenReady().then(async () => {
  // 먼저 UI를 표시
  createTray();
  createWindow();

  if (process.argv.includes("--dev")) {
    window.webContents.openDevTools({ mode: "detach" });
  }

  // DB 파일 존재 여부 확인
  const dbPath = path.join(__dirname, "../data/stocks-db.json");
  const dbExists = fs.existsSync(dbPath);
  const lastDBUpdate = store.get("lastDBUpdate");
  const needsUpdate = StockDBUpdater.needsUpdate(lastDBUpdate);

  // DB가 있으면 로딩 화면 없이 시작 (즉시 사용 가능)
  if (dbExists) {
    window.webContents.on("did-finish-load", () => {
      window.webContents.send("db-update-status", { loading: false, success: true });
    });

    // 업데이트가 필요하면 백그라운드에서 조용히 업데이트
    if (needsUpdate) {
      console.log("[Maantano Ticker] 백그라운드에서 DB 업데이트 중...");
      setTimeout(async () => {
        try {
          await dbUpdater.updateDatabase();
          store.set("lastDBUpdate", Date.now());
          console.log("[Maantano Ticker] DB 업데이트 완료");
        } catch (error) {
          console.error("[Maantano Ticker] DB 업데이트 실패:", error.message);
        }
      }, 3000); // 3초 후 백그라운드에서 업데이트
    }
  } else {
    // DB가 없으면 로딩 화면 표시 (첫 설치 시)
    window.webContents.on("did-finish-load", () => {
      window.webContents.send("db-update-status", { loading: true });
    });

    try {
      await dbUpdater.updateDatabase();
      store.set("lastDBUpdate", Date.now());
      window.webContents.send("db-update-status", { loading: false, success: true });
    } catch (error) {
      console.error("[Maantano Ticker] DB 업데이트 실패:", error.message);
      window.webContents.send("db-update-status", { loading: false, success: false, error: error.message });
    }
  }
});

app.on("window-all-closed", (e) => {
  e.preventDefault();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

function createTrayImage(text) {
  const { nativeTheme } = require("electron");
  const fontSize = 16;
  const menuBarHeight = 22;
  const padding = 5;

  const tempCanvas = createCanvas(1, 1);
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "SF Pro Text"`;

  const parts = text.split(" ");
  let totalWidth = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    totalWidth += tempCtx.measureText(part).width;

    if (i < parts.length - 1) {
      const isPrice = !isNaN(part.replace(/,/g, ""));
      const spacing = isPrice
        ? tempCtx.measureText("   ").width
        : tempCtx.measureText(" ").width;
      totalWidth += spacing;
    }
  }

  const width = Math.ceil(totalWidth) + padding * 2;

  const canvas = createCanvas(width, menuBarHeight);
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, width, menuBarHeight);
  ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "SF Pro Text"`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const defaultTextColor = "#000000";

  let x = padding;
  const y = menuBarHeight / 2 + 1;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (part.includes("▲") || part.includes("▼")) {
      if (part.includes("▲")) {
        ctx.fillStyle = "#FF3B30";
      } else {
        ctx.fillStyle = "#0A84FF";
      }
    } else {
      ctx.fillStyle = defaultTextColor;
    }

    const drawY =
      part.includes("▲") || part.includes("▼") || part.includes("%")
        ? y - 1
        : y;
    ctx.fillText(part, x, drawY);

    const isPrice = !isNaN(part.replace(/,/g, ""));
    const spacing = isPrice
      ? ctx.measureText("   ").width
      : ctx.measureText(" ").width;
    x += ctx.measureText(part).width + spacing;
  }

  const buffer = canvas.toBuffer("image/png");
  const image = nativeImage.createFromBuffer(buffer);
  image.setTemplateImage(false);
  return image;
}

ipcMain.on("update-tray-title", (_, title) => {
  if (tray) {
    if (title === "📈") {
      tray.setTitle("");
      const iconPath = path.join(__dirname, "../../assets/chartIcon.png");
      let icon = nativeImage.createFromPath(iconPath);
      icon = icon.resize({ width: 18, height: 18 });
      icon.setTemplateImage(true);
      tray.setImage(icon);
    } else {
      const image = createTrayImage(title);
      tray.setTitle("");
      tray.setImage(image);
    }
  }
});

ipcMain.on("quit-app", () => {
  app.quit();
});

ipcMain.handle("store-get", (_, key) => {
  return store.get(key);
});

ipcMain.handle("store-set", (_, key, value) => {
  store.set(key, value);
  return true;
});

ipcMain.handle("show-already-added-dialog", async () => {
  const iconPath = path.join(__dirname, "../../assets/return.png");
  const icon = nativeImage.createFromPath(iconPath);

  await dialog.showMessageBox(window, {
    type: "info",
    title: "알림",
    message: "이미 추가된 종목입니다.",
    buttons: ["OK"],
    icon: icon
  });
});

ipcMain.handle("show-delisted-stocks-dialog", async (_, delistedStocks) => {
  const iconPath = path.join(__dirname, "../../assets/return.png");
  const icon = nativeImage.createFromPath(iconPath);

  const stockNames = delistedStocks.map(s => `${s.name} (${s.symbol})`).join("\n");
  const message = `다음 종목이 상장폐지 또는 조회 불가능하여 자동으로 제거되었습니다:\n\n${stockNames}`;

  await dialog.showMessageBox(window, {
    type: "warning",
    title: "상장폐지 종목 자동 제거",
    message: message,
    buttons: ["확인"],
    icon: icon
  });
});
