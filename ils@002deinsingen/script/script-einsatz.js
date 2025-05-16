// ======= Variablen & Initialisierung =======
let einsaetze = JSON.parse(localStorage.getItem("einsaetze")) || [];
let fahrzeugeDaten = JSON.parse(localStorage.getItem("fahrzeugeDaten")) || [];
let aktuelleFahrzeuge = [];
let historie = JSON.parse(localStorage.getItem("historie")) || [];
let vorgemerkteFahrzeuge = {}; // { einsatzId: [fahrzeugObjekte] }
let koordinaten = null;

// ======= Speichern in localStorage =======
function saveData() {
  localStorage.setItem("einsaetze", JSON.stringify(einsaetze));
  localStorage.setItem("fahrzeugeDaten", JSON.stringify(fahrzeugeDaten));
  localStorage.setItem("historie", JSON.stringify(historie));
}

// ======= Erfolgsmeldung anzeigen =======
function showSuccess(message) {
  const msgDiv = document.getElementById("successMessage");
  msgDiv.textContent = message;
  msgDiv.style.display = "block";
  setTimeout(() => (msgDiv.style.display = "none"), 3000);
}

// ======= Einsatz hinzufügen =======
function addEinsatz() {
  const ort = document.getElementById("einsatzOrt").value.trim();
  const strasse = document.getElementById("einsatzStrasse").value.trim();
  const hausnummer = document.getElementById("einsatzHausnummer").value.trim();
  const beschreibung = document.getElementById("einsatzBeschreibung").value.trim();

  if (!beschreibung) {
    alert("Bitte eine Beschreibung angeben.");
    return;
  }

  if (!koordinaten && (!ort || !strasse || !hausnummer)) {
    alert("Bitte entweder eine Adresse oder eine Position auf der Karte angeben.");
    return;
  }

  const einsatz = {
    id: Date.now(),
    ort,
    strasse,
    hausnummer,
    zeit: new Date().toISOString(),
    beschreibung,
    fahrzeuge: [...aktuelleFahrzeuge],
    koordinaten: koordinaten || null,
  };

  einsaetze.push(einsatz);
  vorgemerkteFahrzeuge[einsatz.id] = [];

  saveData();
  renderEinsaetze();
  showSuccess("Einsatz erfolgreich erstellt.");

  // Formulareingaben zurücksetzen
  document.getElementById("einsatzOrt").value = "";
  document.getElementById("einsatzStrasse").value = "";
  document.getElementById("einsatzHausnummer").value = "";
  document.getElementById("einsatzBeschreibung").value = "";
  aktuelleFahrzeuge = [];
  koordinaten = null;
  updateCoordsDisplay();
  renderFahrzeugListe();
  renderFahrzeugDropdown();
}

// ======= Fahrzeugverfügbarkeit prüfen =======
function istFahrzeugVerfuegbar(name) {
  const inEinsaetzen = einsaetze.some(e =>
    e.fahrzeuge.some(fz => fz.name === name)
  );
  const inAktuell = aktuelleFahrzeuge.some(fz => fz.name === name);
  return !inEinsaetzen && !inAktuell;
}

