<?php
header('Content-Type: application/json');

// NOTE: This is sample code for demonstration purposes.
// In a production environment, you should:
// 1. Add authentication to verify the user is logged in
// 2. Add authorization to ensure users can only see sessions they have permission to view
// 3. Retrieve data from a secure database instead of hardcoded arrays
// 4. Validate and sanitize any input parameters (e.g., date filters)

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
    // All-day event for Max
    [
        'id' => 7,
        'employer_id' => 1,
        'date' => date('Y-m-d'),
        'login_time' => '06:00',
        'logout_time' => '18:00' // Spans entire day
    ],
    
    // Anna Schmidt (employer_id: 2)
    [
        'id' => 3,
        'employer_id' => 2,
        'date' => date('Y-m-d'),
        'login_time' => '06:45',
        'logout_time' => '15:30'
    ],
    // All-day events for Anna (3 events to test the spacing)
    [
        'id' => 8,
        'employer_id' => 2,
        'date' => date('Y-m-d'),
        'login_time' => '06:00',
        'logout_time' => '18:00'
    ],
    [
        'id' => 9,
        'employer_id' => 2,
        'date' => date('Y-m-d'),
        'login_time' => '06:00',
        'logout_time' => '18:00'
    ],
    [
        'id' => 10,
        'employer_id' => 2,
        'date' => date('Y-m-d'),
        'login_time' => '06:00',
        'logout_time' => '18:00'
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
    // All-day events for Peter (4 events to test with more than 3)
    [
        'id' => 11,
        'employer_id' => 3,
        'date' => date('Y-m-d'),
        'login_time' => '06:00',
        'logout_time' => '18:00'
    ],
    [
        'id' => 12,
        'employer_id' => 3,
        'date' => date('Y-m-d'),
        'login_time' => '06:00',
        'logout_time' => '18:00'
    ],
    [
        'id' => 13,
        'employer_id' => 3,
        'date' => date('Y-m-d'),
        'login_time' => '06:00',
        'logout_time' => '18:00'
    ],
    [
        'id' => 14,
        'employer_id' => 3,
        'date' => date('Y-m-d'),
        'login_time' => '06:00',
        'logout_time' => '18:00'
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

echo json_encode($sessions);
?>
