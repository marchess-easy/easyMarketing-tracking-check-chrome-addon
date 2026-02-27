// Background Service Worker für das Tracking Monitor Extension

let trackedRequests = new Map(); // Speichert Requests pro Tab
let eatmsLoadedTabs = new Map(); // Speichert wann EATMS geladen wurde pro Tab
let tmsDetectedTabs = new Map(); // Speichert erkannte TMS (GTM, Tealium) pro Tab

// ── Session Storage Persistenz ────────────────────────────────────────────────

async function initFromStorage() {
  try {
    const data = await chrome.storage.session.get(['trackedRequests', 'eatmsLoadedTabs', 'tmsDetectedTabs']);
    if (data.trackedRequests) {
      for (const [tabId, requests] of Object.entries(data.trackedRequests)) {
        trackedRequests.set(parseInt(tabId), requests);
      }
    }
    if (data.eatmsLoadedTabs) {
      for (const [tabId, timestamp] of Object.entries(data.eatmsLoadedTabs)) {
        eatmsLoadedTabs.set(parseInt(tabId), timestamp);
      }
    }
    if (data.tmsDetectedTabs) {
      for (const [tabId, tms] of Object.entries(data.tmsDetectedTabs)) {
        tmsDetectedTabs.set(parseInt(tabId), tms);
      }
    }
  } catch (e) {
    console.error('Fehler beim Laden aus Session Storage:', e);
  }
}

async function persistToStorage() {
  try {
    const trackedObj = {};
    for (const [tabId, requests] of trackedRequests.entries()) {
      trackedObj[tabId] = requests;
    }
    const eatmsObj = {};
    for (const [tabId, timestamp] of eatmsLoadedTabs.entries()) {
      eatmsObj[tabId] = timestamp;
    }
    const tmsObj = {};
    for (const [tabId, tms] of tmsDetectedTabs.entries()) {
      tmsObj[tabId] = tms;
    }
    await chrome.storage.session.set({
      trackedRequests: trackedObj,
      eatmsLoadedTabs: eatmsObj,
      tmsDetectedTabs: tmsObj
    });
  } catch (e) {
    console.error('Fehler beim Speichern in Session Storage:', e);
  }
}

initFromStorage();

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

function isClessCounterScript(url) {
  return /https:\/\/data\.min-cdn\.net\/(cless|counter)\/[89]\d{5}\.js/.test(url);
}

function parseClessCounter(url) {
  const match = url.match(/https:\/\/data\.min-cdn\.net\/(cless|counter)\/([89]\d{5})\.js/);
  if (match) {
    const type = match[1];
    const id = match[2];
    return { type, id, consentStatus: id.startsWith('9') ? 'vor Consent' : 'nach Consent' };
  }
  return null;
}

function isLikelyEatmsLoaded(tabId, scriptTimestamp) {
  const eatmsTime = eatmsLoadedTabs.get(tabId);
  if (!eatmsTime) return false;
  const timeDiff = scriptTimestamp - eatmsTime;
  return timeDiff > 100 && timeDiff < 5000;
}

function isJavaScriptFile(url) {
  try {
    return new URL(url).pathname.endsWith('.js');
  } catch {
    return false;
  }
}

// ── TMS Detection ─────────────────────────────────────────────────────────────

function detectTms(url, tabId) {
  let changed = false;
  const tms = tmsDetectedTabs.get(tabId) || {};

  try {
    const u = new URL(url);

    // Google Tag Manager: www.googletagmanager.com/gtm.js?id=GTM-XXXXX
    if (!tms.gtm && u.hostname === 'www.googletagmanager.com' && u.pathname === '/gtm.js') {
      tms.gtm = u.searchParams.get('id') || 'GTM';
      changed = true;
    }

    // Tealium iQ: tags.tiqcdn.com/utag/...
    if (!tms.tealium && u.hostname === 'tags.tiqcdn.com') {
      // Pfad: /utag/<account>/<profile>/<env>/utag.js
      const parts = u.pathname.split('/').filter(Boolean);
      tms.tealium = parts.length >= 3
        ? `${parts[1]}/${parts[2]}`  // account/profile
        : true;
      changed = true;
    }
  } catch {}

  if (changed) {
    tmsDetectedTabs.set(tabId, tms);
  }
  return changed;
}

// ── Web Request Listener ──────────────────────────────────────────────────────

chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (!details.tabId || details.tabId <= 0) return;

    const timestamp = Date.now();
    const tmsChanged = detectTms(details.url, details.tabId);
    let requestInfo = null;

    if (details.url.includes('/trck/etms/eatms.js')) {
      console.log('EATMS Request erkannt:', details.url);
      eatmsLoadedTabs.set(details.tabId, timestamp);

      const url = new URL(details.url);
      const params = {};
      for (const [key, value] of url.searchParams.entries()) {
        params[key] = value;
      }

      requestInfo = {
        type: 'eatms',
        url: details.url,
        domain: url.hostname,
        params,
        timestamp: new Date(timestamp).toISOString()
      };
    }
    else if (isClessCounterScript(details.url)) {
      console.log('Cless/Counter Request erkannt:', details.url);
      const clessInfo = parseClessCounter(details.url);

      requestInfo = {
        type: 'cless-counter',
        url: details.url,
        domain: 'data.min-cdn.net',
        scriptType: clessInfo.type,
        scriptId: clessInfo.id,
        consentStatus: clessInfo.consentStatus,
        loadedByEatms: isLikelyEatmsLoaded(details.tabId, timestamp),
        timestamp: new Date(timestamp).toISOString()
      };
    }
    else if (isJavaScriptFile(details.url) && isLikelyEatmsLoaded(details.tabId, timestamp)) {
      console.log('Nachgeladenes Script erkannt:', details.url);
      const url = new URL(details.url);

      requestInfo = {
        type: 'secondary-script',
        url: details.url,
        domain: url.hostname,
        filename: url.pathname.split('/').pop(),
        loadedByEatms: true,
        timestamp: new Date(timestamp).toISOString()
      };
    }

    if (requestInfo) {
      if (!trackedRequests.has(details.tabId)) {
        trackedRequests.set(details.tabId, []);
      }
      trackedRequests.get(details.tabId).push(requestInfo);
      updateBadge(details.tabId);
      persistToStorage();
    } else if (tmsChanged) {
      persistToStorage();
    }
  },
  { urls: ["<all_urls>"], types: ["script"] }
);

// ── Badge ─────────────────────────────────────────────────────────────────────

function updateBadge(tabId) {
  const count = (trackedRequests.get(tabId) || []).length;
  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString(), tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId });
  } else {
    chrome.action.setBadgeText({ text: '', tabId });
  }
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

chrome.tabs.onRemoved.addListener((tabId) => {
  trackedRequests.delete(tabId);
  eatmsLoadedTabs.delete(tabId);
  tmsDetectedTabs.delete(tabId);
  persistToStorage();
});

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return;
  trackedRequests.delete(details.tabId);
  eatmsLoadedTabs.delete(details.tabId);
  tmsDetectedTabs.delete(details.tabId);
  updateBadge(details.tabId);
  persistToStorage();
});

// ── Message API ───────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getRequests') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const tabId = tabs[0].id;
        sendResponse({
          requests: trackedRequests.get(tabId) || [],
          tms: tmsDetectedTabs.get(tabId) || {}
        });
      } else {
        sendResponse({ requests: [], tms: {} });
      }
    });
    return true;
  }
});
