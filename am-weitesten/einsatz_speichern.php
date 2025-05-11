<?php
// Fehlerbericht aktivieren, damit wir alle Fehler sehen
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Verbindung zur Datenbank herstellen
$host = "localhost";
$db = "jugendfeuerwehr"; // Deine Datenbank
$user = "root"; // Dein Benutzername (Standard bei XAMPP)
$pass = ""; // Dein Passwort (Standard bei XAMPP ist leer)

$conn = new mysqli($host, $user, $pass, $db);

// Verbindung prüfen
if ($conn->connect_error) {
    die("Verbindung zur Datenbank fehlgeschlagen: " . $conn->connect_error);
}

// Formulardaten sichern (Vermeidung von SQL-Injection)
$einsatzname = $conn->real_escape_string($_POST['einsatzname']);
$ort = $conn->real_escape_string($_POST['ort']);
$status = $conn->real_escape_string($_POST['status']);

// SQL-Abfrage zum Einfügen der Daten
$sql = "INSERT INTO einsaetze (einsatzname, ort, status) 
        VALUES ('$einsatzname', '$ort', '$status')";

// Überprüfen, ob die Abfrage erfolgreich war
if ($conn->query($sql) === TRUE) {
    echo "Einsatz erfolgreich gespeichert.";
} else {
    echo "Fehler: " . $conn->error;
}

// Verbindung schließen
$conn->close();
?>