// ======= Einsätze rendern =======
function renderEinsaetze() {
  const container = document.getElementById("einsaetze");
  container.innerHTML = "";

  einsaetze.forEach(einsatz => {
    if (!vorgemerkteFahrzeuge[einsatz.id]) vorgemerkteFahrzeuge[einsatz.id] = [];

    const einsatzDiv = document.createElement("div");
    einsatzDiv.classList.add("einsatz");

    let fahrzeugHTML = "<h4>Fahrzeuge zugeordnet:</h4>";
    if (einsatz.fahrzeuge.length > 0) {
      fahrzeugHTML += "<ul>";
      einsatz.fahrzeuge.forEach(fz => {
        const status = localStorage.getItem(`status_${fz.name}`) || "Kein Status";
        fahrzeugHTML += `
          <li>
            <strong>${fz.name}</strong> (Status: ${status})
            <button onclick="entferneFahrzeug(${einsatz.id}, '${fz.name}')">Fahrzeug abziehen</button>
          </li>`;
      });
      fahrzeugHTML += "</ul>";
    } else {
      fahrzeugHTML += "<p>Keine Fahrzeuge zugeordnet</p>";
    }

    let vorgemerktHTML = "";
    if (vorgemerkteFahrzeuge[einsatz.id].length > 0) {
      vorgemerktHTML = `
        <h5>Vorgemerkte Fahrzeuge:</h5>
        <ul>
          ${vorgemerkteFahrzeuge[einsatz.id]
            .map(
              fz => `
            <li>
              ${fz.name}
              <button onclick="entferneVorgemerktesFahrzeug(${einsatz.id}, '${fz.name}')">Entfernen</button>
            </li>
          `
            )
            .join("")}
        </ul>`;
    }

    const verfuegbareFz = fahrzeugeDaten
      .filter(
        fz =>
          istFahrzeugVerfuegbar(fz.name) &&
          !vorgemerkteFahrzeuge[einsatz.id].some(v => v.name === fz.name)
      )
      .map(fz => `<option value="${fz.name}">${fz.name}</option>`)
      .join("");

    einsatzDiv.innerHTML = `
      <h3>${einsatz.ort || "Ort unbekannt"}, ${einsatz.strasse || ""} ${einsatz.hausnummer || ""}</h3>
      <p>${einsatz.beschreibung}</p>
      <p><strong>Koordinaten:</strong> ${
        einsatz.koordinaten
          ? einsatz.koordinaten.map(c => c.toFixed(5)).join(", ")
          : "Keine Angabe"
      }</p>
      <p><strong>Erstellt am:</strong> ${new Date(einsatz.zeit).toLocaleString()}</p>
      ${fahrzeugHTML}
      <div class="nachrueck-container">
        <select id="nachrueckDropdown-${einsatz.id}">
          <option value="">Fahrzeug auswählen</option>
          ${verfuegbareFz}
        </select>
        ${vorgemerktHTML}
      </div>
      <button onclick="fahrzeugeHinzufuegen(${einsatz.id})">Vorgemerkte Fahrzeuge hinzufügen</button>
      <button onclick="abschliessen(${einsatz.id})">Einsatz abschließen</button>
    `;

    container.appendChild(einsatzDiv);
  });
}

// ======= Fahrzeug entfernen =======
function entferneFahrzeug(einsatzId, fahrzeugName) {
  const einsatz = einsaetze.find(e => e.id === einsatzId);
  if (!einsatz) return;

  einsatz.fahrzeuge = einsatz.fahrzeuge.filter(fz => fz.name !== fahrzeugName);
  saveData();
  renderEinsaetze();
  renderFahrzeugDropdown();
  showSuccess(`Fahrzeug ${fahrzeugName} wurde vom Einsatz entfernt.`);
}

function entferneVorgemerktesFahrzeug(einsatzId, fahrzeugName) {
  if (!vorgemerkteFahrzeuge[einsatzId]) return;

  vorgemerkteFahrzeuge[einsatzId] = vorgemerkteFahrzeuge[einsatzId].filter(
    fz => fz.name !== fahrzeugName
  );
  renderEinsaetze();
  renderFahrzeugDropdown();
  showSuccess(`Vorgemerktes Fahrzeug ${fahrzeugName} entfernt.`);
}

function abschliessen(einsatzId) {
  const index = einsaetze.findIndex(e => e.id === einsatzId);
  if (index === -1) return;

  const [abgeschlossen] = einsaetze.splice(index, 1);
  abgeschlossen.status = "abgeschlossen";
  historie.push(abgeschlossen);
  saveData();
  showSuccess("Einsatz wurde abgeschlossen und in die Historie verschoben.");
  renderEinsaetze();
  renderFahrzeugDropdown();
}

// ======= Fahrzeug Dropdown rendern =======
function renderFahrzeugDropdown() {
  const dropdown = document.getElementById("fahrzeugDropdown");
  dropdown.innerHTML = '<option value="">Fahrzeug auswählen</option>';

  fahrzeugeDaten.forEach(fz => {
    if (istFahrzeugVerfuegbar(fz.name)) {
      const option = document.createElement("option");
      option.value = fz.name;
      option.textContent = fz.name;
      dropdown.appendChild(option);
    }
  });
}

