<?php
header('Content-Type: application/json');

// NOTE: This is sample code for demonstration purposes.
// In a production environment, you should:
// 1. Add authentication to verify the user is logged in
// 2. Add authorization to ensure users can only see sessions they have permission to view
// 3. Retrieve data from a secure database instead of hardcoded arrays
// 4. Validate and sanitize any input parameters (e.g., date filters)

// Get date parameter from query string, default to today
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

// Sample session data for employees
// In a real application, this would come from a database
// Structure: id, employer_id, date, login_time, logout_time

$sessions = [
    // Max Mustermann (employer_id: 1)
    [
        'id' => 1,
        'employer_id' => 1,
        'date' => date('Y-m-d'),
        'login_time' => '07:30',
        'logout_time' => '12:15'
    ],
    [
        'id' => 2,
        'employer_id' => 1,
        'date' => date('Y-m-d'),
        'login_time' => '13:00',
        'logout_time' => '' // Currently logged in
    ],
    
    // Anna Schmidt (employer_id: 2)
    [
        'id' => 3,
        'employer_id' => 2,
        'date' => date('Y-m-d'),
        'login_time' => '06:45',
        'logout_time' => '15:30'
    ],
    
    // Peter Weber (employer_id: 3)
    [
        'id' => 4,
        'employer_id' => 3,
        'date' => date('Y-m-d'),
        'login_time' => '08:00',
        'logout_time' => '11:45'
    ],
    [
        'id' => 5,
        'employer_id' => 3,
        'date' => date('Y-m-d'),
        'login_time' => '12:30',
        'logout_time' => '16:00'
    ],
    
    // Julia Müller (employer_id: 4)
    [
        'id' => 6,
        'employer_id' => 4,
        'date' => date('Y-m-d'),
        'login_time' => '09:00',
        'logout_time' => '' // Currently logged in
    ]
];

// Filter sessions by requested date
$filteredSessions = array_filter($sessions, function($session) use ($requestedDate) {
    return $session['date'] === $requestedDate;
});

// Re-index the array to ensure proper JSON encoding
$filteredSessions = array_values($filteredSessions);

echo json_encode($filteredSessions);
?>
