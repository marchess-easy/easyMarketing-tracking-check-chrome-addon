// Popup Script

let currentTabId    = null;
let dlLoaded        = false;

document.addEventListener('DOMContentLoaded', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) currentTabId = tabs[0].id;
  });

  loadTracking();

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
});

function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === name)
  );
  document.querySelectorAll('.tab-panel').forEach(p =>
    p.classList.toggle('active', p.id === `panel-${name}`)
  );
  if (name === 'datalayer' && !dlLoaded) {
    dlLoaded = true;
    loadDataLayer();
  }
}

// ── Tracking Tab ──────────────────────────────────────────────────────────────

function loadTracking() {
  chrome.runtime.sendMessage({ action: 'getRequests' }, (response) => {
    const container = document.getElementById('tracking-content');

    if (chrome.runtime.lastError || !response) {
      container.innerHTML = `
        <div class="empty-card">
          <div class="empty-icon">⚠️</div>
          <div class="empty-title">Verbindungsfehler</div>
          <div class="empty-sub">Bitte Extension neu laden unter chrome://extensions/</div>
        </div>`;
      return;
    }

    const { requests = [], tms = {} } = response;

    if (requests.length === 0) {
      container.innerHTML = `
        <div class="empty-card">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">Keine Tracking-Aufrufe gefunden</div>
          <div class="empty-sub">Diese Seite verwendet kein EATMS-Tracking</div>
          <div class="empty-list">
            <div class="empty-item"><span class="dot dot-eatms"></span>EATMS Scripts</div>
            <div class="empty-item"><span class="dot dot-cless"></span>Cless / Counter (9xxxxx, 8xxxxx)</div>
            <div class="empty-item"><span class="dot dot-secondary"></span>Nachgeladene JS-Dateien</div>
          </div>
        </div>`;
      return;
    }

    const eatmsRequests        = requests.filter(r => r.type === 'eatms');
    const clessCounterRequests = requests.filter(r => r.type === 'cless-counter');
    const secondaryScripts     = requests.filter(r => r.type === 'secondary-script');

    let html = `
      <div class="stats-grid">
        <div class="stat-card s-eatms">
          <div class="stat-num">${eatmsRequests.length}</div>
          <div class="stat-lbl">EATMS</div>
        </div>
        <div class="stat-card s-cless">
          <div class="stat-num">${clessCounterRequests.length}</div>
          <div class="stat-lbl">Cless/Counter</div>
        </div>
        <div class="stat-card s-secondary">
          <div class="stat-num">${secondaryScripts.length}</div>
          <div class="stat-lbl">Nachgeladen</div>
        </div>
        <div class="stat-card s-total">
          <div class="stat-num">${requests.length}</div>
          <div class="stat-lbl">Gesamt</div>
        </div>
      </div>`;

    // TMS-Bar: nur anzeigen wenn etwas erkannt wurde
    if (tms.gtm || tms.tealium) {
      html += `<div class="tms-bar">
        <span class="tms-bar-label">TMS</span>`;
      if (tms.gtm) {
        html += `<span class="bdg bdg-gtm">GTM · ${escapeHtml(tms.gtm)}</span>`;
      }
      if (tms.tealium) {
        const label = typeof tms.tealium === 'string' ? tms.tealium : 'Tealium iQ';
        html += `<span class="bdg bdg-tealium">${escapeHtml(label)}</span>`;
      }
      html += `</div>`;
    }

    if (eatmsRequests.length > 0) {
      html += `<div class="section-label sl-eatms">EATMS</div>`;
      eatmsRequests.forEach(req => { html += renderEatmsRequest(req, tms); });
    }

    if (clessCounterRequests.length > 0) {
      html += `<div class="section-label sl-cless">Cless / Counter</div>`;
      clessCounterRequests.forEach(req => { html += renderClessCounterRequest(req); });
    }

    if (secondaryScripts.length > 0) {
      html += `<div class="section-label sl-secondary">Nachgeladene Scripts</div>`;
      secondaryScripts.forEach(req => { html += renderSecondaryScript(req); });
    }

    container.innerHTML = html;
  });
}

