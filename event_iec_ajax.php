<?php
header('Content-Type: application/json');

// ============================================================
// event_iec_ajax.php – AJAX-Endpunkt für Kalender-Termine
// ============================================================
// DEMO-MODUS (Standard):
//   Termine werden in einem fest codierten In-Memory-Array gespeichert.
//   Alle Schreibvorgänge (Erstellen / Bearbeiten / Löschen) werden
//   validiert und geben Erfolg zurück, aber nichts wird tatsächlich
//   in einer Datenbank gespeichert.
//
// PRODUKTIONSMODUS:
//   1. Datenbank anlegen und das CREATE TABLE-Statement aus
//      event_iec_db.php einmalig ausführen.
//   2. DB_HOST, DB_USER, DB_PASS und DB_NAME in event_iec_db.php
//      auf deine Zugangsdaten anpassen.
//   3. Die require_once-Zeile direkt unterhalb einkommentieren
//      (das Semikolon vor "require_once" entfernen).
//   4. Die vier mit "// Demo-Modus:" markierten Blöcke in dieser
//      Datei durch den jeweils danebenstehenden "// Produktionsmodus:"-
//      Code ersetzen (Kommentarzeichen "//" entfernen).
// ============================================================

// require_once 'event_iec_db.php'; // <-- Zeile einkommentieren für Produktionsmodus

// HINWEIS FÜR DIE PRODUKTIONSUMGEBUNG:
//   - Prüfe vor jeder Anfrage, ob eine gültige Session vorhanden ist.
//   - Stelle sicher, dass der angemeldete Nutzer berechtigt ist,
//     den jeweiligen Termin zu ändern (event.user_id == Session-User
//     oder Administratorrechte).

