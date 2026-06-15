// ==========================================================================
// 1. 全域變數與 DOM 元素抓取
// ==========================================================================
// 狀態變數：儲存所有的拜訪紀錄資料
let visitRecords = [];

// 抓取 HTML 元素
const defaultCitySelect = document.getElementById('default-city');
const saveSettingBtn = document.getElementById('save-setting-btn');
const formCitySelect = document.getElementById('form-city');

const visitForm = document.getElementById('visit-form');
const dataListTemplate = document.getElementById('data-list');

const filterDistrictInput = document.getElementById('filter-district');
const filterBtn = document.getElementById('filter-btn');
const clearFilterBtn = document.getElementById('clear-filter-btn');

// ==========================================================================
// 2. 初始化功能 (網頁一打開就要執行的事)
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // A. 載入預設縣市設定
    const savedCity = localStorage.getItem('defaultCity') || '台北市';
    defaultCitySelect.value = savedCity;
    updateFormCity(savedCity);

    // B. 載入已儲存的拜訪紀錄
    const savedRecords = localStorage.getItem('visitRecords');
    if (savedRecords) {
        visitRecords = JSON.parse(savedRecords); // 將 JSON 字串轉回陣列
    }

    // C. 渲染表格
    renderTable(visitRecords);
});

// 更新表單中「被禁用」的縣市下拉選單文字
function updateFormCity(cityName) {
    formCitySelect.innerHTML = `<option value="${cityName}">${cityName}</option>`;
}

// ==========================================================================
// 3. 系統設定事件
// ==========================================================================
saveSettingBtn.addEventListener('click', () => {
    const selectedCity = defaultCitySelect.value;
    localStorage.setItem('defaultCity', selectedCity); // 存入 localStorage
    updateFormCity(selectedCity);                      // 同步更新表單縣市
    alert(`預設縣市已固定為：${selectedCity}`);
});

// ==========================================================================
// 4. 新增紀錄事件
// ==========================================================================
visitForm.addEventListener('submit', (e) => {
    e.preventDefault(); // 阻擋表單預設的重整網頁行為

    // 抓取表單輸入的值
    const name = document.getElementById('name').value;
    const gender = document.querySelector('input[name="gender"]:checked').value;
    const city = formCitySelect.value;
    const district = document.getElementById('form-district').value.trim();
    const address = document.getElementById('form-address').value.trim();
    const visitDate = document.getElementById('visit-date').value;
    const nextVisitDate = document.getElementById('next-visit-date').value;
    const notes = document.getElementById('notes').value.trim();

    // 建立一筆新的紀錄物件
    const newRecord = {
        id: Date.now(), // 用時間戳記當作不重複的唯一 ID
        name,
        gender,
        fullAddress: `${city}${district}${address}`,
        district, // 保留行政區，方便之後篩選
        visitDate,
        nextVisitDate: nextVisitDate || '未排定',
        notes: notes || '無'
    };

    // 加進陣列的最前面（讓最新的紀錄在最上面）
    visitRecords.unshift(newRecord);

    // 儲存到 localStorage 并更新畫面
    saveToLocalStorage();
    renderTable(visitRecords);

    // 清空表單（保留縣市）
    visitForm.reset();
    updateFormCity(defaultCitySelect.value); 
    alert('紀錄儲存成功！');
});

// 封裝：將資料轉成 JSON 字串存入 localStorage
function saveToLocalStorage() {
    localStorage.setItem('visitRecords', JSON.stringify(visitRecords));
}

// ==========================================================================
// 5. 渲染表格與篩選功能
// ==========================================================================
// 負責把陣列資料畫到 HTML 表格中
function renderTable(records) {
    dataListTemplate.innerHTML = ''; // 先清空舊資料

    if (records.length === 0) {
        dataListTemplate.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#999;">目前沒有資料</td></tr>`;
        return;
    }

    // 跑迴圈把每筆資料塞進表格
    records.forEach(record => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>**${record.name}**</td>
            <td>${record.gender}</td>
            <td>${record.fullAddress}</td>
            <td>${record.visitDate}</td>
            <td>${record.nextVisitDate}</td>
            <td>${record.notes}</td>
        `;
        dataListTemplate.appendChild(tr);
    });
}

// 篩選按鈕事件
filterBtn.addEventListener('click', () => {
    const keyword = filterDistrictInput.value.trim();
    
    // 如果沒輸入關鍵字，就顯示全部
    if (!keyword) {
        renderTable(visitRecords);
        return;
    }

    // 過濾出行政區有包含關鍵字的資料
    const filtered = visitRecords.filter(record => record.district.includes(keyword));
    renderTable(filtered);
});

// 重設按鈕事件
clearFilterBtn.addEventListener('click', () => {
    filterDistrictInput.value = ''; // 清空輸入框
    renderTable(visitRecords);     // 顯示完整資料
});