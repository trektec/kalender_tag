<?php
header('Content-Type: application/json');

// HINWEIS: Dies ist Beispielcode zu Demonstrationszwecken.
// In einer Produktionsumgebung solltest du:
// 1. Authentifizierung hinzufügen, um zu prüfen, ob der Benutzer angemeldet ist
// 2. Autorisierung hinzufügen, um sicherzustellen, dass Benutzer nur Termine sehen, die sie sehen dürfen
// 3. Daten aus einer sicheren Datenbank statt aus fest codierten Arrays abrufen
// 4. Alle Eingabeparameter validieren und bereinigen (z. B. Datumsfilter)

// DELETE-Aktion per POST verarbeiten
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = isset($_POST['action']) ? $_POST['action'] : '';

    if ($action === 'delete') {
        $eventId = isset($_POST['event_id']) ? $_POST['event_id'] : '';

        // Prüfen, ob event_id eine positive Ganzzahl ist
        if (filter_var($eventId, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) === false) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Ungültige Termin-ID.']);
            exit;
        }

        $eventId = (int)$eventId;

        // HINWEIS: In der Produktion prüfen, ob der aktuelle Session-Benutzer entweder der Ersteller ist
        // des Termins (event.user_id == ID des Session-Benutzers) oder ein Superuser ist, bevor fortgefahren wird.
        // Dann den Datensatz in der Datenbank als gelöscht markieren (z. B. SET deleted = 1 WHERE id = $eventId).
        // Vorerst geben wir einfach Erfolg zurück, da die Termine in einem fest codierten In-Memory-Array liegen.

        echo json_encode(['success' => true]);
        exit;
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Unbekannte Aktion.']);
    exit;
}

$requestedDate = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');

// Datumsformat validieren (YYYY-MM-DD)
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $requestedDate)) {
    $requestedDate = date('Y-m-d');
}

// Prüfen, ob es ein gültiges Datum ist
$dateTime = DateTime::createFromFormat('Y-m-d', $requestedDate);
if (!$dateTime || $dateTime->format('Y-m-d') !== $requestedDate) {
    $requestedDate = date('Y-m-d');
}

// Beispiel-Termindaten für Mitarbeiter
// In einer echten Anwendung würden diese aus einer Datenbank kommen
// Struktur: id, employer_id, user_id, date, start_time, end_time, category, color, is_all_day, title
// user_id kennzeichnet den Benutzer, der den Termin erstellt hat