// ============================================================
// POST – Schreibaktionen (Erstellen / Bearbeiten / Löschen)
// ============================================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = isset($_POST['action']) ? trim($_POST['action']) : '';

    // ----------------------------------------------------------
    // TERMIN ERSTELLEN
    // ----------------------------------------------------------
    if ($action === 'create') {
        // --- Pflichtfelder validieren ---
        $employerId = isset($_POST['employer_id']) ? $_POST['employer_id'] : '';
        $userId     = isset($_POST['user_id'])     ? $_POST['user_id']     : '1';
        $date       = isset($_POST['date'])        ? trim($_POST['date'])  : '';
        $endDate    = isset($_POST['end_date'])     ? trim($_POST['end_date']) : '';
        $title      = isset($_POST['title'])       ? trim($_POST['title']) : '';
        $category   = isset($_POST['category'])    ? trim($_POST['category']) : '';
        $color      = isset($_POST['color'])       ? trim($_POST['color']) : '#4a90e2';
        $isAllDay   = isset($_POST['is_all_day'])  ? (bool)$_POST['is_all_day'] : false;
        $startTime  = isset($_POST['start_time'])  ? trim($_POST['start_time']) : '';
        $endTime    = isset($_POST['end_time'])    ? trim($_POST['end_time'])   : '';

        if (filter_var($employerId, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) === false) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Ungültige Mitarbeiter-ID.']);
            exit;
        }

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Ungültiges Datum.']);
            exit;
        }
        $dt = DateTime::createFromFormat('Y-m-d', $date);
        if (!$dt || $dt->format('Y-m-d') !== $date) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Ungültiges Datum.']);
            exit;
        }

        if ($title === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Titel darf nicht leer sein.']);
            exit;
        }

        if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) {
            $color = '#4a90e2';
        }

        if (!$isAllDay) {
            if (!preg_match('/^\d{2}:\d{2}$/', $startTime) || !preg_match('/^\d{2}:\d{2}$/', $endTime)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Ungültige Start- oder Endzeit.']);
                exit;
            }
            // Timed events are always single-day
            $endDate = $date;
        } else {
            $startTime = '';
            $endTime   = '';
            // Validate end_date for all-day events
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)) {
                $endDate = $date;
            } else {
                $dtEnd = DateTime::createFromFormat('Y-m-d', $endDate);
                if (!$dtEnd || $dtEnd->format('Y-m-d') !== $endDate || $dtEnd < $dt) {
                    $endDate = $date;
                }
            }
        }

        $employerId = (int)$employerId;
        $userId     = filter_var($userId, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) !== false
                      ? (int)$userId : 1;

        $eventData = [
            'employer_id' => $employerId,
            'user_id'     => $userId,
            'date'        => $date,
            'end_date'    => $endDate,
            'start_time'  => $startTime,
            'end_time'    => $endTime,
            'category'    => $category,
            'color'       => $color,
            'is_all_day'  => $isAllDay,
            'title'       => $title,
        ];

        // Demo-Modus: Temporäre ID generieren und neues Termin-Objekt zurückgeben.
        // Produktionsmodus: $newId = dbCreateEvent($eventData);
        $newId = (int)(microtime(true) * 1000) % 999000 + 1000;

        $newEvent = array_merge(['id' => $newId], $eventData);

        echo json_encode(['success' => true, 'event' => $newEvent]);
        exit;
    }

    // ----------------------------------------------------------
    // TERMIN BEARBEITEN (aktualisieren)
    // ----------------------------------------------------------
    if ($action === 'edit') {
        $eventId   = isset($_POST['event_id'])    ? $_POST['event_id']          : '';
        $date      = isset($_POST['date'])         ? trim($_POST['date'])        : '';
        $endDate   = isset($_POST['end_date'])     ? trim($_POST['end_date'])    : '';
        $title     = isset($_POST['title'])        ? trim($_POST['title'])       : '';
        $category  = isset($_POST['category'])     ? trim($_POST['category'])    : '';
        $color     = isset($_POST['color'])        ? trim($_POST['color'])       : '#4a90e2';
        $isAllDay  = isset($_POST['is_all_day'])   ? (bool)$_POST['is_all_day'] : false;
        $startTime = isset($_POST['start_time'])   ? trim($_POST['start_time'])  : '';
        $endTime   = isset($_POST['end_time'])     ? trim($_POST['end_time'])    : '';

        if (filter_var($eventId, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) === false) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Ungültige Termin-ID.']);
            exit;
        }

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Ungültiges Datum.']);
            exit;
        }
        $dt = DateTime::createFromFormat('Y-m-d', $date);
        if (!$dt || $dt->format('Y-m-d') !== $date) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Ungültiges Datum.']);
            exit;
        }

        if ($title === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Titel darf nicht leer sein.']);
            exit;
        }

        if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) {
            $color = '#4a90e2';
        }

        if (!$isAllDay) {
            if (!preg_match('/^\d{2}:\d{2}$/', $startTime) || !preg_match('/^\d{2}:\d{2}$/', $endTime)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Ungültige Start- oder Endzeit.']);
                exit;
            }
            // Timed events are always single-day
            $endDate = $date;
        } else {
            $startTime = '';
            $endTime   = '';
            // Validate end_date for all-day events
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)) {
                $endDate = $date;
            } else {
                $dtEnd = DateTime::createFromFormat('Y-m-d', $endDate);
                if (!$dtEnd || $dtEnd->format('Y-m-d') !== $endDate || $dtEnd < $dt) {
                    $endDate = $date;
                }
            }
        }

        $eventId = (int)$eventId;

        // Demo-Modus: Kein Datenbankaufruf; der Termin wird nur im Arbeitsspeicher simuliert.
        // Produktionsmodus – folgende Zeilen einkommentieren:
        // dbUpdateEvent($eventId, [
        //     'date'       => $date,       'end_date'   => $endDate,
        //     'start_time' => $startTime,  'end_time'   => $endTime,
        //     'category'   => $category,   'color'      => $color,
        //     'is_all_day' => $isAllDay,   'title'      => $title,
        // ]);

        echo json_encode(['success' => true]);
        exit;
    }

    // ----------------------------------------------------------
    // TERMIN LÖSCHEN
    // ----------------------------------------------------------
    if ($action === 'delete') {
        $eventId = isset($_POST['event_id']) ? $_POST['event_id'] : '';

        if (filter_var($eventId, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) === false) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Ungültige Termin-ID.']);
            exit;
        }

        $eventId = (int)$eventId;

        // Demo-Modus: Kein Datenbankaufruf; der Termin wird nur im Arbeitsspeicher simuliert.
        // Produktionsmodus: dbDeleteEvent($eventId);

        echo json_encode(['success' => true]);
        exit;
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Unbekannte Aktion.']);
    exit;
}

