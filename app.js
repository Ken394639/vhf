(() => {
  "use strict";

  const drop = document.getElementById("drop");
  const fileInput = document.getElementById("fileInput");
  const results = document.getElementById("results");
  const errorBox = document.getElementById("error");
  const toast = document.getElementById("toast");
  const hero = document.getElementById("hero");

  const els = {
    unit: document.getElementById("unitTitle"),
    unitCapture: document.getElementById("unitTitleCapture"),
    sitePath: document.getElementById("sitePath"),
    sitePathCapture: document.getElementById("sitePathCapture"),
    health: document.getElementById("health"),
    healthCapture: document.getElementById("healthCapture"),
    eti: document.getElementById("mEti"),
    status: document.getElementById("mStatus"),
    ref: document.getElementById("mRef"),
    count: document.getElementById("mCount"),
    outageCount: document.getElementById("mOutageCount"),
    outageTotal: document.getElementById("mOutageTotal"),
    tdChips: document.getElementById("tdChips"),
    powerBody: document.getElementById("powerBody"),
    allBody: document.getElementById("allBody"),
  };

  let lastReport = null;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove("d-none");
  }

  function clearError() {
    errorBox.textContent = "";
    errorBox.classList.add("d-none");
  }

  function kindLabel(kind) {
    const map = {
      OUTAGE: "kindOutage",
      RESTORE: "kindRestore",
      AC: "kindAc",
      DC_FAULT: "kindDcFault",
      DC_OK: "kindDcOk",
      DC: "kindDc",
      STATUS: "kindStatus",
    };
    return window.t(map[kind] || "kindStatus");
  }

  function decodeQuotedPrintable(text) {
    const noSoft = text.replace(/=\r?\n/g, "");
    const bytes = [];
    for (let i = 0; i < noSoft.length; i++) {
      const c = noSoft[i];
      if (c === "=" && i + 2 < noSoft.length) {
        const hex = noSoft.slice(i + 1, i + 3);
        if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
          bytes.push(parseInt(hex, 16));
          i += 2;
          continue;
        }
      }
      bytes.push(c.charCodeAt(0) & 0xff);
    }
    return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
  }

  function extractHtml(raw) {
    const isMhtml =
      /\.mht/i.test(raw.nameHint || "") ||
      /Content-Transfer-Encoding:\s*quoted-printable/i.test(raw.text) ||
      /multipart\/related/i.test(raw.text);

    let html = raw.text;
    let snapshot = null;

    if (isMhtml) {
      const dm = raw.text.match(/^Date:\s*(.+)$/im);
      if (dm) {
        const d = new Date(dm[1].trim());
        if (!Number.isNaN(d.getTime())) snapshot = d;
      }
      let start = raw.text.indexOf("<!DOCTYPE");
      if (start < 0) start = raw.text.indexOf("<html");
      if (start < 0) throw new Error("HTML not found");
      let end = raw.text.indexOf("------MultipartBoundary", start + 10);
      if (end < 0) end = raw.text.indexOf("\n------", start + 10);
      if (end < 0) end = raw.text.length;
      const qp = raw.text.slice(start, end);
      html = decodeQuotedPrintable(qp);
    }

    return { html, snapshot, fileMtime: raw.mtime };
  }

  function parseEti(text) {
    if (!text) return null;
    const t = text.trim();
    let m = t.match(/^(?:(\d+)\s*d)?\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?$/i);
    if (!m || (!m[1] && !m[2] && !m[3])) {
      m = t.match(/^(\d+)h(?:(\d+)m)?$/i);
      if (!m) return null;
      const hours = parseInt(m[1], 10);
      const mins = m[2] ? parseInt(m[2], 10) : 0;
      const totalMinutes = hours * 60 + mins;
      return { text: t, totalMinutes, totalHours: totalMinutes / 60 };
    }
    const days = m[1] ? parseInt(m[1], 10) : 0;
    const hours = m[2] ? parseInt(m[2], 10) : 0;
    const mins = m[3] ? parseInt(m[3], 10) : 0;
    const totalMinutes = days * 24 * 60 + hours * 60 + mins;
    return { text: t, totalMinutes, totalHours: totalMinutes / 60 };
  }

  function stripTags(s) {
    return (s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  }

  function divByClass(block, className) {
    const re = new RegExp(
      `<div\\s+class="${className}"[^>]*>([\\s\\S]*?)</div>`,
      "i"
    );
    const m = block.match(re);
    return m ? stripTags(m[1]) : "";
  }

  function classify(event, severity) {
    const e = (event || "").trim();
    const s = (severity || "").trim();
    const isAc = e === "AC" || /\bAC\b/i.test(e) || /Power\s*Removed|Power\s*Fail|Mains/i.test(e);
    const isDc = /DC\s*Supply/i.test(e);
    if (isAc) {
      if (/Reduced/i.test(s)) return { kind: "OUTAGE" };
      if (/Cleared/i.test(s)) return { kind: "RESTORE" };
      return { kind: "AC" };
    }
    if (isDc) {
      if (/Reduced/i.test(s)) return { kind: "DC_FAULT" };
      if (/Cleared/i.test(s)) return { kind: "DC_OK" };
      return { kind: "DC" };
    }
    return { kind: "STATUS" };
  }

  function formatDuration(totalHours, withApproxDays) {
    if (totalHours == null || Number.isNaN(totalHours)) return "N/A";
    const sign = totalHours < 0 ? "-" : "";
    const hAbs = Math.abs(totalHours);
    let days = Math.floor(hAbs / 24);
    let remH = Math.floor(hAbs - days * 24);
    let remM = Math.round((hAbs - days * 24 - remH) * 60);
    if (remM >= 60) {
      remH += 1;
      remM = 0;
    }
    const approx = hAbs / 24;
    if (window.ETI_LANG === "en") {
      const core = `${sign}${days}d ${remH}h ${remM}m`;
      return withApproxDays ? `${core} (~${approx.toFixed(2)} days)` : core;
    }
    const core = `${sign}${days} 天 ${remH} 小時 ${remM} 分`;
    return withApproxDays ? `${core}（約 ${approx.toFixed(2)} 天）` : core;
  }

  function formatDaysAgo(totalHours) {
    return formatDuration(totalHours, true);
  }

  /** Safe download stem from TD unit / site path — not a fixed machine name */
  function safeStem(text) {
    return String(text || "")
      .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 80);
  }

  /**
   * Pair AC OUTAGE → next RESTORE (by ETI hours ascending).
   * Duration = restoreEtiHours - outageEtiHours (or current ETI if still out).
   */
  function computeOutageEpisodes(powerNewestFirst, currentEtiHours) {
    const chrono = [...powerNewestFirst]
      .filter((e) => e.kind === "OUTAGE" || e.kind === "RESTORE")
      .sort((a, b) => {
        const ah = a.etiHours != null ? a.etiHours : -1;
        const bh = b.etiHours != null ? b.etiHours : -1;
        if (ah !== bh) return ah - bh;
        const at = a.absolute ? a.absolute.getTime() : 0;
        const bt = b.absolute ? b.absolute.getTime() : 0;
        return at - bt;
      });

    const episodes = [];
    let open = null;
    for (const e of chrono) {
      if (e.kind === "OUTAGE") {
        open = e;
      } else if (e.kind === "RESTORE" && open) {
        let hours = null;
        if (open.etiHours != null && e.etiHours != null) {
          hours = Math.max(0, e.etiHours - open.etiHours);
        } else if (open.absolute && e.absolute) {
          hours = Math.max(0, (e.absolute.getTime() - open.absolute.getTime()) / 3600000);
        }
        episodes.push({
          outage: open,
          restore: e,
          hours,
          ongoing: false,
        });
        open.episodeHours = hours;
        open.episodeOngoing = false;
        e.episodeHours = hours;
        e.episodeOngoing = false;
        open = null;
      }
    }
    if (open) {
      let hours = null;
      if (open.etiHours != null && currentEtiHours != null) {
        hours = Math.max(0, currentEtiHours - open.etiHours);
      }
      episodes.push({
        outage: open,
        restore: null,
        hours,
        ongoing: true,
      });
      open.episodeHours = hours;
      open.episodeOngoing = true;
    }

    const totalHours = episodes.reduce(
      (sum, ep) => sum + (ep.hours != null ? ep.hours : 0),
      0
    );
    const hasOngoing = episodes.some((ep) => ep.ongoing);
    return { episodes, totalHours, count: episodes.length, hasOngoing };
  }

  function fmtLocal(d) {
    if (!d || Number.isNaN(d.getTime())) return window.t("unknown");
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function parseSitePath(html) {
    // Breadcrumb e.g. VHF › TD Tx › TD Tx Cab 2 › TD Tx15 Autotune
    const blockM =
      html.match(
        /<a[^>]*id="ctl00_ctl00_MainContent_ctl0"[^>]*>[\s\S]{0,1500}?<\/div>\s*<\/div>/i
      ) ||
      html.match(/class="SiteMapControl"[\s\S]{0,1500}?<\/div>\s*<\/div>/i);
    const chunk = blockM ? blockM[0] : "";
    const parts = [];
    const re = /<(?:a|span)[^>]*>([^<]{1,80})</gi;
    let m;
    while ((m = re.exec(chunk))) {
      let t = stripTags(m[1])
        .replace(/&gt;/gi, ">")
        .replace(/\s+/g, " ")
        .trim();
      if (!t || t === ">" || t === "›") continue;
      if (/Tree View|Navigation|Status History/i.test(t)) break;
      if (!parts.includes(t)) parts.push(t);
      if (parts.length >= 8) break;
    }
    return parts.filter((p) => !/^(Collapse|Expand|Container)$/i.test(p));
  }

  function parseTdNodes(html) {
    const set = new Set();
    const re = />(TD[^<]{0,60})</gi;
    let m;
    while ((m = re.exec(html))) {
      const t = stripTags(m[1]).replace(/\s+/g, " ").trim();
      if (t && t.length < 60) set.add(t);
    }
    return [...set];
  }

  function analyze(html, snapshot, fileMtime) {
    const titleM = html.match(/<title>\s*([\s\S]*?)\s*<\/title>/i);
    const title = titleM ? stripTags(titleM[1]) : "";

    const siteParts = parseSitePath(html);
    const sitePath = siteParts.length ? siteParts.join(" › ") : "";
    const selectedUnit = siteParts.length ? siteParts[siteParts.length - 1] : "";
    const tdNodes = parseTdNodes(html);

    const statusM = html.match(/id="ServiceStatus"[^>]*>([\s\S]*?)<\/div>/i);
    const serviceStatus = statusM ? stripTags(statusM[1]) : "";

    const etiM = html.match(/id="ETI"[^>]*>([\s\S]*?)<\/div>/i);
    const currentEtiText = etiM ? stripTags(etiM[1]) : "";
    const currentEti = parseEti(currentEtiText);

    let ref = new Date();
    let refSource = "本機現在時間";
    if (snapshot) {
      ref = snapshot;
      refSource = "MHTML匯出時間";
    } else if (fileMtime) {
      ref = fileMtime;
      refSource = "檔案修改時間";
    }

    const rowRe =
      /<div\s+class="ParameterObject"\s+id="bitHistory\d+"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi;
    const blocks = html.match(rowRe) || [];
    const events = [];

    for (const block of blocks) {
      const etiText = divByClass(block, "ETIColumnValue");
      const ntpText = divByClass(block, "NtwkColumnValue");
      const eventName = divByClass(block, "BHParamColumnValue");
      const severity = divByClass(block, "BHParamStatusColumnValue");
      const service = divByClass(block, "BHOverallStatusColumnValue");
      if (!etiText && !eventName) continue;

      const eti = parseEti(etiText);
      const cls = classify(eventName, severity);

      let deltaHours = null;
      let daysAgo = null;
      if (currentEti && eti) {
        deltaHours = Math.abs(currentEti.totalMinutes - eti.totalMinutes) / 60;
        daysAgo = deltaHours / 24;
      }

      let absolute = null;
      let absSource = "";
      if (ntpText && ntpText !== "N/A") {
        const d = new Date(ntpText);
        if (!Number.isNaN(d.getTime())) {
          absolute = d;
          absSource = "NTP時間";
        }
      }
      if (!absolute && deltaHours != null) {
        absolute = new Date(ref.getTime() - deltaHours * 3600 * 1000);
        absSource = "由參考時間減(目前ETI-事件ETI)";
      }

      events.push({
        kind: cls.kind,
        event: eventName,
        severity,
        service,
        etiText,
        etiHours: eti ? eti.totalHours : null,
        ntpText,
        absolute,
        absSource,
        deltaHours,
        daysAgo,
      });
    }

    events.sort((a, b) => {
      const at = a.absolute ? a.absolute.getTime() : 0;
      const bt = b.absolute ? b.absolute.getTime() : 0;
      if (bt !== at) return bt - at;
      return (b.etiHours || 0) - (a.etiHours || 0);
    });

    const power = events.filter((e) =>
      ["OUTAGE", "RESTORE", "AC"].includes(e.kind)
    );
    const latestPower = power[0] || null;
    const latestOutage = power.find((e) => e.kind === "OUTAGE") || null;
    const latestRestore = power.find((e) => e.kind === "RESTORE") || null;

    const outageStats = computeOutageEpisodes(
      power,
      currentEti ? currentEti.totalHours : null
    );

    // Dynamic identity: prefer TD breadcrumb unit, never assume one fixed radio name
    const displayUnit = selectedUnit || title || "";
    const exportStem = safeStem(
      [selectedUnit, siteParts.length >= 2 ? siteParts[siteParts.length - 2] : ""]
        .filter(Boolean)
        .join("_") || title || "ETI"
    );

    let alert = false;
    const reasons = [];
    if (serviceStatus && !/^(Full\s*Service|Cleared)$/i.test(serviceStatus)) {
      alert = true;
      reasons.push(`ServiceStatus=${serviceStatus}`);
    }
    if (latestPower && latestPower.kind === "OUTAGE") {
      if (latestPower.daysAgo != null && latestPower.daysAgo <= 7) {
        alert = true;
        reasons.push(`unresolved AC outage ~${latestPower.daysAgo.toFixed(2)}d ago`);
      } else if (latestPower.daysAgo == null) {
        alert = true;
        reasons.push("unresolved AC outage");
      }
    }

    return {
      title,
      sitePath,
      selectedUnit,
      displayUnit,
      exportStem,
      tdNodes,
      serviceStatus,
      currentEtiText,
      ref,
      refSource,
      events,
      power,
      outageStats,
      latestOutage,
      latestRestore,
      alert,
      reasons,
      healthTextKey: alert ? "healthAlert" : "healthOk",
    };
  }

  function breadcrumbHtml(sitePath) {
    if (!sitePath) {
      return `<li class="breadcrumb-item active">${esc(window.t("noPath"))}</li>`;
    }
    const parts = sitePath.split(/\s*›\s*/);
    return parts
      .map((p, i) => {
        const active = i === parts.length - 1 ? " active" : "";
        return `<li class="breadcrumb-item${active}">${esc(p)}</li>`;
      })
      .join("");
  }

  function render(report, fileName) {
    lastReport = { ...report, fileName: fileName || report.fileName };
    window.lastEtiReport = lastReport;
    hero.classList.add("d-none");
    results.classList.remove("d-none");
    window.applyStaticI18n();

    const displayName =
      report.displayUnit ||
      report.selectedUnit ||
      report.title ||
      lastReport.fileName ||
      "—";
    const crumb = breadcrumbHtml(report.sitePath);

    els.unit.textContent = displayName;
    els.unitCapture.textContent = displayName;
    els.sitePath.innerHTML = crumb;
    els.sitePathCapture.innerHTML = crumb;

    const healthLabel = window.t(report.alert ? "healthAlert" : "healthOk");
    els.health.textContent = healthLabel;
    els.health.className =
      "badge " + (report.alert ? "bg-danger-lt" : "bg-success-lt");
    const detail =
      report.alert && report.reasons && report.reasons.length
        ? `${healthLabel}: ${report.reasons.join(window.ETI_LANG === "en" ? "; " : "；")}`
        : healthLabel;
    els.healthCapture.textContent = detail;
    els.healthCapture.className =
      "capture-health mb-3" + (report.alert ? " bad" : " text-success");

    els.eti.textContent = report.currentEtiText || window.t("notFound");
    els.status.textContent = report.serviceStatus || window.t("notFound");
    els.ref.textContent = `${fmtLocal(report.ref)} (${report.refSource})`;
    els.count.textContent = `${report.events.length} / ${report.power.length}`;

    const os = report.outageStats || { count: 0, totalHours: 0, hasOngoing: false };
    els.outageCount.textContent = String(os.count);
    let totalTxt = formatDuration(os.totalHours, false);
    if (os.hasOngoing) totalTxt += " " + window.t("outageOngoing");
    els.outageTotal.textContent = totalTxt;

    const chips = report.tdNodes || [];
    if (!chips.length) {
      els.tdChips.innerHTML = `<span class="chip">${esc(window.t("noTd"))}</span>`;
    } else {
      els.tdChips.innerHTML = chips
        .map((name) => {
          const cur =
            report.selectedUnit && name === report.selectedUnit ? " current" : "";
          return `<span class="chip${cur}">${esc(name)}</span>`;
        })
        .join("");
    }

    els.powerBody.innerHTML = report.power.length
      ? report.power
          .map((e, i) => {
            const rowClass =
              e.kind === "OUTAGE" ? "outage" : e.kind === "RESTORE" ? "restore" : "";
            let dur = "—";
            if (e.kind === "OUTAGE" || e.kind === "RESTORE") {
              if (e.episodeHours != null) {
                dur = formatDuration(e.episodeHours, false);
                if (e.episodeOngoing) dur += " *";
              }
            }
            return `<tr class="${rowClass}">
            <td>${i + 1}</td>
            <td>${esc(kindLabel(e.kind))}</td>
            <td>${esc(e.event)}</td>
            <td>${esc(e.severity)}</td>
            <td>${esc(e.service)}</td>
            <td>${esc(e.etiText)}</td>
            <td>${esc(fmtLocal(e.absolute))}</td>
            <td>${esc(dur)}</td>
            <td>${esc(formatDaysAgo(e.deltaHours))}</td>
          </tr>`;
          })
          .join("")
      : `<tr><td colspan="9">${esc(window.t("noPower"))}</td></tr>`;

    els.allBody.innerHTML = report.events
      .map((e, i) => {
        const rowClass =
          e.kind === "OUTAGE" ? "outage" : e.kind === "RESTORE" ? "restore" : "";
        const days = e.daysAgo != null ? e.daysAgo.toFixed(2) : "N/A";
        return `<tr class="${rowClass}">
          <td>${i + 1}</td>
          <td>${esc(kindLabel(e.kind))}</td>
          <td>${esc(e.event)}</td>
          <td>${esc(e.severity)}</td>
          <td>${esc(e.service)}</td>
          <td>${esc(e.etiText)}</td>
          <td>${esc(e.ntpText)}</td>
          <td>${esc(fmtLocal(e.absolute))}</td>
          <td>${esc(days)}</td>
        </tr>`;
      })
      .join("");
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  async function handleFile(file) {
    clearError();
    try {
      const text = await file.text();
      const extracted = extractHtml({
        text,
        nameHint: file.name,
        mtime: file.lastModified ? new Date(file.lastModified) : null,
      });
      const report = analyze(extracted.html, extracted.snapshot, extracted.fileMtime);
      if (!report.events.length && !report.currentEtiText) {
        throw new Error(window.t("parseFail"));
      }
      render(report, file.name);
      showToast(window.t("done"));
    } catch (err) {
      showError(err.message || String(err));
    }
  }

  function downloadBlob(filename, mime, content) {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function baseName() {
    // Prefer dynamic TD/unit stem from page breadcrumb — not a fixed radio name
    if (lastReport && lastReport.exportStem) return lastReport.exportStem;
    if (lastReport && lastReport.selectedUnit) {
      return safeStem(lastReport.selectedUnit) || "ETI";
    }
    const n = (lastReport && lastReport.fileName) || "ETI";
    return safeStem(n.replace(/\.(mhtml|mht|html|htm)$/i, "")) || "ETI";
  }

  function exportCsv() {
    if (!lastReport) return;
    const lines = [
      "Unit,SitePath,Type,Event,Severity,Service,ETI,NTP,DateTime,DurationHours,DaysAgo,DeltaHours",
    ];
    for (const e of lastReport.events) {
      lines.push(
        [
          lastReport.selectedUnit || lastReport.displayUnit || "",
          lastReport.sitePath || "",
          kindLabel(e.kind),
          e.event,
          e.severity,
          e.service,
          e.etiText,
          e.ntpText,
          fmtLocal(e.absolute),
          e.episodeHours != null ? e.episodeHours.toFixed(4) : "",
          e.daysAgo != null ? e.daysAgo.toFixed(4) : "",
          e.deltaHours != null ? e.deltaHours.toFixed(4) : "",
        ]
          .map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`)
          .join(",")
      );
    }
    downloadBlob(
      `${baseName()}_elapsed.csv`,
      "text/csv;charset=utf-8",
      "\ufeff" + lines.join("\r\n")
    );
    showToast(window.t("csvDone"));
  }

  async function exportPng() {
    if (!lastReport) return;
    showToast(window.t("analyzing"));
    try {
      let canvas;
      try {
        const node = document.getElementById("captureArea");
        canvas = await domToCanvas(node);
      } catch (_) {
        canvas = paintReportCanvas(lastReport);
      }
      canvas.toBlob((blob) => {
        if (!blob) {
          showError(window.t("cannotPng"));
          return;
        }
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${baseName()}_elapsed.png`;
        a.click();
        URL.revokeObjectURL(a.href);
        showToast(window.t("pngDone"));
      }, "image/png");
    } catch (err) {
      try {
        const canvas = paintReportCanvas(lastReport);
        canvas.toBlob((blob) => {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `${baseName()}_elapsed.png`;
          a.click();
          URL.revokeObjectURL(a.href);
          showToast(window.t("pngDone"));
        }, "image/png");
      } catch (err2) {
        showError(window.t("pngFail") + (err2.message || String(err2)));
      }
    }
  }

  function paintReportCanvas(r) {
    const rows = r.power.length ? r.power : r.events.slice(0, 20);
    const lineH = 24;
    const pad = 28;
    const width = 1400;
    const headerH = 200;
    const height = headerH + 40 + (rows.length + 2) * lineH + 80;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = Math.max(height, 480);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#656d76";
    ctx.font = "13px Segoe UI, Microsoft JhengHei, sans-serif";
    ctx.fillText(window.t("reportTitle"), pad, 32);

    ctx.fillStyle = "#656d76";
    ctx.font = "14px Segoe UI, Microsoft JhengHei, sans-serif";
    ctx.fillText((r.sitePath || window.t("noPath")).replace(/›/g, "/"), pad, 58);

    ctx.fillStyle = "#1f2328";
    ctx.font = "600 28px Segoe UI, Microsoft JhengHei, sans-serif";
    ctx.fillText(r.selectedUnit || r.title || r.fileName || "—", pad, 96);

    ctx.fillStyle = r.alert ? "#cf222e" : "#1a7f37";
    ctx.font = "14px Segoe UI, Microsoft JhengHei, sans-serif";
    ctx.fillText(window.t(r.alert ? "healthAlert" : "healthOk"), pad, 124);

    ctx.fillStyle = "#1f2328";
    ctx.font = "13px Consolas, monospace";
    const os = r.outageStats || { count: 0, totalHours: 0, hasOngoing: false };
    ctx.fillText(
      `ETI ${r.currentEtiText || "—"}  |  ${r.serviceStatus || "—"}  |  outages ${os.count}  |  total ${formatDuration(os.totalHours, false)}`,
      pad,
      154
    );
    ctx.fillStyle = "#656d76";
    ctx.fillText(`${fmtLocal(r.ref)} (${r.refSource})  |  ${r.sitePath || ""}`, pad, 176);

    let y = headerH;
    ctx.fillStyle = "#1f2328";
    ctx.font = "600 16px Segoe UI, Microsoft JhengHei, sans-serif";
    ctx.fillText(r.power.length ? window.t("sectionPower") : window.t("sectionAll"), pad, y);
    y += 28;

    const cols = ["序", "類型", "事件", "嚴重度", "ETI", "日期時間", "距今"];
    const xs = [pad, pad + 50, pad + 120, pad + 220, pad + 380, pad + 500, pad + 720];
    ctx.fillStyle = "#656d76";
    ctx.font = "12px Segoe UI, Microsoft JhengHei, sans-serif";
    cols.forEach((c, i) => ctx.fillText(c, xs[i], y));
    y += 8;
    ctx.strokeStyle = "#d0d7de";
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(width - pad, y);
    ctx.stroke();
    y += 20;

    rows.forEach((e, idx) => {
      if (e.kind === "OUTAGE") ctx.fillStyle = "#ffebe9";
      else if (e.kind === "RESTORE") ctx.fillStyle = "#dafbe1";
      else ctx.fillStyle = "transparent";
      if (e.kind === "OUTAGE" || e.kind === "RESTORE") {
        ctx.fillRect(pad - 6, y - 14, width - pad * 2 + 12, lineH);
      }
      ctx.fillStyle = "#1f2328";
      ctx.font = "13px Consolas, Microsoft JhengHei, monospace";
      const cells = [
        String(idx + 1),
        kindLabel(e.kind),
        e.event,
        e.severity,
        e.etiText,
        fmtLocal(e.absolute),
        e.daysAgo != null
          ? e.daysAgo.toFixed(2) + (window.ETI_LANG === "en" ? " d" : " 天")
          : formatDaysAgo(e.deltaHours),
      ];
      cells.forEach((c, i) => ctx.fillText(String(c || ""), xs[i], y));
      y += lineH;
    });

    ctx.fillStyle = "#656d76";
    ctx.font = "12px Segoe UI, Microsoft JhengHei, sans-serif";
    ctx.fillText("紅底=斷電　綠底=復電　公式：(目前ETI−事件ETI)/24", pad, canvas.height - 24);
    return canvas;
  }

  async function domToCanvas(el) {
    const width = Math.ceil(el.scrollWidth);
    const height = Math.ceil(el.scrollHeight);
    const scale = Math.min(2, window.devicePixelRatio || 1.5);

    // Clone with computed look into isolated HTML for SVG foreignObject
    const clone = el.cloneNode(true);
    clone.querySelectorAll(".table-wrap").forEach((w) => {
      w.style.overflow = "visible";
    });
    const cssText = collectCaptureCss();
    const xhtml = new XMLSerializer().serializeToString(clone);
    const svg =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
      `<foreignObject width="100%" height="100%">` +
      `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;background:#ffffff;color:#1f2328;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Microsoft JhengHei',sans-serif;padding:16px;box-sizing:border-box;">` +
      `<style>${cssText}</style>${xhtml}</div></foreignObject></svg>`;

    const url = URL.createObjectURL(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
    );
    try {
      const img = await loadImage(url);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(width * scale));
      canvas.height = Math.max(1, Math.floor(height * scale));
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      return canvas;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("SVG 轉圖片失敗"));
      img.src = url;
    });
  }

  function collectCaptureCss() {
    return `
      *{box-sizing:border-box}
      body,div,p,h2,h3,table,span{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft JhengHei",sans-serif}
      .capture-brand{display:block;font-size:12px;color:#656d76;margin-bottom:8px}
      .breadcrumb,.capture-path{color:#656d76;font-size:13px;margin:0 0 4px}
      .breadcrumb .sep{margin:0 4px;color:#818b98}
      .unit-title,.capture-unit{font-size:24px;font-weight:600;margin:0 0 8px;color:#1f2328}
      .capture-health{color:#1a7f37;margin:0 0 14px;font-size:13px}
      .capture-health.bad{color:#cf222e}
      .metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:0 0 16px}
      .metric{padding:10px 12px;background:#fff;border:1px solid #d0d7de;border-radius:6px}
      .metric .k{display:block;color:#656d76;font-size:12px;margin-bottom:4px}
      .metric .v{font-family:ui-monospace,Consolas,monospace;font-size:12px;color:#1f2328;word-break:break-word}
      .section-head{color:#1f2328;font-size:16px;font-weight:600;margin:18px 0 8px}
      .chip-wrap{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
      .chip{border:1px solid #d0d7de;padding:0 8px;line-height:20px;font-family:ui-monospace,Consolas,monospace;font-size:12px;border-radius:2em;background:#f6f8fa;color:#1f2328}
      .chip.current{border-color:#54aeff;color:#0550ae;background:#ddf4ff}
      .table-wrap{overflow:visible;border:1px solid #d0d7de;border-radius:6px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border-bottom:1px solid #d8dee4;padding:8px 10px;text-align:left;vertical-align:top;color:#1f2328}
      th{background:#f6f8fa;font-weight:600}
      tr.outage td{background:#ffebe9}
      tr.restore td{background:#dafbe1}
      .legend{color:#656d76;font-size:12px}
    `;
  }

  function exportWord() {
    if (!lastReport) return;
    const r = lastReport;
    const powerRows = r.power
      .map((e, i) => {
        const bg =
          e.kind === "OUTAGE"
            ? ' style="background:#FCE4D6"'
            : e.kind === "RESTORE"
              ? ' style="background:#E2EFDA"'
              : "";
        return `<tr${bg}><td>${i + 1}</td><td>${esc(kindLabel(e.kind))}</td><td>${esc(e.event)}</td><td>${esc(e.severity)}</td><td>${esc(e.service)}</td><td>${esc(e.etiText)}</td><td>${esc(fmtLocal(e.absolute))}</td><td>${esc(formatDaysAgo(e.deltaHours))}</td></tr>`;
      })
      .join("");
    const allRows = r.events
      .map((e, i) => {
        const bg =
          e.kind === "OUTAGE"
            ? ' style="background:#FCE4D6"'
            : e.kind === "RESTORE"
              ? ' style="background:#E2EFDA"'
              : "";
        const days = e.daysAgo != null ? e.daysAgo.toFixed(2) : "N/A";
        return `<tr${bg}><td>${i + 1}</td><td>${esc(kindLabel(e.kind))}</td><td>${esc(e.event)}</td><td>${esc(e.severity)}</td><td>${esc(e.service)}</td><td>${esc(e.etiText)}</td><td>${esc(e.ntpText)}</td><td>${esc(fmtLocal(e.absolute))}</td><td>${esc(days)}</td></tr>`;
      })
      .join("");

    const healthTxt = window.t(r.alert ? "healthAlert" : "healthOk");
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>ETI</title>
<style>
body{font-family:"Microsoft JhengHei","Segoe UI",Arial;font-size:11pt}
table{border-collapse:collapse;width:100%;margin:8pt 0}
th,td{border:1px solid #333;padding:4pt 6pt}
th{background:#D9E2F3}
</style></head><body>
<h1>${esc(window.t("reportTitle"))}</h1>
<table>
<tr><th>Path / TD</th><td>${esc(r.sitePath || "—")}</td></tr>
<tr><th>Unit</th><td>${esc(r.selectedUnit || r.displayUnit || r.title || r.fileName)}</td></tr>
<tr><th>ETI</th><td>${esc(r.currentEtiText)}</td></tr>
<tr><th>Status</th><td>${esc(r.serviceStatus)}</td></tr>
<tr><th>${esc(window.t("metricOutageCount"))}</th><td>${esc(String((r.outageStats && r.outageStats.count) || 0))}</td></tr>
<tr><th>${esc(window.t("metricOutageTotal"))}</th><td>${esc(formatDuration((r.outageStats && r.outageStats.totalHours) || 0, false))}${(r.outageStats && r.outageStats.hasOngoing) ? " " + esc(window.t("outageOngoing")) : ""}</td></tr>
<tr><th>Ref</th><td>${esc(fmtLocal(r.ref))} (${esc(r.refSource)})</td></tr>
<tr><th>Health</th><td>${esc(healthTxt)}</td></tr>
</table>
<h2>${esc(window.t("sectionPower"))}</h2>
<table>
<tr><th>#</th><th>Type</th><th>Event</th><th>Severity</th><th>Service</th><th>ETI</th><th>Time</th><th>Ago</th></tr>
${powerRows || `<tr><td colspan=8>${esc(window.t("noPower"))}</td></tr>`}
</table>
<h2>${esc(window.t("sectionAll"))}</h2>
<table>
<tr><th>#</th><th>Type</th><th>Event</th><th>Severity</th><th>Service</th><th>ETI</th><th>NTP</th><th>Time</th><th>Days</th></tr>
${allRows}
</table>
<p>${esc(window.t("legend"))}</p>
</body></html>`;

    downloadBlob(
      `${baseName()}_elapsed.doc`,
      "application/msword;charset=utf-8",
      "\ufeff" + html
    );
    showToast(window.t("wordDone"));
  }

  // events
  drop.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  ["dragenter", "dragover"].forEach((ev) => {
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.add("is-drag");
    });
  });
  ["dragleave", "drop"].forEach((ev) => {
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.remove("is-drag");
    });
  });
  drop.addEventListener("drop", (e) => {
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handleFile(f);
  });

  document.getElementById("btnCsv").addEventListener("click", exportCsv);
  document.getElementById("btnWord").addEventListener("click", exportWord);
  document.getElementById("btnPng").addEventListener("click", exportPng);
  document.getElementById("btnAgain").addEventListener("click", () => {
    results.classList.add("d-none");
    hero.classList.remove("d-none");
    fileInput.value = "";
    lastReport = null;
    clearError();
    window.applyStaticI18n();
  });

  document.getElementById("langToggle").addEventListener("click", () => {
    window.setLang(window.ETI_LANG === "zh" ? "en" : "zh");
  });

  const helpPanel = document.getElementById("helpPanel");
  const btnHelp = document.getElementById("btnHelp");
  if (btnHelp && helpPanel) {
    btnHelp.addEventListener("click", () => {
      helpPanel.open = !helpPanel.open;
      btnHelp.setAttribute("aria-expanded", helpPanel.open ? "true" : "false");
      if (helpPanel.open) {
        helpPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
    helpPanel.addEventListener("toggle", () => {
      btnHelp.setAttribute("aria-expanded", helpPanel.open ? "true" : "false");
    });
  }

  window.onLangChange = () => {
    if (lastReport) render(lastReport, lastReport.fileName);
  };

  const btnDemo = document.getElementById("btnDemo");
  if (btnDemo) {
    btnDemo.addEventListener("click", async () => {
      clearError();
      try {
        const res = await fetch("sample.mhtml");
        if (!res.ok) throw new Error(window.t("missingDemo"));
        const text = await res.text();
        const blob = new Blob([text], { type: "message/rfc822" });
        const file = new File([blob], "MARC SERVER.mhtml", {
          type: "message/rfc822",
          lastModified: Date.now(),
        });
        await handleFile(file);
      } catch (err) {
        showError((err && err.message) || window.t("missingDemo"));
      }
    });
  }

  window.applyStaticI18n();
})();
