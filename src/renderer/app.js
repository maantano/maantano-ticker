const { ipcRenderer } = require("electron");
const Stock = require("../models/Stock");
const StockDataManager = require("../services/StockDataManager");

class MaanStockApp {
  constructor() {
    this.stocks = [];
    this.dataManager = new StockDataManager();
    this.updateInterval = null;
    this.searchTimeout = null;

    this.containerEl = document.querySelector(".container");
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

    // 초기 로드 완료 후 창 크기 조정
    this.adjustWindowSize();
  }

  adjustWindowSize() {
    requestAnimationFrame(() => {
      const containerHeight = this.containerEl.offsetHeight;
      if (containerHeight > 0) {
        ipcRenderer.send("resize-window", containerHeight);
      }
    });
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

    // 환영 메시지 리스너
    ipcRenderer.on("show-welcome-message", () => {
      this.showWelcomeMessage();
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

      // 상장폐지 종목 자동 제거
      await this.checkAndRemoveDelistedStocks();

      this.renderStockList();
      this.updateMenuBar();
    } catch (error) {
      console.error("Failed to update stocks:", error);
    }
  }

  /**
   * 상장폐지 가능성이 있는 종목 자동 제거
   */
  async checkAndRemoveDelistedStocks() {
    const delistedStocks = [];

    // 연속 에러 발생 종목 중 DB에 없는 종목 찾기
    for (let i = this.stocks.length - 1; i >= 0; i--) {
      const stock = this.stocks[i];

      if (stock.isPossiblyDelisted()) {
        // DB에 종목이 없으면 상장폐지로 판단
        const existsInDB = this.dataManager.isStockInDatabase(stock.symbol);

        if (!existsInDB) {
          delistedStocks.push({
            name: stock.name,
            symbol: stock.symbol
          });
          this.stocks.splice(i, 1);
        }
      }
    }

    // 제거된 종목이 있으면 저장 및 알림
    if (delistedStocks.length > 0) {
      await this.saveStocks();
      await ipcRenderer.invoke("show-delisted-stocks-dialog", delistedStocks);
      console.log("[Maantano Ticker] 상장폐지 종목 자동 제거:", delistedStocks);
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

    // 환영 메시지에서 적용한 스타일 초기화
    this.stockListEl.style.maxHeight = "";
    this.stockListEl.style.minHeight = "";
    this.stockListEl.style.display = "";
    this.stockListEl.style.alignItems = "";
    this.stockListEl.style.justifyContent = "";

    // 3개 이상일 때만 스크롤 활성화
    if (this.stocks.length >= 3) {
      this.stockListEl.classList.add("has-scroll");
    } else {
      this.stockListEl.classList.remove("has-scroll");
    }

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
    this.stockListEl.classList.remove("has-scroll");

    // 환영 메시지에서 적용한 스타일 초기화
    this.stockListEl.style.maxHeight = "";
    this.stockListEl.style.minHeight = "";
    this.stockListEl.style.display = "";
    this.stockListEl.style.alignItems = "";
    this.stockListEl.style.justifyContent = "";

    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";

    const icon = document.createElement("img");
    icon.className = "empty-state-icon";
    icon.src = "../assets/chartColor.png";
    icon.alt = "차트 아이콘";

    const text = document.createElement("div");
    text.className = "empty-state-text";
    text.innerHTML =
      "추가된 종목이 없습니다.<br>아래 버튼을 눌러 종목을 추가해보세요.";

    emptyState.appendChild(icon);
    emptyState.appendChild(text);
    this.stockListEl.appendChild(emptyState);
  }

  showWelcomeMessage() {
    // 모든 UI 요소 숨기기
    this.addButtonEl.parentElement.style.display = "none"; // add-stock-section
    document.querySelector(".footer").style.display = "none";

    // 환영 메시지를 전체 창 크기로 표시
    this.stockListEl.innerHTML = "";
    this.stockListEl.classList.remove("has-scroll");
    this.stockListEl.style.maxHeight = "none";
    this.stockListEl.style.minHeight = "360px";
    this.stockListEl.style.display = "flex";
    this.stockListEl.style.alignItems = "center";
    this.stockListEl.style.justifyContent = "center";

    const welcomeState = document.createElement("div");
    welcomeState.className = "empty-state";
    welcomeState.style.padding = "60px 20px";

    const icon = document.createElement("img");
    icon.className = "empty-state-icon";
    icon.src = "../assets/chartColor.png";
    icon.alt = "차트 아이콘";

    const text = document.createElement("div");
    text.className = "empty-state-text";
    text.innerHTML = "Maantano Ticker가<br>설치되었습니다!";

    const button = document.createElement("button");
    button.className = "add-button";
    button.style.marginTop = "20px";
    button.textContent = "확인";
    button.addEventListener("click", () => {
      // 확인 버튼 클릭 시 스타일 초기화 및 UI 요소 복원
      this.stockListEl.style.maxHeight = "";
      this.stockListEl.style.minHeight = "";
      this.stockListEl.style.display = "";
      this.stockListEl.style.alignItems = "";
      this.stockListEl.style.justifyContent = "";

      this.addButtonEl.parentElement.style.display = "";
      document.querySelector(".footer").style.display = "";
      this.showEmptyState();
    });

    welcomeState.appendChild(icon);
    welcomeState.appendChild(text);
    welcomeState.appendChild(button);
    this.stockListEl.appendChild(welcomeState);
  }

  updateMenuBar() {
    if (this.stocks.length === 0) {
      ipcRenderer.send("update-tray", { type: "empty" });
      return;
    }

    const firstStock = this.stocks[0];
    const title = firstStock.getMenuBarText();
    ipcRenderer.send("update-tray", { type: "stock", title });
  }

  toggleSearchSection() {
    const isHidden = this.searchSectionEl.classList.contains("hidden");

    if (isHidden) {
      // 환영 메시지 스타일 초기화 (검색창을 열 때)
      this.stockListEl.style.maxHeight = "";
      this.stockListEl.style.minHeight = "";
      this.stockListEl.style.display = "";
      this.stockListEl.style.alignItems = "";
      this.stockListEl.style.justifyContent = "";

      // 검색창 열 때도 리렌더링하여 stock-list 높이 조정
      if (this.stocks.length > 0) {
        this.renderStockList();
      }

      // Container에 searching 클래스 추가
      this.containerEl.classList.add("searching");
      this.searchSectionEl.classList.remove("hidden");

      // 다음 프레임에서 높이 계산 및 창 크기 조정
      requestAnimationFrame(() => {
        this.adjustSearchWindowSize();

        // 창 크기 조정 후 포커스
        setTimeout(() => {
          this.searchInputEl.focus();
        }, 50);
      });
    } else {
      // Container에서 searching 클래스 제거
      this.containerEl.classList.remove("searching");
      this.searchSectionEl.classList.add("hidden");
      this.searchInputEl.value = "";
      this.autocompleteListEl.innerHTML = "";

      // stock-list 높이를 정상으로 되돌리기 위해 다시 렌더링
      if (this.stocks.length > 0) {
        this.renderStockList();
      } else {
        this.showEmptyState();
      }

      // 다음 프레임에서 높이 계산 및 창 크기 복원
      requestAnimationFrame(() => {
        const containerHeight = this.containerEl.offsetHeight;
        ipcRenderer.send("resize-window", containerHeight);
      });
    }
  }

  adjustSearchWindowSize() {
    const containerHeight = this.containerEl.offsetHeight;
    const autocompleteHeight = this.autocompleteListEl.offsetHeight;

    // autocomplete가 비어있으면 (:empty로 display:none) offsetHeight는 0
    // 비어있을 때는 container 높이만 사용
    // 있을 때는 실제 autocomplete 높이 + 여유 공간 10px 추가
    const totalHeight = autocompleteHeight > 0
      ? containerHeight + autocompleteHeight + 10
      : containerHeight;

    ipcRenderer.send("resize-window", totalHeight);
  }

  handleSearchInput(query) {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    if (query.trim().length === 0) {
      this.autocompleteListEl.innerHTML = "";
      // 검색어가 비어있으면 autocomplete 없이 창 크기 조정
      requestAnimationFrame(() => {
        this.adjustSearchWindowSize();
      });
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

      // 검색 결과 렌더링 후 창 크기 동적 조정
      requestAnimationFrame(() => {
        this.adjustSearchWindowSize();
      });
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

    // 검색 결과 렌더링 후 창 크기 동적 조정
    requestAnimationFrame(() => {
      this.adjustSearchWindowSize();
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

    // 종목 추가 후 창 크기 재조정
    this.adjustWindowSize();
  }

  async removeStock(index) {
    this.stocks.splice(index, 1);
    await this.saveStocks();
    this.renderStockList();
    this.updateMenuBar();

    // 종목 제거 후 창 크기 재조정
    this.adjustWindowSize();
  }
}

const app = new MaanStockApp();