// ============================================================
// GET – Termine für das angeforderte Datum zurückgeben
// ============================================================
$requestedDate = isset($_GET['date']) ? trim($_GET['date']) : date('Y-m-d');

// Validate date format (YYYY-MM-DD)
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $requestedDate)) {
    $requestedDate = date('Y-m-d');
}

$dateTime = DateTime::createFromFormat('Y-m-d', $requestedDate);
if (!$dateTime || $dateTime->format('Y-m-d') !== $requestedDate) {
    $requestedDate = date('Y-m-d');
}

// Produktionsmodus: Folgende Zeile einkommentieren, Demo-$events-Block darunter entfernen:
// echo json_encode(dbGetEvents($requestedDate)); exit;

// ============================================================
// Demo-Daten (nur im Demo-Modus aktiv)
// Struktur: id, employer_id, user_id, date, start_time,
//           end_time, category, color, is_all_day, title
// Im Produktionsmodus wird dieser Block nicht benötigt.
// ============================================================
$events = [
    // Max Mustermann (employer_id: 1)
    [
        'id' => 1, 'employer_id' => 1, 'user_id' => 1,
        'date' => date('Y-m-d'), 'end_date' => date('Y-m-d'), 'start_time' => '08:00', 'end_time' => '09:30',
        'category' => 'meeting', 'color' => '#4a90e2', 'is_all_day' => false,
        'title' => 'Team Meeting'
    ],
    [
        'id' => 2, 'employer_id' => 1, 'user_id' => 1,
        'date' => date('Y-m-d'), 'end_date' => date('Y-m-d'), 'start_time' => '10:00', 'end_time' => '11:00',
        'category' => 'appointment', 'color' => '#e74c3c', 'is_all_day' => false,
        'title' => 'Client Call'
    ],
    [
        'id' => 3, 'employer_id' => 1, 'user_id' => 1,
        'date' => date('Y-m-d'), 'end_date' => date('Y-m-d'), 'start_time' => '14:00', 'end_time' => '15:30',
        'category' => 'training', 'color' => '#f39c12', 'is_all_day' => false,
        'title' => 'Training Session'
    ],
    [
        'id' => 4, 'employer_id' => 1, 'user_id' => 1,
        'date' => date('Y-m-d'), 'end_date' => date('Y-m-d', strtotime('+2 days')), 'start_time' => '', 'end_time' => '',
        'category' => 'holiday', 'color' => '#2ecc71', 'is_all_day' => true,
        'title' => 'Conference'
    ],
    [
        'id' => 13, 'employer_id' => 1, 'user_id' => 1,
        'date' => date('Y-m-d'), 'end_date' => date('Y-m-d'), 'start_time' => '', 'end_time' => '',
        'category' => 'training', 'color' => '#e67e22', 'is_all_day' => true,
        'title' => 'Workshop Day'
    ],

    // Anna Schmidt (employer_id: 2)
    [
        'id' => 5, 'employer_id' => 2, 'user_id' => 2,
        'date' => date('Y-m-d'), 'end_date' => date('Y-m-d'), 'start_time' => '09:00', 'end_time' => '10:30',
        'category' => 'meeting', 'color' => '#4a90e2', 'is_all_day' => false,
        'title' => 'Project Review'
    ],
    [
        'id' => 6, 'employer_id' => 2, 'user_id' => 2,
        'date' => date('Y-m-d'), 'end_date' => date('Y-m-d'), 'start_time' => '11:00', 'end_time' => '12:00',
        'category' => 'appointment', 'color' => '#e74c3c', 'is_all_day' => false,
        'title' => 'Customer Meeting'
    ],
    [
        'id' => 7, 'employer_id' => 2, 'user_id' => 2,
        'date' => date('Y-m-d'), 'end_date' => date('Y-m-d'), 'start_time' => '11:30', 'end_time' => '12:30',
        'category' => 'planning', 'color' => '#9b59b6', 'is_all_day' => false,
        'title' => 'Planning Session'
    ],

    // Peter Weber (employer_id: 3)
    [
        'id' => 14, 'employer_id' => 3, 'user_id' => 3,
        'date' => date('Y-m-d'), 'end_date' => date('Y-m-d'), 'start_time' => '', 'end_time' => '',
        'category' => 'meeting', 'color' => '#3498db', 'is_all_day' => true,
        'title' => 'All-Day Meeting'
    ],
    [
        'id' => 15, 'employer_id' => 3, 'user_id' => 3,
        'date' => date('Y-m-d'), 'end_date' => date('Y-m-d'), 'start_time' => '', 'end_time' => '',
        'category' => 'training', 'color' => '#9b59b6', 'is_all_day' => true,
        'title' => 'Training'
    ],
    [
        'id' => 16, 'employer_id' => 3, 'user_id' => 3,
        'date' => date('Y-m-d'), 'end_date' => date('Y-m-d'), 'start_time' => '', 'end_time' => '',
        'category' => 'workshop', 'color' => '#e74c3c', 'is_all_day' => true,
        'title' => 'Team Building'
    ],
    [
        'id' => 8, 'employer_id' => 3, 'user_id' => 3,
        'date' => date('Y-m-d'), 'end_date' => date('Y-m-d'), 'start_time' => '08:30', 'end_time' => '10:00',
        'category' => 'workshop', 'color' => '#1abc9c', 'is_all_day' => false,
        'title' => 'Workshop'
    ],
    [
        'id' => 9, 'employer_id' => 3, 'user_id' => 3,
        'date' => date('Y-m-d'), 'end_date' => date('Y-m-d'), 'start_time' => '13:00', 'end_time' => '14:00',
        'category' => 'meeting', 'color' => '#4a90e2', 'is_all_day' => false,
        'title' => 'Status Update'
    ],
    [
        'id' => 10, 'employer_id' => 3, 'user_id' => 3,
        'date' => date('Y-m-d'), 'end_date' => date('Y-m-d'), 'start_time' => '13:15', 'end_time' => '14:15',
        'category' => 'appointment', 'color' => '#e74c3c', 'is_all_day' => false,
        'title' => 'One-on-One'
    ],

    // Julia Müller (employer_id: 4)
    [
        'id' => 11, 'employer_id' => 4, 'user_id' => 4,
        'date' => date('Y-m-d'), 'end_date' => date('Y-m-d', strtotime('+4 days')), 'start_time' => '', 'end_time' => '',
        'category' => 'vacation', 'color' => '#27ae60', 'is_all_day' => true,
        'title' => 'Urlaub'
    ],
    [
        'id' => 12, 'employer_id' => 4, 'user_id' => 4,
        'date' => date('Y-m-d'), 'end_date' => date('Y-m-d'), 'start_time' => '10:00', 'end_time' => '11:30',
        'category' => 'meeting', 'color' => '#4a90e2', 'is_all_day' => false,
        'title' => 'Team Sync'
    ],
];

// Filter events by requested date (events where start_date <= requestedDate AND end_date >= requestedDate)
$filteredEvents = array_filter($events, function ($event) use ($requestedDate) {
    $endDate = isset($event['end_date']) ? $event['end_date'] : $event['date'];
    return $event['date'] <= $requestedDate && $endDate >= $requestedDate;
});

echo json_encode(array_values($filteredEvents));