$events = [
    // Max Mustermann (employer_id: 1)
    [
        'id' => 1,
        'employer_id' => 1,
        'user_id' => 1,
        'date' => date('Y-m-d'),
        'start_time' => '08:00',
        'end_time' => '09:30',
        'category' => 'meeting',
        'color' => '#4a90e2',
        'is_all_day' => false,
        'title' => 'Team Meeting'
    ],
    [
        'id' => 2,
        'employer_id' => 1,
        'user_id' => 1,
        'date' => date('Y-m-d'),
        'start_time' => '10:00',
        'end_time' => '11:00',
        'category' => 'appointment',
        'color' => '#e74c3c',
        'is_all_day' => false,
        'title' => 'Client Call'
    ],
    [
        'id' => 3,
        'employer_id' => 1,
        'user_id' => 1,
        'date' => date('Y-m-d'),
        'start_time' => '14:00',
        'end_time' => '15:30',
        'category' => 'training',
        'color' => '#f39c12',
        'is_all_day' => false,
        'title' => 'Training Session'
    ],
    [
        'id' => 4,
        'employer_id' => 1,
        'user_id' => 1,
        'date' => date('Y-m-d'),
        'start_time' => '',
        'end_time' => '',
        'category' => 'holiday',
        'color' => '#2ecc71',
        'is_all_day' => true,
        'title' => 'Conference'
    ],
    [
        'id' => 13,
        'employer_id' => 1,
        'user_id' => 1,
        'date' => date('Y-m-d'),
        'start_time' => '',
        'end_time' => '',
        'category' => 'training',
        'color' => '#e67e22',
        'is_all_day' => true,
        'title' => 'Workshop Day'
    ],
    
    // Anna Schmidt (employer_id: 2)
    [
        'id' => 5,
        'employer_id' => 2,
        'user_id' => 2,
        'date' => date('Y-m-d'),
        'start_time' => '09:00',
        'end_time' => '10:30',
        'category' => 'meeting',
        'color' => '#4a90e2',
        'is_all_day' => false,
        'title' => 'Project Review'
    ],
    [
        'id' => 6,
        'employer_id' => 2,
        'user_id' => 2,
        'date' => date('Y-m-d'),
        'start_time' => '11:00',
        'end_time' => '12:00',
        'category' => 'appointment',
        'color' => '#e74c3c',
        'is_all_day' => false,
        'title' => 'Customer Meeting'
    ],
    [
        'id' => 7,
        'employer_id' => 2,
        'user_id' => 2,
        'date' => date('Y-m-d'),
        'start_time' => '11:30',
        'end_time' => '12:30',
        'category' => 'planning',
        'color' => '#9b59b6',
        'is_all_day' => false,
        'title' => 'Planning Session'
    ],
    
    // Peter Weber (employer_id: 3)
    [
        'id' => 14,
        'employer_id' => 3,
        'user_id' => 3,
        'date' => date('Y-m-d'),
        'start_time' => '',
        'end_time' => '',
        'category' => 'meeting',
        'color' => '#3498db',
        'is_all_day' => true,
        'title' => 'All-Day Meeting'
    ],
    [
        'id' => 15,
        'employer_id' => 3,
        'user_id' => 3,
        'date' => date('Y-m-d'),
        'start_time' => '',
        'end_time' => '',
        'category' => 'training',
        'color' => '#9b59b6',
        'is_all_day' => true,
        'title' => 'Training'
    ],
    [
        'id' => 16,
        'employer_id' => 3,
        'user_id' => 3,
        'date' => date('Y-m-d'),
        'start_time' => '',
        'end_time' => '',
        'category' => 'workshop',
        'color' => '#e74c3c',
        'is_all_day' => true,
        'title' => 'Team Building'
    ],
    [
        'id' => 8,
        'employer_id' => 3,
        'user_id' => 3,
        'date' => date('Y-m-d'),
        'start_time' => '08:30',
        'end_time' => '10:00',
        'category' => 'workshop',
        'color' => '#1abc9c',
        'is_all_day' => false,
        'title' => 'Workshop'
    ],
    [
        'id' => 9,
        'employer_id' => 3,
        'user_id' => 3,
        'date' => date('Y-m-d'),
        'start_time' => '13:00',
        'end_time' => '14:00',
        'category' => 'meeting',
        'color' => '#4a90e2',
        'is_all_day' => false,
        'title' => 'Status Update'
    ],
    [
        'id' => 10,
        'employer_id' => 3,
        'user_id' => 3,
        'date' => date('Y-m-d'),
        'start_time' => '13:15',
        'end_time' => '14:15',
        'category' => 'appointment',
        'color' => '#e74c3c',
        'is_all_day' => false,
        'title' => 'One-on-One'
    ],
    
    // Julia Müller (employer_id: 4)
    [
        'id' => 11,
        'employer_id' => 4,
        'user_id' => 4,
        'date' => date('Y-m-d'),
        'start_time' => '',
        'end_time' => '',
        'category' => 'vacation',
        'color' => '#27ae60',
        'is_all_day' => true,
        'title' => 'Urlaub'
    ],
    [
        'id' => 12,
        'employer_id' => 4,
        'user_id' => 4,
        'date' => date('Y-m-d'),
        'start_time' => '10:00',
        'end_time' => '11:30',
        'category' => 'meeting',
        'color' => '#4a90e2',
        'is_all_day' => false,
        'title' => 'Team Sync'
    ]
];

// Termine nach dem angeforderten Datum filtern
$filteredEvents = array_filter($events, function($event) use ($requestedDate) {
    return $event['date'] === $requestedDate;
});

// Das Array neu indizieren, um eine korrekte JSON-Codierung sicherzustellen
$filteredEvents = array_values($filteredEvents);

echo json_encode($filteredEvents);
?>
