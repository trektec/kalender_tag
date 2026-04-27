<?php
header('Content-Type: application/json');

// Sample category data
// In a real application, this would come from a database:
// SELECT id, name, color FROM categories ORDER BY name
$categories = [
    ['id' => 1, 'name' => 'Meeting',   'color' => '#4a90e2'],
    ['id' => 2, 'name' => 'Termin',    'color' => '#e74c3c'],
    ['id' => 3, 'name' => 'Training',  'color' => '#f39c12'],
    ['id' => 4, 'name' => 'Urlaub',    'color' => '#2ecc71'],
    ['id' => 5, 'name' => 'Workshop',  'color' => '#1abc9c'],
    ['id' => 6, 'name' => 'Planung',   'color' => '#9b59b6'],
    ['id' => 7, 'name' => 'Feiertag',  'color' => '#27ae60'],
];

echo json_encode($categories);
?>
