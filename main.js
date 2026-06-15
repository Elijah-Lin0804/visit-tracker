// 全局資料暫存器（用來放從後台撈回來的完整資料）
let dbData = {
  visitors: [],
  visitLogs: []
};

// 網頁一載入就執行的初始化動作 (確保 DOM 完全加載後才執行)
window.addEventListener('DOMContentLoaded', () => {
  console.log("DOM 完全加載，開始初始化設定...");
  // 1. 載入先前儲存的系統設定
  loadSettings();
  
  // 2. 嘗試初始化連線撈取資料
  fetchDatabaseData();
});

// ==========================================
// 核心功能 1：系統設定管理 (localStorage)
// ==========================================

// 將設定值自動儲存起來
function saveSettings() {
  const ownerEl = document.getElementById('settings-owner');
  const gasUrlEl = document.getElementById('settings-gas-url');
  
  if (!ownerEl || !gasUrlEl) return; // 安全防護

  const owner = ownerEl.value.trim();
  const gasUrl = gasUrlEl.value.trim();
  
  localStorage.setItem('vt_owner', owner);
  localStorage.setItem('vt_gas_url', gasUrl);
  
  const statusMsg = document.getElementById('settings-status');
  if (statusMsg) {
    statusMsg.innerText = "✅ 設定已成功儲存！";
    statusMsg.style.color = "green";
  }
  
  // 設定一改變，立刻重新撈取新使用者的資料
  fetchDatabaseData();
}

// 載入當前儲存的設定並填入輸入框
function loadSettings() {
  const savedOwner = localStorage.getItem('vt_owner') || "";
  const savedGasUrl = localStorage.getItem('vt_gas_url') || "";
  
  const ownerEl = document.getElementById('settings-owner');
  const gasUrlEl = document.getElementById('settings-gas-url');
  
  // 安全防護：確定畫面上有這兩個格子，才把數值塞進去
  if (ownerEl) ownerEl.value = savedOwner;
  if (gasUrlEl) gasUrlEl.value = savedGasUrl;
}

// ==========================================
// 核心功能 2：連線 GAS 讀取雙工作表資料
// ==========================================

function fetchDatabaseData() {
  const owner = localStorage.getItem('vt_owner');
  const gasUrl = localStorage.getItem('vt_gas_url');
  
  // 基礎檢查：如果還沒設定，就提示使用者去設定頁面
  if (!owner || !gasUrl) {
    updateWelcomeMessage("歡迎！請先前往「系統設定」輸入代號與 GAS 網址。");
    const container = document.getElementById('visitor-cards-container');
    if (container) {
      container.innerHTML = `<p class="loading-text">⚠️ 請先完成系統設定以讀取資料。</p>`;
    }
    return;
  }
  
  updateWelcomeMessage(`正在連線資料庫，載入 ${owner} 的專屬資料...`);
  
  // 發送 GET 請求給 GAS
  fetch(gasUrl)
    .then(response => response.json())
    .then(res => {
      if (res.status === "success") {
        // 只留下一列中 owner 欄位等於目前使用者的資料
        dbData.visitors = res.data.visitors.filter(v => String(v.owner) === owner);
        dbData.visitLogs = res.data.visitLogs.filter(log => String(log.owner) === owner);
        
        console.log("過濾後的拜訪對象資料：", dbData.visitors);
        console.log("過濾後的追蹤紀錄資料：", dbData.visitLogs);
        
        // 資料準備完畢，驅動儀表板更新與總表渲染
        updateDashboard();
        renderVisitorCards();
      } else {
        alert("資料庫讀取失敗: " + res.message);
      }
    })
    .catch(err => {
      console.error("連線錯誤:", err);
      updateWelcomeMessage("❌ 連線失敗，請檢查 GAS 網址是否正確或是否已發布新版本。");
    });
}

// 輔助更新歡迎詞
function updateWelcomeMessage(msg) {
  const welcomeText = document.getElementById('dashboard-welcome');
  if (welcomeText) welcomeText.innerText = msg;
}

// ==========================================
// 核心功能 3：單頁網頁切換邏輯
// ==========================================
function switchPage(pageId) {
  document.querySelectorAll('.page-view').forEach(page => {
    page.classList.add('hidden');
  });
  
  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) {
    targetPage.classList.remove('hidden');
  }

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const activeBtn = Array.from(document.querySelectorAll('.nav-btn')).find(btn => 
    btn.getAttribute('onclick').includes(pageId)
  );
  // 【此處已修正】：補上 classList 避開第 74 行的 null/TypeError 錯誤
  if (activeBtn) {
    activeBtn.classList.add('active');
  }
}

// ==========================================
// 核心功能 4：計算並更新數據儀表板 (Dashboard)
// ==========================================
function updateDashboard() {
  const owner = localStorage.getItem('vt_owner') || "使用者";
  updateWelcomeMessage(`歡迎回來，${owner}！以下是您的即時傳道數據摘要：`);
  
  const total = dbData.visitors.length;
  const tracking = dbData.visitors.filter(v => v.status === "持續追蹤").length;
  const newContact = dbData.visitors.filter(v => v.status === "新接觸").length;
  
  const totalEl = document.getElementById('stat-total');
  const trackingEl = document.getElementById('stat-tracking');
  const newEl = document.getElementById('stat-new');
  
  if (totalEl) totalEl.innerText = total + " 人";
  if (trackingEl) trackingEl.innerText = tracking + " 人";
  if (newEl) newEl.innerText = newContact + " 人";
}

// 暫時渲染卡片功能
function renderVisitorCards() {
  const container = document.getElementById('visitor-cards-container');
  if (!container) return;
  
  if (dbData.visitors.length === 0) {
    container.innerHTML = `<p class="loading-text">目前尚無資料，請點擊右上方新增對象！</p>`;
  } else {
    container.innerHTML = `<p class="loading-text">💡 已成功讀取 ${dbData.visitors.length} 筆資料，準備渲染卡片...</p>`;
  }
}
