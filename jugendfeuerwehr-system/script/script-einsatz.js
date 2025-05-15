let einsaetze = JSON.parse(localStorage.getItem("einsaetze")) || [];
let fahrzeugeDaten = JSON.parse(localStorage.getItem("fahrzeugeDaten")) || [];
let aktuelleFahrzeuge = [];
let historie = JSON.parse(localStorage.getItem("historie")) || [];
let nachrueckFahrzeuge = {};
let koordinaten = null;

function save() {
    localStorage.setItem("einsaetze", JSON.stringify(einsaetze));
    localStorage.setItem("fahrzeugeDaten", JSON.stringify(fahrzeugeDaten));
    localStorage.setItem("historie", JSON.stringify(historie));
}

function showSuccess(message) {
    const msgDiv = document.getElementById("successMessage");
    msgDiv.textContent = message;
    msgDiv.style.display = "block";
    setTimeout(() => msgDiv.style.display = "none", 3000);
}

function addEinsatz() {
    const ort = document.getElementById("einsatzOrt").value.trim();
    const straße = document.getElementById("einsatzStraße").value.trim();
    const hausnummer = document.getElementById("einsatzHausnummer").value.trim();
    const beschreibung = document.getElementById("einsatzBeschreibung").value.trim();

    if (!beschreibung) {
        alert("Bitte eine Beschreibung angeben.");
        return;
    }

    // Entweder Koordinaten oder vollständige Adresse erforderlich
    if (!koordinaten) {
        if (!ort || !straße || !hausnummer) {
            alert("Bitte entweder eine Adresse oder eine Position auf der Karte angeben.");
            return;
        }
    }

    const einsatz = {
        id: Date.now(),
        ort,
        strasse: straße,
        hausnummer,
        zeit: new Date().toISOString(),
        beschreibung,
        fahrzeuge: [...aktuelleFahrzeuge]
    };

    if (koordinaten) {
        einsatz.koordinaten = koordinaten;
    }

    einsaetze.push(einsatz);
    save();
    renderEinsaetze();
    showSuccess("Einsatz wurde erfolgreich erstellt.");

    document.getElementById("einsatzOrt").value = "";
    document.getElementById("einsatzStraße").value = "";
    document.getElementById("einsatzHausnummer").value = "";
    document.getElementById("einsatzBeschreibung").value = "";
    aktuelleFahrzeuge = [];
    koordinaten = null;
    updateCoordsDisplay();
    renderFahrzeugList();
    renderFahrzeugDropdown();
}

