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

  // 3. 【全新修正】：網頁一打開，主動切換到儀表板頁面，把其他頁面隱藏起來
  // 請確認你的儀表板頁面 ID 是否為 page-dashboard，如果不是請修改對應的參數（例如 'dashboard'）
  switchPage('dashboard'); 
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
  
  if (!owner || !gasUrl) {
    updateWelcomeMessage("歡迎！請先前往「系統設定」輸入代號與 GAS 網址。");
    const container = document.getElementById('visitor-cards-container');
    if (container) {
      container.innerHTML = `<p class="loading-text">⚠️ 請先完成系統設定以讀取資料。</p>`;
    }
    return;
  }
  
  updateWelcomeMessage(`正在連線資料庫，載入 ${owner} 的專屬資料...`);
  
  // 加上防禦型檢查，如果網址不包含 http，不上傳/不執行 fetch 防止噴嚴重錯誤
  if (!gasUrl.startsWith('http')) {
    console.warn("GAS 網址格式不正確，暫不進行連線。");
    return;
  }
  
  fetch(gasUrl)
    .then(response => response.json())
    .then(res => {
      if (res.status === "success") {
        dbData.visitors = res.data.visitors.filter(v => String(v.owner) === owner);
        dbData.visitLogs = res.data.visitLogs.filter(log => String(log.owner) === owner);
        updateDashboard();
        renderVisitorCards();
        updateDashboard();
      } else {
        alert("資料庫讀取失敗: " + res.message);
      }
    })
    .catch(err => {
      console.error("連線錯誤:", err);
      updateWelcomeMessage("❌ 連線失敗，目前為離線測試模式。");
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
  // 將所有分頁隱藏
  document.querySelectorAll('.page-view').forEach(page => {
    page.classList.add('hidden');
  });
  
  // 顯示目標分頁
  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) {
    targetPage.classList.remove('hidden');
  }

  // 導覽按鈕的啟用狀態切換
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const activeBtn = Array.from(document.querySelectorAll('.nav-btn')).find(btn => {
    const onclickAttr = btn.getAttribute('onclick');
    return onclickAttr && onclickAttr.includes(pageId);
  });
  
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

// 功能：將 dbData.visitors 中的資料動態渲染成卡片
function renderVisitorCards() {
  const container = document.getElementById('visitor-cards-container');
  if (!container) return;
  
  if (dbData.visitors.length === 0) {
    container.innerHTML = `<p class="loading-text">目前尚無資料，請點擊右上方新增對象！</p>`;
    return;
  }

  // 自動更新 HTML 裡的「所有區域」下拉選單（加分功能）
  updateAreaFilterOptions();

  // 開始組裝卡片 HTML
  let cardsHtml = "";
  
  dbData.visitors.forEach(v => {
    // 根據狀態給予不同的顏色標籤標記（CSS 內可以自行補上對應樣式）
    let statusBadgeClass = "badge-new";
    if (v.status === "持續追蹤") statusBadgeClass = "badge-tracking";
    if (v.status === "暫時結案") statusBadgeClass = "badge-closed";

    cardsHtml += `
      <div class="visitor-card">
        <div class="card-header">
          <h3 class="visitor-name">${v.name}</h3>
          <span class="status-badge ${statusBadgeClass}">${v.status}</span>
        </div>
        <div class="card-body">
          <p>📍 <strong>區域：</strong> ${v.area || '-'}</p>
          <p>🏠 <strong>地址：</strong> ${v.address || '-'}</p>
        </div>
        <div class="card-footer">
          <button class="btn-detail-view" onclick="showVisitorDetail('${v.id || v.visitorId}')">
            🔍 查看歷史紀錄與跟進
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = cardsHtml;
}

// 輔助功能：自動收集所有資料的區域，並填入下拉選單中
function updateAreaFilterOptions() {
  const areaSelect = document.getElementById('filter-area');
  if (!areaSelect) return;

  // 收集不重複的區域名稱
  const areas = [];
  dbData.visitors.forEach(v => {
    if (v.area && !areas.includes(v.area)) {
      areas.push(v.area);
    }
  });

  // 保留第一個「所有區域」選項，後面動態長出來
  areaSelect.innerHTML = `<option value="">所有區域</option>`;
  areas.forEach(area => {
    areaSelect.innerHTML += `<option value="${area}">${area}</option>`;
  });
}

// ==========================================
// 核心功能 5：處理「新增與紀錄」相關按鈕與表單
// ==========================================

// 功能 A：負責點擊「新增拜訪對象」按鈕時切換頁面
function openAddVisitorModal() {
  console.log("新增對象按鈕被點擊了！準備開啟新增頁面...");
  
  // 檢查你的 index.html 裡面，負責新增拜訪對象的那個區塊 id
  // 如果是 id="page-add-visitor"，這裡就傳入 'add-visitor'
  switchPage('add-visitor'); 
}

// 功能 B：負責處理「新增本次拜訪紀錄」表單送出時的動作（對應你的 HTML onsubmit）
function handleNewLog(event) {
  // 1. 這是最重要的一步！阻止表單預設的「重新整理網頁」行為
  // 如果不寫這行，網頁會整頁重新載入，前面辛苦隱藏的頁面就又會全部彈出來！
  event.preventDefault(); 
  
  console.log("📝 偵測到拜訪紀錄表單送出！");
  
  // 這裡之後我們會用來寫「將資料透過 fetch 發送到 GAS 寫入 Google Sheets」的程式碼
  // 目前我們先放一個提示，確認按鈕與表單綁定成功
  alert("已偵測到表單送出！接下來我們將實作串接 Google Sheets 寫入資料的功能。");
}

// 功能：負責處理「新增拜訪對象」表單送出
function handleNewVisitor(event) {
  // 1. 阻止表單預設的重整網頁行為
  event.preventDefault();

  const gasUrl = localStorage.getItem('vt_gas_url');
  const owner = localStorage.getItem('vt_owner') || "Unknown";

  if (!gasUrl) {
    alert("⚠️ 請先前往系統設定填寫 GAS 網址！");
    return;
  }

  // 2. 抓取 HTML 表單格子裡面的值
  // （請對照你上一動在 HTML 中補上的 input/select id）
  const name = document.getElementById('visitor-name').value.trim();
  const phone = document.getElementById('visitor-phone') ? document.getElementById('visitor-phone').value.trim() : "-"; // 防呆
  const address = document.getElementById('visitor-address').value.trim();
  const status = document.getElementById('visitor-status').value;
  const area = document.getElementById('visitor-area').value.trim();
  
  // 配合你 GAS 的欄位（GAS 裡有 category，我們這裏可以先預設或跟區域一樣，看你的需求）
  const category = "一般"; 

  // 3. 打包成符合 GAS 規範的 JSON 格式
  const payload = {
    action: "addVisitor",
    owner: owner,
    name: name,
    phone: phone,
    address: address,
    status: status,
    category: category,
    area: area
  };

  // 4. 顯示連線中狀態
  const submitBtn = event.target.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerText;
  submitBtn.innerText = "⏳ 正在寫入雲端資料庫...";
  submitBtn.disabled = true;

  // 5. 使用 POST 方法發送給 GAS
  fetch(gasUrl, {
    method: "POST",
    body: JSON.stringify(payload)
  })
  .then(response => response.json())
  .then(res => {
    if (res.status === "success") {
      alert("🎉 新增對象成功！");
      
      // 清空表單
      event.target.reset();
      
      // 自動切換回總表頁面
      switchPage('list');
      
      // 重新從雲端撈取最新資料，更新儀表板和卡片
      fetchDatabaseData();
    } else {
      alert("❌ 寫入失敗: " + res.message);
    }
  })
  .catch(err => {
    console.error("寫入錯誤:", err);
    alert("❌ 網路連線錯誤，請檢查 GAS 網址是否正確。");
  })
  .finally(() => {
    // 恢復按鈕狀態
    submitBtn.innerText = originalBtnText;
    submitBtn.disabled = false;
  });
}

// 功能：點擊卡片後，載入該對象的詳細資料與時間軸
function showVisitorDetail(visitorId) {
  console.log("正在讀取對象詳情，ID:", visitorId);
  
  // 1. 尋找對應的拜訪對象資料 (防呆支援兩種欄位寫法)
  const visitor = dbData.visitors.find(v => (v.id === visitorId || v.visitorId === visitorId));
  
  if (!visitor) {
    alert("找不到該拜訪對象的資料");
    return;
  }

  // 2. 切換到詳情頁面
  switchPage('detail');

  // 3. 把資料塞進 HTML 對應的欄位中
  document.getElementById('detail-name').innerText = "👤 " + visitor.name;
  document.getElementById('detail-phone').innerText = visitor.phone || "無";
  document.getElementById('detail-address').innerText = visitor.address || "無";
  document.getElementById('detail-meta').innerText = `${visitor.category || '一般'} / ${visitor.area || '未分類'}`;

  // 4. 【核心任務】：過濾出屬於這個人的拜訪歷史紀錄
  // 這裡的 log.visitorId 必須跟我們傳入的 visitorId 一致
  const myLogs = dbData.visitLogs.filter(log => String(log.visitorId) === String(visitorId));

  // 5. 渲染歷史時間軸
  const timelineContainer = document.getElementById('timeline-container');
  if (!timelineContainer) return;

  if (myLogs.length === 0) {
    timelineContainer.innerHTML = `<p class="no-log-text">📭 目前還沒有這名對象的歷史拜訪摘要，趕快在上方新增第一筆吧！</p>`;
    return;
  }

  // 在 showVisitorDetail 函式內，切換頁面（switchPage）與渲染時間軸的附近加上：
  const logForm = document.getElementById('add-log-form');
  if (logForm) {
    // 利用 JS 的 onsubmit 動態綁定，並把當前的 visitorId 傳進去
    logForm.onsubmit = function(event) {
      handleNewVisitLog(event, visitorId);
    };
  }

  // 按日期由新到舊排序
  myLogs.sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));

  let timelineHtml = "";
  myLogs.forEach(log => {
    // 格式化日期格式 (去掉時間)
    let displayDate = log.visitDate;
    if (displayDate && displayDate.includes("T")) {
      displayDate = displayDate.split("T")[0];
    }

    timelineHtml += `
      <div class="timeline-item">
        <div class="timeline-meta">
          <span class="timeline-date">📅 ${displayDate}</span>
          <span class="timeline-type-badge">${log.contactType || '面談'}</span>
        </div>
        <div class="timeline-content">
          <p class="log-notes">💬 ${log.notes || '無摘要描述'}</p>
          ${log.nextAction ? `<p class="log-next">📌 <strong>下次跟進：</strong> ${log.nextAction}</p>` : ''}
        </div>
      </div>
    `;
  });

  timelineContainer.innerHTML = timelineHtml;
}

// 功能：統計 dbData 中的資料，並更新儀表板（Dashboard）的數字
function updateDashboard() {
  // 檢查是否有抓到資料
  if (!dbData || !dbData.visitors) return;

  const visitors = dbData.visitors;
  const logs = dbData.visitLogs || [];

  // 1. 計算總人數
  const totalCount = visitors.length;

  // 2. 計算各個狀態的人數
  let newContactCount = 0;
  let trackingCount = 0;
  let closedCount = 0;

  visitors.forEach(v => {
    if (v.status === "新接觸") newContactCount++;
    else if (v.status === "持續追蹤") trackingCount++;
    else if (v.status === "暫時結案") closedCount++;
  });

  // 3. 計算總拜訪人次（歷史紀錄總數）
  const totalLogsCount = logs.length;

  // 4. 將數字渲染到 HTML 的儀表板格子中
  // （請檢查你 HTML 儀表板對應格子的 id 是否相同，若不同請修改這裡或 HTML）
  if (document.getElementById('dash-total-visitors')) {
    document.getElementById('dash-total-visitors').innerText = totalCount;
  }
  if (document.getElementById('dash-new-visitors')) {
    document.getElementById('dash-new-visitors').innerText = newContactCount;
  }
  if (document.getElementById('dash-tracking-visitors')) {
    document.getElementById('dash-tracking-visitors').innerText = trackingCount;
  }
  if (document.getElementById('dash-closed-visitors')) {
    document.getElementById('dash-closed-visitors').innerText = closedCount;
  }
  if (document.getElementById('dash-total-logs')) {
    document.getElementById('dash-total-logs').innerText = totalLogsCount;
  }
}

// 功能：負責處理「新增拜訪紀錄」表單送出（已對齊你的 HTML 欄位 ID）
function handleNewVisitLog(event, currentVisitorId) {
  event.preventDefault();

  const gasUrl = localStorage.getItem('vt_gas_url');
  const owner = localStorage.getItem('vt_owner') || "Unknown";

  if (!gasUrl) {
    alert("⚠️ 請先前往系統設定填寫 GAS 網址！");
    return;
  }

  // 1. 精準抓取你 HTML 中的欄位值
  const visitDate = document.getElementById('log-date').value || new Date().toISOString().split('T')[0];
  const contactType = document.getElementById('log-type').value;
  const notes = document.getElementById('log-notes').value.trim();
  const nextAction = document.getElementById('log-next').value.trim();

  if (!notes) {
    alert("📌 請輸入本次拜訪摘要或對話內容！");
    return;
  }

  // 2. 打包要傳給 GAS 的資料
  const payload = {
    action: "addLog",
    owner: owner,
    visitorId: currentVisitorId, // 綁定當前對象的 ID
    visitDate: visitDate,
    contactType: contactType,
    notes: notes,
    nextAction: nextAction
  };

  // 3. 按鈕防重複點擊
  const submitBtn = event.target.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerText;
  submitBtn.innerText = "⏳ 傳送紀錄中...";
  submitBtn.disabled = true;

  // 4. 發送 POST 請求給 GAS
  fetch(gasUrl, {
    method: "POST",
    body: JSON.stringify(payload)
  })
  .then(response => response.json())
  .then(res => {
    if (res.status === "success") {
      alert("🎉 紀錄新增成功！");
      event.target.reset(); // 清空輸入框
      
      // 5. 重新重新整理資料，並刷新目前的詳情頁時間軸
      fetchDatabaseData().then(() => {
        showVisitorDetail(currentVisitorId);
      });
    } else {
      alert("❌ 寫入失敗: " + res.message);
    }
  })
  .catch(err => {
    console.error("寫入紀錄錯誤:", err);
    alert("❌ 網路連線錯誤，無法新增紀錄。");
  })
  .finally(() => {
    submitBtn.innerText = originalBtnText;
    submitBtn.disabled = false;
  });
}