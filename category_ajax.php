<?php
header('Content-Type: application/json');

// HINWEIS: Dies ist Beispielcode zu Demonstrationszwecken.
// In einer Produktionsumgebung sollten Kategorien aus einer sicheren Datenbank abgerufen werden.

// Beispiel-Kategoriedaten
// Struktur: id, name, color
$categories = [
    ['id' => 1, 'name' => 'Meeting',     'color' => '#4a90e2'],
    ['id' => 2, 'name' => 'Appointment', 'color' => '#e74c3c'],
    ['id' => 3, 'name' => 'Training',    'color' => '#f39c12'],
    ['id' => 4, 'name' => 'Holiday',     'color' => '#2ecc71'],
    ['id' => 5, 'name' => 'Workshop',    'color' => '#1abc9c'],
    ['id' => 6, 'name' => 'Planning',    'color' => '#9b59b6'],
    ['id' => 7, 'name' => 'Vacation',    'color' => '#27ae60'],
];

echo json_encode($categories);