function renderEinsaetze() {
    const container = document.getElementById("einsaetze");
    container.innerHTML = "";

    einsaetze.forEach((e) => {
        if (!nachrueckFahrzeuge[e.id]) nachrueckFahrzeuge[e.id] = [];

        const div = document.createElement("div");
        div.classList.add("einsatz");

        let fahrzeugListeHTML = '<div class="einsatz-fahrzeuge"><h4>Zuordnete Fahrzeuge:</h4>';
        if (e.fahrzeuge.length > 0) {
            fahrzeugListeHTML += '<ul>';
            e.fahrzeuge.forEach(fahrzeug => {
                const status = localStorage.getItem(`status_${fahrzeug.name}`);
                fahrzeugListeHTML += `
                    <li>
                        <span><strong>${fahrzeug.name}</strong> – <em>Status: ${status || 'Kein Status'}</em></span>
                        <button class="einsatz-fahrzeug-entfernen" onclick="entferneFahrzeug(${e.id}, '${fahrzeug.name}')">
                            Fahrzeug abziehen
                        </button>
                    </li>
                `;
            });
            fahrzeugListeHTML += '</ul>';
        } else {
            fahrzeugListeHTML += '<p>Keine Fahrzeuge zugeordnet</p>';
        }
        fahrzeugListeHTML += '</div>';

        const vorgemerktHTML = nachrueckFahrzeuge[e.id].length > 0
            ? `<div id="nachrueckListe-${e.id}" class="nachrueck-liste">
                    <h5>Vorgemerkte Fahrzeuge:</h5>
                    <ul>
                        ${nachrueckFahrzeuge[e.id].map(f => `
                            <li>
                                ${f.name}
                                <button onclick="entferneVorgemerktesFahrzeug(${e.id}, '${f.name}')">Löschen</button>
                            </li>
                        `).join("")}
                    </ul>
                </div>`
            : '';

        div.innerHTML = `
            <h3>${e.ort || 'Ort unbekannt'}, ${e.strasse || ''} ${e.hausnummer || ''}</h3>
            <p>${e.beschreibung}</p>
            <p><strong>Koordinaten:</strong> ${e.koordinaten ? e.koordinaten.join(", ") : "Keine Angabe"}</p>
            <p><strong>Erstellt am:</strong> ${new Date(e.zeit).toLocaleString()}</p>
            ${fahrzeugListeHTML}
            <div class="nachrueck-container">
                <select id="nachrueckDropdown-${e.id}">
                    <option value="">Fahrzeug auswählen</option>
                    ${fahrzeugeDaten
                        .filter(f => istFahrzeugVerfuegbar(f.name) && !nachrueckFahrzeuge[e.id].some(n => n.name === f.name))
                        .map(f => `<option value="${f.name}">${f.name}</option>`)
                        .join("")}
                </select>
                ${vorgemerktHTML}
            </div>
            <button class="action-button" onclick="fahrzeugHinzufuegen(${e.id})">Fahrzeuge hinzufügen</button><br>
            <button class="action-button" onclick="abschliessen(${e.id})">Einsatz abschließen</button>
        `;

        container.appendChild(div);
    });
}

function entferneFahrzeug(einsatzId, fahrzeugName) {
    const einsatz = einsaetze.find(e => e.id === Number(einsatzId));
    if (einsatz) {
        einsatz.fahrzeuge = einsatz.fahrzeuge.filter(f => f.name !== fahrzeugName);
        save();
        renderEinsaetze();
        renderFahrzeugDropdown();
        showSuccess(`Fahrzeug ${fahrzeugName} von Einsatz entfernt.`);
    }
}

function entferneVorgemerktesFahrzeug(einsatzId, fahrzeugName) {
    if (nachrueckFahrzeuge[einsatzId]) {
        nachrueckFahrzeuge[einsatzId] = nachrueckFahrzeuge[einsatzId].filter(f => f.name !== fahrzeugName);
        renderEinsaetze();
        renderFahrzeugDropdown();
        showSuccess(`Fahrzeug ${fahrzeugName} wurde aus der Vormerkung entfernt.`);
    }
}

function abschliessen(id) {
    const einsatzIndex = einsaetze.findIndex((e) => e.id === id);
    if (einsatzIndex !== -1) {
        const abgeschlossenerEinsatz = einsaetze.splice(einsatzIndex, 1)[0];
        abgeschlossenerEinsatz.status = "abgeschlossen";
        historie.push(abgeschlossenerEinsatz);
        save();
        showSuccess("Einsatz wurde abgeschlossen und in die Historie verschoben.");
        setTimeout(() => location.reload());
    }
}

function istFahrzeugVerfuegbar(name) {
    const inEinsaetzen = einsaetze.some(e => e.fahrzeuge.some(f => f.name === name));
    const inAktuellen = aktuelleFahrzeuge.some(f => f.name === name);
    return !inEinsaetzen && !inAktuellen;
}

function renderFahrzeugDropdown() {
    const fahrzeugDropdown = document.getElementById("fahrzeugDropdown");
    fahrzeugDropdown.innerHTML = '<option value="">Fahrzeug auswählen</option>';
    fahrzeugeDaten.forEach(f => {
        if (istFahrzeugVerfuegbar(f.name)) {
            const option = document.createElement("option");
            option.value = f.name;
            option.textContent = f.name;
            fahrzeugDropdown.appendChild(option);
        }
    });
}