function renderEatmsRequest(req, tms) {
  const paramCount = Object.keys(req.params).length;
  const timestamp  = new Date(req.timestamp).toLocaleString('de-DE');

  let tmsBadges = '';
  if (tms.gtm) {
    tmsBadges += `<span class="bdg bdg-gtm">via GTM · ${escapeHtml(tms.gtm)}</span>`;
  }
  if (tms.tealium) {
    const label = typeof tms.tealium === 'string' ? tms.tealium : 'Tealium iQ';
    tmsBadges += `<span class="bdg bdg-tealium">via ${escapeHtml(label)}</span>`;
  }

  let html = `
    <div class="req-card eatms">
      <div class="req-head">
        <span class="req-domain">${escapeHtml(req.domain)}</span>
        <span class="bdg bdg-eatms">EATMS</span>
        ${tmsBadges}
        <span class="bdg bdg-count">${paramCount} Param${paramCount !== 1 ? 's' : ''}</span>
      </div>
      <div class="req-time">⏱ ${timestamp}</div>`;

  if (paramCount > 0) {
    html += `<div class="p-table"><div class="p-head">Parameter</div>`;
    for (const [key, value] of Object.entries(req.params)) {
      html += `
        <div class="p-row">
          <div class="p-key">${escapeHtml(key)}</div>
          <div class="p-val">${escapeHtml(value)}</div>
        </div>`;
    }
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

function renderClessCounterRequest(req) {
  const timestamp  = new Date(req.timestamp).toLocaleString('de-DE');
  const typeLabel  = req.scriptType.toUpperCase();
  const consentCls = req.consentStatus === 'vor Consent' ? 'vor' : 'nach';

  let html = `
    <div class="req-card cless-counter">
      <div class="req-head">
        <span class="req-domain">${escapeHtml(req.domain)}</span>
        <span class="bdg bdg-${escapeHtml(req.scriptType)}">${escapeHtml(typeLabel)}</span>
        <span class="bdg bdg-${consentCls}">${escapeHtml(req.consentStatus)}</span>
        ${req.loadedByEatms ? `<span class="bdg bdg-via">via EATMS</span>` : ''}
      </div>
      <div class="req-time">⏱ ${timestamp}</div>
      <div class="p-table">
        <div class="p-head">Details</div>
        <div class="p-row">
          <div class="p-key">Script-ID</div>
          <div class="p-val">${escapeHtml(req.scriptId)}</div>
        </div>
        <div class="p-row">
          <div class="p-key">URL</div>
          <div class="p-val">${escapeHtml(req.url)}</div>
        </div>
      </div>
    </div>`;

  return html;
}

function renderSecondaryScript(req) {
  const timestamp = new Date(req.timestamp).toLocaleString('de-DE');

  return `
    <div class="req-card secondary-script">
      <div class="req-head">
        <span class="req-domain">${escapeHtml(req.domain)}</span>
        <span class="bdg bdg-secondary">Nachgeladen</span>
        <span class="bdg bdg-via">via EATMS</span>
      </div>
      <div class="req-time">⏱ ${timestamp}</div>
      <div class="p-table">
        <div class="p-head">Details</div>
        <div class="p-row">
          <div class="p-key">Dateiname</div>
          <div class="p-val">${escapeHtml(req.filename)}</div>
        </div>
        <div class="p-row">
          <div class="p-key">URL</div>
          <div class="p-val">${escapeHtml(req.url)}</div>
        </div>
      </div>
    </div>`;
}

// ── DataLayer Tab ─────────────────────────────────────────────────────────────

function loadDataLayer() {
  const container = document.getElementById('dl-content');
  container.innerHTML = `
    <div class="empty-card">
      <div class="empty-icon">⏳</div>
      <div class="empty-title">Wird geladen…</div>
    </div>`;

  if (!currentTabId) {
    renderDataLayer(null, container);
    return;
  }

  chrome.scripting.executeScript(
    {
      target: { tabId: currentTabId },
      world: 'MAIN',
      func: () => {
        try {
          const dl = window.dataLayer;
          if (!dl || !Array.isArray(dl)) return null;
          return JSON.parse(JSON.stringify(dl, (key, val) => {
            if (typeof val === 'function') return '[Function]';
            if (val && typeof val === 'object' && val.nodeType) return '[DOMElement]';
            return val;
          }));
        } catch (e) {
          return { _error: e.message };
        }
      }
    },
    (results) => {
      const result = (results && results[0]) ? results[0].result : null;
      renderDataLayer(result, container);
    }
  );
}

function renderDataLayer(events, container) {
  if (!container) container = document.getElementById('dl-content');

  const refreshBtn = `
    <div class="dl-toolbar">
      <span class="dl-info" id="dl-info"></span>
      <button class="dl-refresh-btn" id="dl-refresh-btn">↺ Neu laden</button>
    </div>`;

  if (!events || events._error) {
    const msg = events && events._error ? events._error : 'Kein dataLayer gefunden';
    container.innerHTML = refreshBtn + `
      <div class="empty-card">
        <div class="empty-icon">📋</div>
        <div class="empty-title">dataLayer nicht verfügbar</div>
        <div class="empty-sub">${escapeHtml(msg)}</div>
      </div>`;
    bindRefresh(container);
    return;
  }

  if (events.length === 0) {
    container.innerHTML = refreshBtn + `
      <div class="empty-card">
        <div class="empty-icon">📋</div>
        <div class="empty-title">dataLayer ist leer</div>
        <div class="empty-sub">Noch keine Events gepusht</div>
      </div>`;
    bindRefresh(container);
    return;
  }

  const ecCount = events.filter(e => e.ecommerce && Object.keys(e.ecommerce).length > 0).length;

  let html = refreshBtn;

  events.forEach((event, idx) => {
    const hasEc    = event.ecommerce && Object.keys(event.ecommerce).length > 0;
    const keys     = Object.keys(event).filter(k => k !== 'gtm.uniqueEventId');
    const name     = event.event || (keys.length ? keys.slice(0, 2).join(', ') : '(leer)');
    const fullJson = JSON.stringify(event, null, 2);
    const ecJson   = hasEc ? JSON.stringify(event.ecommerce, null, 2) : null;

    html += `
      <details class="dl-event ${hasEc ? 'has-ec' : ''}" ${hasEc ? 'open' : ''}>
        <summary>
          <span class="dl-arrow">▶</span>
          <span class="dl-idx">#${idx}</span>
          <span class="dl-name">${escapeHtml(name)}</span>
          ${hasEc ? `<span class="bdg bdg-ec">Ecommerce</span>` : ''}
        </summary>
        <div class="dl-body">`;

    if (hasEc) {
      html += `
          <div class="dl-ec-block">
            <div class="dl-ec-head">Ecommerce Objekt</div>
            <pre class="dl-json">${syntaxHighlight(ecJson)}</pre>
          </div>`;
    }

    html += `
          <pre class="dl-json">${syntaxHighlight(fullJson)}</pre>
        </div>
      </details>`;
  });

  container.innerHTML = html;

  // Info-Zeile setzen
  const info = container.querySelector('#dl-info');
  if (info) {
    info.textContent = `${events.length} Events${ecCount > 0 ? ` · ${ecCount} mit Ecommerce` : ''}`;
  }

  bindRefresh(container);
}

function bindRefresh(container) {
  const btn = container.querySelector('#dl-refresh-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      dlLoaded = false;
      dlLoaded = true;
      loadDataLayer();
    });
  }
}

// ── Hilfsfunktion ─────────────────────────────────────────────────────────────

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function syntaxHighlight(json) {
  // HTML-escape first, then apply syntax classes
  const safe = String(json)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return safe.replace(
    /("(?:\\u[0-9a-fA-F]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false)\b|\bnull\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      if (/^"/.test(match)) {
        return /:$/.test(match)
          ? `<span class="json-key">${match}</span>`
          : `<span class="json-str">${match}</span>`;
      }
      if (/true|false/.test(match)) return `<span class="json-bool">${match}</span>`;
      if (/null/.test(match))       return `<span class="json-null">${match}</span>`;
      return `<span class="json-num">${match}</span>`;
    }
  );
}