// ======= Fahrzeug Liste rendern (aktuelle Fahrzeuge) =======
function renderFahrzeugListe() {
  const container = document.getElementById("fahrzeugList");
  container.innerHTML = "";

  aktuelleFahrzeuge.forEach(fz => {
    const div = document.createElement("div");
    div.classList.add("fahrzeug-item");

    const span = document.createElement("span");
    span.textContent = fz.name;

    const btn = document.createElement("button");
    btn.textContent = "Entfernen";
    btn.onclick = () => {
      abziehenFahrzeug(fz.name);
    };

    div.appendChild(span);
    div.appendChild(btn);
    container.appendChild(div);
  });
}

// ======= Fahrzeug aus aktueller Liste entfernen =======
function abziehenFahrzeug(name) {
  aktuelleFahrzeuge = aktuelleFahrzeuge.filter(fz => fz.name !== name);
  renderFahrzeugListe();
  renderFahrzeugDropdown();
  showSuccess(`Fahrzeug ${name} wurde entfernt.`);
}

// ======= Vorgemerkte Fahrzeuge einem Einsatz hinzufügen =======
function fahrzeugeHinzufuegen(einsatzId) {
  const einsatz = einsaetze.find(e => e.id === einsatzId);
  if (!einsatz || !vorgemerkteFahrzeuge[einsatzId] || vorgemerkteFahrzeuge[einsatzId].length === 0) {
    alert("Keine vorgemerkten Fahrzeuge zum Hinzufügen.");
    return;
  }

  vorgemerkteFahrzeuge[einsatzId].forEach(fz => {
    if (!einsatz.fahrzeuge.some(eFz => eFz.name === fz.name)) {
      einsatz.fahrzeuge.push(fz);
    }
  });

  vorgemerkteFahrzeuge[einsatzId] = [];
  saveData();
  renderEinsaetze();
  renderFahrzeugDropdown();
  showSuccess("Vorgemerkte Fahrzeuge wurden dem Einsatz hinzugefügt.");
}

// ======= Event Listener für Nachrück Dropdown =======
document.addEventListener("change", e => {
  if (e.target && e.target.id.startsWith("nachrueckDropdown-")) {
    const einsatzId = parseInt(e.target.id.split("-")[1]);
    const name = e.target.value;
    if (!name) return;

    const fahrzeug = fahrzeugeDaten.find(fz => fz.name === name);
    if (fahrzeug && istFahrzeugVerfuegbar(fahrzeug.name)) {
      if (!vorgemerkteFahrzeuge[einsatzId]) vorgemerkteFahrzeuge[einsatzId] = [];

      if (!vorgemerkteFahrzeuge[einsatzId].some(fz => fz.name === name)) {
        vorgemerkteFahrzeuge[einsatzId].push(fahrzeug);
        renderEinsaetze();
      }
    }
  }
});

// ======= Event Listener für Fahrzeug Dropdown =======
document.getElementById("fahrzeugDropdown").addEventListener("change", function () {
  const name = this.value;
  if (!name) return;

  const fahrzeug = fahrzeugeDaten.find(fz => fz.name === name);
  if (fahrzeug && istFahrzeugVerfuegbar(fahrzeug.name)) {
    aktuelleFahrzeuge.push(fahrzeug);
    renderFahrzeugListe();
    renderFahrzeugDropdown();
    showSuccess(`Fahrzeug ${fahrzeug.name} hinzugefügt.`);
  }
  this.value = "";
});

// ======= Intervall zum automatischen Speichern =======
setInterval(saveData, 10000);

// ======= Leaflet Map Setup =======
const map = L.map("map").setView([48.35327, 9.89901], 15);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap-Mitwirkende",
}).addTo(map);

const marker = L.marker([48.35327, 9.89901], { draggable: true }).addTo(map);

map.on("click", e => {
  marker.setLatLng(e.latlng);
  koordinaten = [e.latlng.lat, e.latlng.lng];
  updateCoordsDisplay();
});

marker.on("dragend", () => {
  const pos = marker.getLatLng();
  koordinaten = [pos.lat, pos.lng];
  updateCoordsDisplay();
});

function updateCoordsDisplay() {
  const display = document.getElementById("coordsDisplay");
  display.textContent = koordinaten
    ? `${koordinaten[0].toFixed(5)}, ${koordinaten[1].toFixed(5)}`
    : "Keine Position gewählt";
}

// ======= Initiales Rendering und Setup =======
document
  .getElementById("einsatzErstellenBtn")
  .addEventListener("click", addEinsatz);

renderEinsaetze();
renderFahrzeugListe();
renderFahrzeugDropdown();
updateCoordsDisplay();