function renderFahrzeugList() {
    const fahrzeugListContainer = document.getElementById("fahrzeugList");
    fahrzeugListContainer.innerHTML = "";

    aktuelleFahrzeuge.forEach((f) => {
        const div = document.createElement("div");
        div.classList.add("fahrzeug-item");

        const span = document.createElement("span");
        span.textContent = f.name;
        div.appendChild(span);

        const abziehenBtn = document.createElement("button");
        abziehenBtn.classList.add("fahrzeug-abziehen-btn");
        abziehenBtn.textContent = "Löschen";
        abziehenBtn.onclick = () => {
            abziehenFahrzeug(f.name);
        };
        div.appendChild(abziehenBtn);

        fahrzeugListContainer.appendChild(div);
    });
}

function abziehenFahrzeug(fahrzeugName) {
    aktuelleFahrzeuge = aktuelleFahrzeuge.filter((f) => f.name !== fahrzeugName);
    renderFahrzeugList();
    renderFahrzeugDropdown();
    showSuccess(`${fahrzeugName} wurde abgezogen.`);
}

document.getElementById("fahrzeugDropdown").addEventListener("change", () => {
    const selectedName = fahrzeugDropdown.value;
    if (!selectedName) return;

    const fahrzeug = fahrzeugeDaten.find(f => f.name === selectedName);
    if (fahrzeug && istFahrzeugVerfuegbar(fahrzeug.name)) {
        aktuelleFahrzeuge.push(fahrzeug);
        renderFahrzeugList();
        renderFahrzeugDropdown();
        showSuccess(`${fahrzeug.name} wurde hinzugefügt.`);
    }
});

function fahrzeugHinzufuegen(einsatzId) {
    const einsatz = einsaetze.find(e => e.id === einsatzId);
    if (einsatz && nachrueckFahrzeuge[einsatzId].length > 0) {
        nachrueckFahrzeuge[einsatzId].forEach(fahrzeug => {
            if (!einsatz.fahrzeuge.some(f => f.name === fahrzeug.name)) {
                einsatz.fahrzeuge.push(fahrzeug);
            }
        });
        nachrueckFahrzeuge[einsatzId] = [];
        save();
        renderEinsaetze();
        renderFahrzeugDropdown();
        showSuccess("Vorgemerkte Fahrzeuge wurden hinzugefügt.");
    } else {
        alert("Keine gültigen Fahrzeuge vorgemerkt.");
    }
}

document.addEventListener("change", function (e) {
    if (e.target && e.target.id.startsWith("nachrueckDropdown-")) {
        const einsatzId = parseInt(e.target.id.split("-")[1]);
        const name = e.target.value;
        if (!name) return;

        const fahrzeug = fahrzeugeDaten.find(f => f.name === name);
        if (fahrzeug && istFahrzeugVerfuegbar(fahrzeug.name)) {
            if (!nachrueckFahrzeuge[einsatzId].some(f => f.name === name)) {
                nachrueckFahrzeuge[einsatzId].push(fahrzeug);
                renderEinsaetze();
            }
        }
    }
});

setInterval(() => {
    save();
}, 10000);

// Initialisierung
document.getElementById("einsatzErstellenBtn").addEventListener("click", addEinsatz);
renderEinsaetze();
renderFahrzeugList();
renderFahrzeugDropdown();

// ====================
// Leaflet-Karte
// ====================
const map = L.map('map').setView([48.35327, 9.89901], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap-Mitwirkende'
}).addTo(map);

const marker = L.marker([51.1657, 10.4515], {
    draggable: true
}).addTo(map);

map.on('click', function (e) {
    marker.setLatLng(e.latlng);
    koordinaten = [e.latlng.lat, e.latlng.lng];
    updateCoordsDisplay();
});

marker.on('dragend', function () {
    koordinaten = [marker.getLatLng().lat, marker.getLatLng().lng];
    updateCoordsDisplay();
});

function updateCoordsDisplay() {
    const display = document.getElementById("coordsDisplay");
    display.textContent = koordinaten ? `${koordinaten[0].toFixed(5)}, ${koordinaten[1].toFixed(5)}` : "Keine Position gewählt";
}