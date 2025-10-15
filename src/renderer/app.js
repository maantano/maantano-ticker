const { ipcRenderer } = require("electron");
const Stock = require("../models/Stock");
const StockDataManager = require("../services/StockDataManager");

class MaanStockApp {
  constructor() {
    this.stocks = [];
    this.dataManager = new StockDataManager();
    this.updateInterval = null;
    this.searchTimeout = null;

    this.stockListEl = document.getElementById("stockList");
    this.addButtonEl = document.getElementById("addButton");
    this.searchSectionEl = document.getElementById("searchSection");
    this.searchInputEl = document.getElementById("searchInput");
    this.autocompleteListEl = document.getElementById("autocompleteList");
    this.refreshButtonEl = document.getElementById("refreshButton");
    this.quitButtonEl = document.getElementById("quitButton");
    this.loadingOverlayEl = document.getElementById("loadingOverlay");

    this.setupDBUpdateListener();
    this.init();
  }

  async init() {
    await this.loadStocks();
    this.setupEventListeners();
    await this.updateAllStocks();
    this.startAutoUpdate();

    if (this.stocks.length === 0) {
      this.showEmptyState();
      this.updateMenuBar();
    }
  }

  setupEventListeners() {
    this.addButtonEl.addEventListener("click", () => {
      this.toggleSearchSection();
    });

    this.searchInputEl.addEventListener("input", (e) => {
      this.handleSearchInput(e.target.value);
    });

    this.refreshButtonEl.addEventListener("click", () => {
      this.updateAllStocks();
    });

    this.quitButtonEl.addEventListener("click", () => {
      ipcRenderer.send("quit-app");
    });
  }

  setupDBUpdateListener() {
    ipcRenderer.on("db-update-status", (event, status) => {
      if (status.loading) {
        this.showLoadingOverlay();
      } else {
        this.hideLoadingOverlay();
        if (status.success) {
          console.log("종목 데이터베이스 업데이트 완료");
        } else if (status.error) {
          console.error("종목 데이터베이스 업데이트 실패:", status.error);
        }
      }
    });
  }

  showLoadingOverlay() {
    if (this.loadingOverlayEl) {
      this.loadingOverlayEl.classList.remove("hidden");
    }
  }

  hideLoadingOverlay() {
    if (this.loadingOverlayEl) {
      this.loadingOverlayEl.classList.add("hidden");
    }
  }

  async loadStocks() {
    try {
      const savedData = await ipcRenderer.invoke("store-get", "stocks");
      if (savedData && Array.isArray(savedData)) {
        this.stocks = savedData.map((data) => Stock.fromJSON(data));
      }
    } catch (error) {
      console.error("Failed to load stocks:", error);
    }
  }

  async saveStocks() {
    try {
      const data = this.stocks.map((stock) => stock.toJSON());
      await ipcRenderer.invoke("store-set", "stocks", data);
    } catch (error) {
      console.error("Failed to save stocks:", error);
    }
  }

  async updateAllStocks() {
    if (this.stocks.length === 0) return;

    try {
      await this.dataManager.updateMultipleStocks(this.stocks);
      this.renderStockList();
      this.updateMenuBar();
    } catch (error) {
      console.error("Failed to update stocks:", error);
    }
  }

  startAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      this.updateAllStocks();
    }, 5000);
  }

  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  renderStockList() {
    if (this.stocks.length === 0) {
      this.showEmptyState();
      return;
    }

    this.stockListEl.innerHTML = "";

    this.stocks.forEach((stock, index) => {
      const stockItemEl = this.createStockItem(stock, index);
      this.stockListEl.appendChild(stockItemEl);
    });
  }

  createStockItem(stock, index) {
    const div = document.createElement("div");
    div.className = "stock-item";
    div.draggable = true;
    div.dataset.index = index;

    const leftDiv = document.createElement("div");
    leftDiv.className = "stock-left";

    const nameSpan = document.createElement("span");
    nameSpan.className = "stock-name";
    nameSpan.textContent = stock.name;

    const symbolSpan = document.createElement("span");
    symbolSpan.className = "stock-symbol";
    symbolSpan.textContent = stock.symbol;

    leftDiv.appendChild(nameSpan);
    leftDiv.appendChild(symbolSpan);

    const rightDiv = document.createElement("div");
    rightDiv.className = "stock-right";

    const priceSpan = document.createElement("span");
    priceSpan.className = "stock-price";
    priceSpan.textContent = stock.getFormattedPrice();

    const changeSpan = document.createElement("span");
    changeSpan.className = `stock-change ${stock.getChangeStatus()}`;
    changeSpan.textContent = stock.getFormattedChange();

    rightDiv.appendChild(priceSpan);
    rightDiv.appendChild(changeSpan);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-button";
    deleteBtn.textContent = "삭제";
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.removeStock(index);
    });

    div.addEventListener("dragstart", (e) => {
      this.draggedIndex = index;
      div.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });

    div.addEventListener("dragend", (e) => {
      div.classList.remove("dragging");
    });

    div.addEventListener("dragover", (e) => {
      e.preventDefault();
      const dragging = document.querySelector(".dragging");
      if (!dragging || dragging === div) return;

      const rect = div.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;

      if (e.clientY < midpoint) {
        div.parentNode.insertBefore(dragging, div);
      } else {
        div.parentNode.insertBefore(dragging, div.nextSibling);
      }
    });

    div.addEventListener("drop", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const items = [...this.stockListEl.querySelectorAll(".stock-item")];
      const newOrder = items.map((item) => parseInt(item.dataset.index));

      const reorderedStocks = newOrder.map((oldIndex) => this.stocks[oldIndex]);
      this.stocks = reorderedStocks;

      await this.saveStocks();
      this.renderStockList();
      this.updateMenuBar();
    });

    div.appendChild(leftDiv);
    div.appendChild(rightDiv);
    div.appendChild(deleteBtn);

    return div;
  }

  showEmptyState() {
    this.stockListEl.innerHTML = "";

    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";

    const icon = document.createElement("img");
    icon.className = "empty-state-icon";
    icon.src = "../../assets/chartColor.png";
    icon.alt = "차트 아이콘";

    const text = document.createElement("div");
    text.className = "empty-state-text";
    text.innerHTML =
      "추가된 종목이 없습니다.<br>아래 버튼을 눌러 종목을 추가해보세요.";

    emptyState.appendChild(icon);
    emptyState.appendChild(text);
    this.stockListEl.appendChild(emptyState);
  }

  updateMenuBar() {
    if (this.stocks.length === 0) {
      ipcRenderer.send("update-tray-title", "📈");
      return;
    }

    const firstStock = this.stocks[0];
    const title = firstStock.getMenuBarText();
    ipcRenderer.send("update-tray-title", title);
  }

  toggleSearchSection() {
    const isHidden = this.searchSectionEl.classList.contains("hidden");

    if (isHidden) {
      this.searchSectionEl.classList.remove("hidden");
      this.searchInputEl.focus();
    } else {
      this.searchSectionEl.classList.add("hidden");
      this.searchInputEl.value = "";
      this.autocompleteListEl.innerHTML = "";
    }
  }

  handleSearchInput(query) {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    if (query.trim().length === 0) {
      this.autocompleteListEl.innerHTML = "";
      return;
    }

    this.searchTimeout = setTimeout(async () => {
      await this.performSearch(query);
    }, 300);
  }

  async performSearch(query) {
    try {
      const results = await this.dataManager.searchStocks(query);
      this.renderAutocompleteResults(results);
    } catch (error) {
      console.error("Search error:", error);
    }
  }

  renderAutocompleteResults(results) {
    this.autocompleteListEl.innerHTML = "";

    if (results.length === 0) {
      const noResults = document.createElement("div");
      noResults.className = "autocomplete-item";
      noResults.style.cursor = "default";
      noResults.style.color = "var(--text-secondary)";
      noResults.textContent = "검색 결과가 없습니다.";
      this.autocompleteListEl.appendChild(noResults);
      return;
    }

    results.forEach((result) => {
      const item = document.createElement("div");
      item.className = "autocomplete-item";

      const nameSpan = document.createElement("span");
      nameSpan.className = "autocomplete-name";
      nameSpan.textContent = result.name;

      const symbolSpan = document.createElement("span");
      symbolSpan.className = "autocomplete-symbol";
      symbolSpan.textContent = result.symbol;

      item.appendChild(nameSpan);
      item.appendChild(symbolSpan);

      item.addEventListener("click", () => {
        this.addStock(result.symbol, result.name, result.market);
      });

      this.autocompleteListEl.appendChild(item);
    });
  }

  async addStock(symbol, name, market) {
    const exists = this.stocks.some((stock) => stock.symbol === symbol);
    if (exists) {
      await ipcRenderer.invoke("show-already-added-dialog");
      return;
    }

    const stock = this.dataManager.createStock(symbol, name, market);
    this.stocks.push(stock);

    this.renderStockList();
    this.toggleSearchSection();

    await this.saveStocks();
    await this.updateAllStocks();
  }

  async removeStock(index) {
    this.stocks.splice(index, 1);
    await this.saveStocks();
    this.renderStockList();
    this.updateMenuBar();
  }
}

const app = new MaanStockApp();
