<?php
header('Content-Type: application/json');

// NOTE: This is sample code for demonstration purposes.
// In a production environment, you should:
// 1. Add authentication to verify the user is logged in
// 2. Add authorization to ensure users can only see events they have permission to view
// 3. Retrieve data from a secure database instead of hardcoded arrays
// 4. Validate and sanitize any input parameters (e.g., date filters)

// Handle DELETE action via POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = isset($_POST['action']) ? $_POST['action'] : '';

    if ($action === 'delete') {
        $eventId = isset($_POST['event_id']) ? $_POST['event_id'] : '';

        // Validate that event_id is a positive integer
        if (filter_var($eventId, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) === false) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Ungültige Termin-ID.']);
            exit;
        }

        $eventId = (int)$eventId;

        // NOTE: In production, verify that the current session user is either the creator
        // of the event (event.user_id == session user id) or a superuser before proceeding.
        // Then mark the record as deleted in the database (e.g. SET deleted = 1 WHERE id = $eventId).
        // For now, we simply return success since the events are a hardcoded in-memory array.

        echo json_encode(['success' => true]);
        exit;
    }

    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Unbekannte Aktion.']);
    exit;
}

$requestedDate = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');

// Validate date format (YYYY-MM-DD)
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $requestedDate)) {
    $requestedDate = date('Y-m-d');
}

// Verify it's a valid date
$dateTime = DateTime::createFromFormat('Y-m-d', $requestedDate);
if (!$dateTime || $dateTime->format('Y-m-d') !== $requestedDate) {
    $requestedDate = date('Y-m-d');
}

// Sample event data for employees
// In a real application, this would come from a database
// Structure: id, employer_id, user_id, date, start_time, end_time, category, color, is_all_day, title
// user_id identifies the user who created the event

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

// Filter events by requested date
$filteredEvents = array_filter($events, function($event) use ($requestedDate) {
    return $event['date'] === $requestedDate;
});

// Re-index the array to ensure proper JSON encoding
$filteredEvents = array_values($filteredEvents);

echo json_encode($filteredEvents);
?>
