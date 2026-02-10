# kalender_tag

Tageskalender (Day Calendar) - Ein flexibler Stundenkalender für mehrere Mitarbeiter von 6:00 bis 18:00 Uhr.

## Features

- **Stundenbereich**: 6:00 Uhr bis 18:00 Uhr
- **Mehrere Mitarbeiter**: Zeigt mehrere Mitarbeiter in Spalten nebeneinander an
- **Einstellbare Stundenhöhe**: Höhe der Stundeneinteilung über einen Schieberegler anpassbar (30-120px)
- **Ganztagstermine**: Eigener Bereich für ganztägige Termine unter jedem Mitarbeiternamen
- **AJAX Datenabruf**: Mitarbeiterdaten werden dynamisch von `employers_ajax.php` geladen

## Installation & Verwendung

1. Stellen Sie sicher, dass PHP installiert ist
2. Starten Sie den PHP-Entwicklungsserver:
   ```bash
   php -S localhost:8080
   ```
3. Öffnen Sie im Browser: `http://localhost:8080/index.html`

## Dateien

- `index.html` - Hauptseite mit Kalenderansicht
- `style.css` - Styling für den Kalender
- `kalender.js` - JavaScript-Logik (Datenabruf, Rendering, Stundenhöhe)
- `employers_ajax.php` - Backend-Endpunkt für Mitarbeiterdaten

## Anpassung

### Kalender-Einstellungen

Alle Einstellungen werden direkt im JavaScript-Code in der Datei `kalender.js` vorgenommen. Öffnen Sie die Datei und passen Sie die Konfigurationsvariablen am Anfang an:

```javascript
// Configuration - Adjust these values to customize the calendar
const START_HOUR = 6;                // Startzeit (Standard: 6 Uhr)
const END_HOUR = 18;                 // Endzeit (Standard: 18 Uhr)
const HOUR_HEIGHT = 60;              // Höhe der Stundeneinteilung in Pixeln (Standard: 60)
const ALL_DAY_EVENT_HEIGHT = 25;     // Höhe eines einzelnen Ganztagesevents in Pixeln (Standard: 25)
const ALL_DAY_BASE_HEIGHT = 35;      // Basis-Höhe des Ganztagsbereichs (für Label und Padding) in Pixeln (Standard: 35)
const ALL_DAY_EXTRA_SPACING = 15;    // Zusätzlicher Abstand nach Ganztagsbereich bei 3 oder mehr Events in Pixeln (Standard: 15)
const COLUMN_GAP = 0;                // Abstand zwischen den Spalten in Pixeln (Standard: 0)
const EMPLOYER_HEADER_HEIGHT = 60;   // Höhe der Mitarbeiter-Kopfzeile in Pixeln (Standard: 60)
const SESSION_PADDING = 5;           // Abstand der Session-Blöcke von den Spaltenrändern in Pixeln (Standard: 5)
```

**Beispiele:**

- Für größere Stundenhöhe: `const HOUR_HEIGHT = 80;`
- Für höhere Ganztagesevents: `const ALL_DAY_EVENT_HEIGHT = 30;`
- Für mehr Basis-Höhe im Ganztagsbereich: `const ALL_DAY_BASE_HEIGHT = 50;`
- Für mehr Abstand bei vielen Ganztagesevents: `const ALL_DAY_EXTRA_SPACING = 20;`
- Für Abstand zwischen Mitarbeitern: `const COLUMN_GAP = 10;`
- Für schmalere Session-Blöcke: `const SESSION_PADDING = 10;`
- Für breitere Session-Blöcke: `const SESSION_PADDING = 2;`

### Mitarbeiter ändern

Bearbeiten Sie `employers_ajax.php` und passen Sie das `$employers` Array an:

```php
$employers = [
    ['id' => 1, 'name' => 'Max Mustermann'],
    ['id' => 2, 'name' => 'Anna Schmidt'],
    // Weitere Mitarbeiter hinzufügen...
];
```

Nachdem Sie Änderungen vorgenommen haben, laden Sie die Seite im Browser neu, um die Änderungen zu sehen.