<?php
header('Content-Type: application/json');

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

echo json_encode($sessions);
?>
