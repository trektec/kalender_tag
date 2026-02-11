<?php
header('Content-Type: application/json');

// NOTE: This is sample code for demonstration purposes.
// In a production environment, you should:
// 1. Add authentication to verify the user is logged in
// 2. Add authorization to ensure users can only see events they have permission to view
// 3. Retrieve data from a secure database instead of hardcoded arrays
// 4. Validate and sanitize any input parameters (e.g., date filters)

// Get start date parameter from query string (should be a Monday), default to current week's Monday
$requestedStartDate = isset($_GET['start_date']) ? $_GET['start_date'] : date('Y-m-d', strtotime('monday this week'));

// Validate date format (YYYY-MM-DD)
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $requestedStartDate)) {
    $requestedStartDate = date('Y-m-d', strtotime('monday this week'));
}

// Verify it's a valid date
$dateTime = DateTime::createFromFormat('Y-m-d', $requestedStartDate);
if (!$dateTime || $dateTime->format('Y-m-d') !== $requestedStartDate) {
    $requestedStartDate = date('Y-m-d', strtotime('monday this week'));
}

// Calculate the week's dates (Monday to Sunday)
$weekDates = [];
for ($i = 0; $i < 7; $i++) {
    $weekDates[] = date('Y-m-d', strtotime($requestedStartDate . " +$i days"));
}

// Sample event data for employees
// In a real application, this would come from a database
// Structure: id, employer_id, date, start_time, end_time, category, color, is_all_day, title, employer_name

$baseEvents = [
    // Max Mustermann (employer_id: 1)
    [
        'id' => 1,
        'employer_id' => 1,
        'employer_name' => 'Max Mustermann',
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
        'employer_name' => 'Max Mustermann',
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
        'employer_name' => 'Max Mustermann',
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
        'employer_name' => 'Max Mustermann',
        'date' => date('Y-m-d'),
        'start_time' => '',
        'end_time' => '',
        'category' => 'holiday',
        'color' => '#2ecc71',
        'is_all_day' => true,
        'title' => 'Conference'
    ],
    
    // Anna Schmidt (employer_id: 2)
    [
        'id' => 5,
        'employer_id' => 2,
        'employer_name' => 'Anna Schmidt',
        'date' => date('Y-m-d', strtotime('+1 day')),
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
        'employer_name' => 'Anna Schmidt',
        'date' => date('Y-m-d', strtotime('+1 day')),
        'start_time' => '11:00',
        'end_time' => '12:00',
        'category' => 'appointment',
        'color' => '#e74c3c',
        'is_all_day' => false,
        'title' => 'Customer Meeting'
    ],
    
    // Peter Weber (employer_id: 3)
    [
        'id' => 8,
        'employer_id' => 3,
        'employer_name' => 'Peter Weber',
        'date' => date('Y-m-d', strtotime('+2 days')),
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
        'employer_name' => 'Peter Weber',
        'date' => date('Y-m-d', strtotime('+2 days')),
        'start_time' => '13:00',
        'end_time' => '14:00',
        'category' => 'meeting',
        'color' => '#4a90e2',
        'is_all_day' => false,
        'title' => 'Status Update'
    ],
    [
        'id' => 14,
        'employer_id' => 3,
        'employer_name' => 'Peter Weber',
        'date' => date('Y-m-d', strtotime('+3 days')),
        'start_time' => '',
        'end_time' => '',
        'category' => 'meeting',
        'color' => '#3498db',
        'is_all_day' => true,
        'title' => 'All-Day Meeting'
    ],
    
    // Julia Müller (employer_id: 4)
    [
        'id' => 11,
        'employer_id' => 4,
        'employer_name' => 'Julia Müller',
        'date' => date('Y-m-d', strtotime('+4 days')),
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
        'employer_name' => 'Julia Müller',
        'date' => date('Y-m-d'),
        'start_time' => '10:00',
        'end_time' => '11:30',
        'category' => 'meeting',
        'color' => '#4a90e2',
        'is_all_day' => false,
        'title' => 'Team Sync'
    ]
];

// Filter events by requested week
$filteredEvents = array_filter($baseEvents, function($event) use ($weekDates) {
    return in_array($event['date'], $weekDates);
});

// Re-index the array to ensure proper JSON encoding
$filteredEvents = array_values($filteredEvents);

echo json_encode($filteredEvents);
?>
