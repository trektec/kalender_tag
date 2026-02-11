<?php
header('Content-Type: application/json');

// Sample employer data
// In a real application, this would come from a database
$employers = [
    ['id' => 1, 'name' => 'Max Mustermann', 'department' => 'Vertrieb', 'color' => '#4a90e2'],
    ['id' => 2, 'name' => 'Anna Schmidt', 'department' => 'Marketing', 'color' => '#e74c3c'],
    ['id' => 3, 'name' => 'Peter Weber', 'department' => 'IT', 'color' => '#2ecc71'],
    ['id' => 4, 'name' => 'Julia Müller', 'department' => 'HR', 'color' => '#f39c12']
];

echo json_encode($employers);
?>
