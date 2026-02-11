# kalender_tag

Tageskalender (Day Calendar) - Ein flexibler Stundenkalender für mehrere Mitarbeiter von 6:00 bis 18:00 Uhr.

## Features

- **Stundenbereich**: 6:00 Uhr bis 18:00 Uhr
- **Mehrere Mitarbeiter**: Zeigt mehrere Mitarbeiter in Spalten nebeneinander an
- **Einstellbare Stundenhöhe**: Höhe der Stundeneinteilung über einen Schieberegler anpassbar (30-120px)
- **Ganztagstermine**: Eigener Bereich für ganztägige Termine unter jedem Mitarbeiternamen
- **AJAX Datenabruf**: Mitarbeiterdaten werden dynamisch von `employers_ajax.php` geladen
- **Events/Termine**: 
  - Dynamischer Abruf von Terminen über `event_ajax.php`
  - Verschiedene Kategorien mit unterschiedlichen Farben
  - Ganztägige Termine werden im Ganztags-Bereich angezeigt
  - **Mehrere Ganztags-Events werden vertikal gestapelt** (untereinander)
  - Überlappende Termine werden nebeneinander dargestellt
  - Einstellbare Breite über `EVENT_PADDING` Konfiguration
  - Tooltips mit Termindetails

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
- `session_ajax.php` - Backend-Endpunkt für Session-Daten (Anwesenheitszeiten)
- `event_ajax.php` - Backend-Endpunkt für Event-Daten (Termine)

## Anpassung

### Kalender-Einstellungen

Alle Einstellungen werden direkt im JavaScript-Code in der Datei `kalender.js` vorgenommen. Öffnen Sie die Datei und passen Sie die Konfigurationsvariablen am Anfang an:

```javascript
// Configuration - Adjust these values to customize the calendar
const START_HOUR = 6;                // Startzeit (Standard: 6 Uhr)
const END_HOUR = 18;                 // Endzeit (Standard: 18 Uhr)
const HOUR_HEIGHT = 60;              // Höhe der Stundeneinteilung in Pixeln (Standard: 60)
const ALL_DAY_HEIGHT = 60;           // Minimale Höhe des Ganztagstermin-Bereichs in Pixeln (Standard: 60)
const ALL_DAY_EVENT_HEIGHT = 30;     // Höhe jedes einzelnen Ganztags-Events in Pixeln (Standard: 30)
const ALL_DAY_BOTTOM_SPACING = 10;   // Einstellbarer Abstand nach dem letzten Ganztags-Event in Pixeln (Standard: 10)
const COLUMN_GAP = 0;                // Abstand zwischen den Spalten in Pixeln (Standard: 0)
const EMPLOYER_HEADER_HEIGHT = 60;   // Höhe der Mitarbeiter-Kopfzeile in Pixeln (Standard: 60)
const SESSION_PADDING = 5;           // Abstand der Session-Blöcke von den Spaltenrändern in Pixeln (Standard: 5)
const EVENT_PADDING = 2;             // Abstand der Event-Blöcke von den Spaltenrändern in Pixeln (Standard: 2)
```

**Beispiele:**

- Für größere Stundenhöhe: `const HOUR_HEIGHT = 80;`
- Für mehr Platz bei Ganztagsterminen (min): `const ALL_DAY_HEIGHT = 100;`
- Für größere Ganztags-Events: `const ALL_DAY_EVENT_HEIGHT = 40;`
- Für mehr Abstand nach Ganztags-Events: `const ALL_DAY_BOTTOM_SPACING = 20;`
- Für weniger Abstand nach Ganztags-Events: `const ALL_DAY_BOTTOM_SPACING = 5;`
- Für Abstand zwischen Mitarbeitern: `const COLUMN_GAP = 10;`
- Für schmalere Session-Blöcke: `const SESSION_PADDING = 10;`
- Für breitere Session-Blöcke: `const SESSION_PADDING = 2;`
- Für schmalere Event-Blöcke (mehr Abstand): `const EVENT_PADDING = 10;`
- Für breitere Event-Blöcke (weniger Abstand): `const EVENT_PADDING = 1;`

**Hinweis:** Der Ganztags-Bereich passt sich automatisch der Anzahl der Events an. Wenn ein Mitarbeiter z.B. 3 Ganztags-Events hat, wird die Höhe auf `(3 × ALL_DAY_EVENT_HEIGHT) + ALL_DAY_BOTTOM_SPACING` berechnet (aber mindestens `ALL_DAY_HEIGHT`).

### Mitarbeiter ändern

Bearbeiten Sie `employers_ajax.php` und passen Sie das `$employers` Array an:

```php
$employers = [
    ['id' => 1, 'name' => 'Max Mustermann', 'department' => 'Vertrieb', 'color' => '#4a90e2'],
    ['id' => 2, 'name' => 'Anna Schmidt', 'department' => 'Marketing', 'color' => '#e74c3c'],
    // Weitere Mitarbeiter hinzufügen...
];
```

**Hinweis:** Die `color` Eigenschaft bestimmt die Hintergrundfarbe des Mitarbeiter-Headers und kann je nach Abteilung (`department`) angepasst werden.

### Events ändern

Bearbeiten Sie `event_ajax.php` und passen Sie das `$events` Array an:

```php
$events = [
    [
        'id' => 1,
        'employer_id' => 1,           // ID des Mitarbeiters
        'date' => date('Y-m-d'),      // Datum des Termins
        'start_time' => '08:00',      // Startzeit (HH:MM), leer bei Ganztags-Events
        'end_time' => '09:30',        // Endzeit (HH:MM), leer bei Ganztags-Events
        'category' => 'meeting',      // Kategorie (frei wählbar)
        'color' => '#4a90e2',         // Farbe (Hex-Code)
        'is_all_day' => false,        // true für Ganztags-Events
        'title' => 'Team Meeting'     // Titel des Termins
    ],
    // Weitere Termine hinzufügen...
];
```

**Kategoriefarben Beispiele:**
- `#4a90e2` - Blau (Meetings)
- `#e74c3c` - Rot (Appointments)
- `#f39c12` - Orange (Training)
- `#2ecc71` - Grün (Holiday)
- `#9b59b6` - Lila (Planning)
- `#1abc9c` - Türkis (Workshop)

Nachdem Sie Änderungen vorgenommen haben, laden Sie die Seite im Browser neu, um die Änderungen zu sehen.