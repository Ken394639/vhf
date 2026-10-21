/* Simple ZH/EN strings for 通時台 */
window.ETI_I18N = {
  zh: {
    docTitle: "通時台 · ETI",
    brand: "通時台",
    brandSub: "Elapsed Time Indication · 離線分析",
    credit:
      "介面資源：Tabler UI（MIT）· github.com/tabler/tabler · 已下載至本機 vendor，可離線使用",
    uploadTitle: "上傳 Status History",
    uploadDesc:
      "將設備網頁另存的 .mhtml / .html 拖到下方。本工具在本機瀏覽器執行，不上外網；會解析 TD 站點路徑、斷電／復電，並可匯出表格與圖片。",
    dropTitle: "選擇檔案或拖放至此",
    dropHint: "支援 .mhtml、.mht、.html",
    formula: "公式",
    acOutage: "AC + Reduced = 斷電",
    acRestore: "AC + Cleared = 復電",
    demo: "試用示範檔",
    downloadPng: "下載圖片",
    downloadWord: "Word",
    downloadCsv: "CSV",
    again: "再分析一份",
    healthOk: "健康：正常",
    healthAlert: "需要留意",
    metricEti: "目前 ETI",
    metricStatus: "服務狀態",
    metricRef: "參考時間",
    metricCount: "事件／斷電相關",
    metricOutageTotal: "斷電總時間",
    metricOutageCount: "斷電次數",
    outageOngoing: "（含未復電中）",
    colDuration: "本次時長",
    sectionTd: "TD／站點設備",
    sectionPower: "斷電／復電",
    sectionAll: "全部 Status History",
    legend: "紅底列 = 斷電　綠底列 = 復電",
    colNo: "序",
    colType: "類型",
    colEvent: "事件",
    colSeverity: "嚴重度",
    colService: "服務",
    colEti: "ETI",
    colTime: "日期時間",
    colAgo: "距今",
    colAgoDays: "距今(天)",
    colNtp: "NTP",
    noPower: "（無 AC 斷電／復電事件）",
    noTd: "（未找到 TD 節點）",
    noPath: "（頁面未找到站點路徑／TD 麵包屑）",
    analyzing: "正在產生圖片…",
    pngDone: "已下載 PNG 圖片",
    csvDone: "已下載 CSV",
    wordDone: "已下載 Word 表格",
    done: "分析完成",
    notFound: "找不到",
    unknown: "未知",
    kindOutage: "斷電",
    kindRestore: "復電",
    kindAc: "AC/斷電",
    kindDcFault: "DC異常",
    kindDcOk: "DC恢復",
    kindDc: "DC",
    kindStatus: "狀態",
    reportTitle: "通時台 · ETI 報告",
    switchTo: "English",
    missingDemo: "找不到示範檔 sample.mhtml",
    parseFail:
      "找不到 Elapsed Time / Status History 資料，請確認是 Status History 匯出檔。",
    pngFail: "圖片匯出失敗：",
    cannotPng: "無法產生圖片",
  },
  en: {
    docTitle: "ETI Desk",
    brand: "ETI Desk",
    brandSub: "Elapsed Time Indication · Offline",
    credit:
      "UI kit: Tabler (MIT) · github.com/tabler/tabler · Vendored locally for offline use",
    uploadTitle: "Upload Status History",
    uploadDesc:
      "Drop a saved .mhtml / .html export below. Runs fully in your browser offline; parses TD site path, power events, and can export tables or images.",
    dropTitle: "Choose a file or drag it here",
    dropHint: "Supports .mhtml, .mht, .html",
    formula: "Formula",
    acOutage: "AC + Reduced = outage",
    acRestore: "AC + Cleared = restored",
    demo: "Try sample file",
    downloadPng: "Download PNG",
    downloadWord: "Word",
    downloadCsv: "CSV",
    again: "Analyze another",
    healthOk: "Healthy",
    healthAlert: "Needs attention",
    metricEti: "Current ETI",
    metricStatus: "Service status",
    metricRef: "Reference time",
    metricCount: "Events / power",
    metricOutageTotal: "Total outage time",
    metricOutageCount: "Outage count",
    outageOngoing: "(includes ongoing)",
    colDuration: "Duration",
    sectionTd: "TD / site equipment",
    sectionPower: "Power outage / restore",
    sectionAll: "All Status History",
    legend: "Red rows = outage · Green rows = restored",
    colNo: "#",
    colType: "Type",
    colEvent: "Event",
    colSeverity: "Severity",
    colService: "Service",
    colEti: "ETI",
    colTime: "Date/time",
    colAgo: "Ago",
    colAgoDays: "Days ago",
    colNtp: "NTP",
    noPower: "(No AC outage/restore events)",
    noTd: "(No TD nodes found)",
    noPath: "(No site path / TD breadcrumb found)",
    analyzing: "Creating image…",
    pngDone: "PNG downloaded",
    csvDone: "CSV downloaded",
    wordDone: "Word table downloaded",
    done: "Analysis complete",
    notFound: "N/A",
    unknown: "Unknown",
    kindOutage: "Outage",
    kindRestore: "Restored",
    kindAc: "AC/outage",
    kindDcFault: "DC fault",
    kindDcOk: "DC OK",
    kindDc: "DC",
    kindStatus: "Status",
    reportTitle: "ETI Desk report",
    switchTo: "中文",
    missingDemo: "Sample file sample.mhtml not found",
    parseFail:
      "No Elapsed Time / Status History data found. Use a Status History export.",
    pngFail: "Image export failed: ",
    cannotPng: "Could not create image",
  },
};

window.ETI_LANG = localStorage.getItem("eti-lang") === "en" ? "en" : "zh";

window.t = function t(key) {
  const pack = window.ETI_I18N[window.ETI_LANG] || window.ETI_I18N.zh;
  return pack[key] != null ? pack[key] : key;
};

window.applyStaticI18n = function applyStaticI18n() {
  document.documentElement.lang = window.ETI_LANG === "en" ? "en" : "zh-Hant";
  document.title = window.t("docTitle");
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = window.t(key);
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    if (key) el.innerHTML = window.t(key);
  });
  const btn = document.getElementById("langToggle");
  if (btn) btn.textContent = window.t("switchTo");
};

window.setLang = function setLang(lang) {
  window.ETI_LANG = lang === "en" ? "en" : "zh";
  localStorage.setItem("eti-lang", window.ETI_LANG);
  window.applyStaticI18n();
  if (typeof window.onLangChange === "function") window.onLangChange();
};
