// ===== DATENLADUNG UND SPEICHERN =====
let einsaetze = JSON.parse(localStorage.getItem("einsaetze")) || [];  // Lade Einsätze oder setze leere Liste
let historie = JSON.parse(localStorage.getItem("historie")) || [];    // Lade Historie oder setze leere Liste
let fahrzeugeDaten = JSON.parse(localStorage.getItem("fahrzeugeDaten")) || [  // Lade Fahrzeuge oder setze Standard
    { name: "11/42 LF", status: "Einsatzbereit auf der Wache" },
    { name: "11/19 MTW", status: "Einsatzbereit auf der Wache" }
];

// Speichern der Daten im LocalStorage
function saveData() {
    localStorage.setItem("einsaetze", JSON.stringify(einsaetze));
    localStorage.setItem("historie", JSON.stringify(historie));
    localStorage.setItem("fahrzeugeDaten", JSON.stringify(fahrzeugeDaten));
}

// ===== ERFOLGSMELDUNG =====
function showSuccess(message) {
    const div = document.getElementById("successMessage");
    if (div) {
        div.textContent = message;
        div.style.display = "block";
        setTimeout(() => div.style.display = "none", 3000);
    }
}

// ===== EINSATZ ERSTELLEN =====
function einsatzErstellen() {
    const ort = document.getElementById("einsatzOrt")?.value?.trim();
    const strasse = document.getElementById("einsatzStrasse")?.value?.trim();
    const hausnummer = document.getElementById("einsatzHausnummer")?.value?.trim();
    const plz = document.getElementById("einsatzPlz")?.value?.trim();
    const beschreibung = document.getElementById("einsatzBeschreibung")?.value?.trim();

    // Prüfen, ob alle notwendigen Felder ausgefüllt sind
    if (!ort || !strasse || !hausnummer || !plz || !beschreibung) {
        alert("Bitte füllen Sie alle Felder aus!");
        return;
    }

    // Erstelle einen neuen Einsatz
    const neuerEinsatz = {
        id: Date.now(), // Unique ID basierend auf der aktuellen Zeit
        ort,
        strasse,
        hausnummer,
        plz,
        beschreibung,
        zeit: new Date().toISOString(),
        fahrzeuge: [] // Anfangs keine Fahrzeuge zugewiesen
    };

    // Füge den neuen Einsatz der Liste hinzu
    einsaetze.push(neuerEinsatz);
    saveData();
    renderEinsaetze(); // Anzeige der neuen Einsätze aktualisieren
    showSuccess("Einsatz erfolgreich erstellt.");
}

// ===== EINSÄTZE ANZEIGEN =====
function renderEinsaetze() {
    const container = document.getElementById("einsaetze");
    if (!container) return;

    container.innerHTML = "";  // Reset der Anzeige

    // Wenn keine Einsätze vorhanden sind
    if (einsaetze.length === 0) {
        container.innerHTML = "<p>Es sind keine laufenden Einsätze vorhanden.</p>";
        return;
    }

    // Anzeige aller laufenden Einsätze
    einsaetze.forEach(einsatz => {
        const div = document.createElement("div");
        div.className = "einsatz";

        // Erstelle eine Liste der zugewiesenen Fahrzeuge
        const zugewiesenHTML = einsatz.fahrzeuge.map(fz =>
            `<li>${fz.name} <button onclick="entferneFahrzeug(${einsatz.id}, '${fz.name}')">Entfernen</button></li>`
        ).join("");

        const dropdownId = `fahrzeugDropdown-${einsatz.id}`;

        div.innerHTML = `
            <strong>${einsatz.ort} ${einsatz.strasse} ${einsatz.hausnummer}, ${einsatz.plz}</strong><br>
            🕒 ${new Date(einsatz.zeit).toLocaleString()}<br>
            ${einsatz.beschreibung}<br>
            <div><strong>Zugewiesene Fahrzeuge:</strong>
                <ul>${zugewiesenHTML}</ul>
            </div>
            <div>
                <select id="${dropdownId}">
                    <option value="">-- Fahrzeug auswählen --</option>
                    ${fahrzeugeDaten.map(f => `<option value="${f.name}">${f.name}</option>`).join("")}
                </select>
                <button onclick="fahrzeugZuweisen(${einsatz.id})">Fahrzeug zuweisen</button>
            </div>
            <button onclick="abschliessen(${einsatz.id})">Einsatz abschließen</button>
        `;

        container.appendChild(div);
    });
}

// ===== FAHRZEUG ZUWEISEN =====
function fahrzeugZuweisen(einsatzId) {
    const einsatz = einsaetze.find(e => e.id === einsatzId);
    const dropdown = document.getElementById(`fahrzeugDropdown-${einsatzId}`);
    const fahrzeugName = dropdown?.value;

    if (!fahrzeugName || !einsatz) return;

    // Prüfen, ob das Fahrzeug bereits einem anderen Einsatz zugewiesen ist
    const fahrzeugBereitsImEinsatz = einsaetze.some(e =>
        e.id !== einsatzId &&
        e.fahrzeuge.some(fz => fz.name === fahrzeugName)
    );

    if (fahrzeugBereitsImEinsatz) {
        alert("⚠️ Das Fahrzeug ist bereits in einem anderen Einsatz.");
        return;
    }

    // Wenn das Fahrzeug noch nicht zugewiesen wurde, füge es hinzu
    if (!einsatz.fahrzeuge.some(fz => fz.name === fahrzeugName)) {
        const fahrzeugObj = fahrzeugeDaten.find(f => f.name === fahrzeugName);
        if (fahrzeugObj) {
            einsatz.fahrzeuge.push({ ...fahrzeugObj });
            saveData();
            renderEinsaetze();
        }
    } else {
        alert("Das Fahrzeug ist bereits diesem Einsatz zugewiesen.");
    }
}

// ===== FAHRZEUG ENTFERNEN =====
function entferneFahrzeug(einsatzId, fahrzeugName) {
    const einsatz = einsaetze.find(e => e.id === einsatzId);
    if (!einsatz) return;

    einsatz.fahrzeuge = einsatz.fahrzeuge.filter(fz => fz.name !== fahrzeugName);
    saveData();
    renderEinsaetze();
}

// ===== EINSATZ ABSCHLIESSEN =====
function abschliessen(id) {
    const index = einsaetze.findIndex(e => e.id === id);
    if (index > -1) {
        const [einsatz] = einsaetze.splice(index, 1);
        historie.push(einsatz); // In die Historie verschieben
        saveData();
        renderEinsaetze();
        showSuccess("Einsatz abgeschlossen.");
    }
}

// ===== INIT =====
window.onload = () => {
    renderEinsaetze();  // Beim Laden die laufenden Einsätze anzeigen
    document.getElementById("einsatzErstellenBtn")?.addEventListener("click", einsatzErstellen); // Event für die Erstellung eines neuen Einsatzes
};
