# easyMarketing Tracking Monitor

Chrome Extension zur Überwachung von EATMS-Tracking-Aufrufen, nachgeladenen Skripten und DataLayer-Inhalten auf beliebigen Webseiten. Entwickelt für Marketing-Verantwortliche und Entwickler, die die korrekte Implementierung des easyMarketing Tracking-Systems auf Kundenwebseiten prüfen möchten.

**Version:** 3.3.0 | **Manifest:** V3 | **Hersteller:** [easyMarketing GmbH](https://easy-m.de)

---

## Installation

Da die Extension nicht im Chrome Web Store veröffentlicht ist, wird sie als Unpacked Extension direkt aus dem Repository geladen.

1. Dieses Repository klonen oder als ZIP herunterladen und entpacken.
2. Google Chrome öffnen und `chrome://extensions/` aufrufen.
3. Oben rechts den **Entwicklermodus** aktivieren.
4. Auf **Entpackte Erweiterung laden** klicken und den Projektordner auswählen.
5. Die Extension erscheint in der Chrome-Toolbar.

Nach Code-Änderungen muss die Extension auf der `chrome://extensions/`-Seite über den Reload-Button neu geladen werden. Da die Extension erweiterte Berechtigungen nutzt (`scripting`, `webNavigation`), fragt Chrome beim ersten Laden nach einer Bestätigung.

---

## Tracking-Tab

### EATMS-Erkennung

Alle Aufrufe des EATMS-Scripts (`/trck/etms/eatms.js`) werden unabhängig von der aufrufenden Domain erkannt. Pro Aufruf werden die aufrufende Domain, alle mitgegebenen GET-Parameter mit ihren Werten sowie der Zeitstempel angezeigt.

### Cless / Counter Scripts

Skripte von `data.min-cdn.net` im Format `cless/` oder `counter/` mit 6-stelliger ID werden als eigener Typ erfasst. Die Extension leitet den Consent-Status direkt aus der Script-ID ab:

- IDs beginnend mit `9` (z. B. `912345.js`) wurden **vor Consent** geladen
- IDs beginnend mit `8` (z. B. `812345.js`) wurden **nach Consent** geladen

Wurde das Skript innerhalb von 5 Sekunden nach einem EATMS-Aufruf auf demselben Tab geladen, wird dies mit einem "via EATMS"-Badge kenntlich gemacht.

### Nachgeladene Scripts

Alle JavaScript-Dateien, die innerhalb von 5 Sekunden nach einem EATMS-Aufruf auf derselben Seite geladen werden, werden als nachgeladene Scripts erfasst. Damit lassen sich Pixel, Analytics-Libraries und sonstige Tracking-Scripts nachverfolgen, die durch EATMS ausgelöst werden. Angezeigt werden Domain, Dateiname und vollständige URL.

### TMS-Erkennung

Die Extension erkennt automatisch, ob auf der aktuellen Seite ein Tag Management System aktiv ist, und zeigt dies sowohl in einer eigenen Leiste als auch direkt auf dem betreffenden EATMS-Aufruf an.

**Google Tag Manager** wird über Requests an `www.googletagmanager.com/gtm.js` erkannt. Die Container-ID (z. B. `GTM-XXXXX`) wird direkt aus dem Request ausgelesen.

**Tealium iQ** wird über Requests an `tags.tiqcdn.com` erkannt. Account und Profil werden aus der URL extrahiert und angezeigt.

### Statistik-Übersicht

Am oberen Rand des Tracking-Tabs wird eine Zusammenfassung mit der Anzahl erkannter EATMS-Aufrufe, Cless/Counter-Scripts, nachgeladener Scripts sowie der Gesamtanzahl dargestellt.

---

## DataLayer-Tab

Der DataLayer-Tab liest den `window.dataLayer` der aktuell geöffneten Seite aus und stellt alle enthaltenen Events strukturiert dar. Der Scan wird beim ersten Öffnen des Tabs automatisch ausgeführt.

### Event-Liste

Jedes DataLayer-Event wird als aufklappbare Karte angezeigt. Der Kopf der Karte zeigt den Event-Namen aus dem `event`-Feld. Events ohne `event`-Feld zeigen stattdessen die enthaltenen Schlüssel als Bezeichnung. Die Gesamtanzahl der Events und die Anzahl der Events mit Ecommerce-Daten werden in der Kopfleiste des Tabs zusammengefasst.

### Ecommerce-Objekte

Events, die ein `ecommerce`-Objekt enthalten, werden farblich hervorgehoben und standardmäßig aufgeklappt angezeigt. Das `ecommerce`-Objekt wird separat vom restlichen Event-Inhalt dargestellt, damit Transaktionsdaten, Produktlisten und andere E-Commerce-Informationen sofort ohne Scrollen sichtbar sind.

### JSON-Ansicht mit Syntax-Highlighting

Der vollständige Inhalt jedes Events wird als formatiertes JSON angezeigt. Schlüssel, String-Werte, Zahlen, boolesche Werte und `null` werden farblich unterschieden, um die Lesbarkeit zu verbessern.

### Neu laden

Ein Neu-laden-Button aktualisiert den DataLayer-Snapshot, ohne das Popup schließen zu müssen. Dies ist nützlich, wenn nach dem Öffnen des Popups weitere Events in den DataLayer gepusht wurden, beispielsweise durch Nutzerinteraktionen auf der Seite.

---

## Datenpersistenz und Datenschutz

Alle erfassten Daten werden ausschliesslich lokal im Browser gespeichert und sind vollständig pro Tab isoliert. Beim Schliessen oder Neu-Laden eines Tabs werden die zugehörigen Daten automatisch gelöscht.

Die Daten werden in `chrome.storage.session` persistiert. Das verhindert Datenverlust durch den automatischen Neustart des Background Service Workers, der in Chrome Manifest V3 nach kurzer Inaktivität ausgelöst werden kann. Mit dem Beenden des Browsers werden alle gespeicherten Daten unwiderruflich gelöscht.

---

## Berechtigungen

| Permission | Verwendung |
|---|---|
| `webRequest` | Netzwerkanfragen der überwachten Seiten auslesen |
| `storage` | Session-Storage für Datenpersistenz über SW-Restarts |
| `tabs` | Aktiven Tab identifizieren |
| `webNavigation` | Seitenwechsel im Hauptframe erkennen und Daten zurücksetzen |
| `scripting` | `window.dataLayer` der aktiven Seite auslesen |
| `<all_urls>` | Tracking-Aufrufe auf allen Domains erkennen |


---

Entwickelt von [easyMarketing GmbH](https://easy-m.de)
