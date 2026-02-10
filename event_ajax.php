<?php
header('Content-Type: application/json');

// NOTE: This is sample code for demonstration purposes.
// In a production environment, you should:
// 1. Add authentication to verify the user is logged in
// 2. Add authorization to ensure users can only see events they have permission to view
// 3. Retrieve data from a secure database instead of hardcoded arrays
// 4. Validate and sanitize any input parameters (e.g., date filters)

// Sample event data for employees
// In a real application, this would come from a database
// Structure: id, employer_id, date, start_time, end_time, category, color, is_all_day, title

$events = [
    // Max Mustermann (employer_id: 1)
    [
        'id' => 1,
        'employer_id' => 1,
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
        'date' => date('Y-m-d'),
        'start_time' => '10:00',
        'end_time' => '11:30',
        'category' => 'meeting',
        'color' => '#4a90e2',
        'is_all_day' => false,
        'title' => 'Team Sync'
    ]
];

echo json_encode($events);
?>
