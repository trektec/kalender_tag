<?php
header('Content-Type: application/json');

// Sample employer data
// In a real application, this would come from a database
$employers = [
    ['id' => 1, 'name' => 'Max Mustermann'],
    ['id' => 2, 'name' => 'Anna Schmidt'],
    ['id' => 3, 'name' => 'Peter Weber'],
    ['id' => 4, 'name' => 'Julia Müller']
];

echo json_encode($employers);
?>
