const fahrzeugSelect = document.getElementById("fahrzeugSelect");
const einsatzText = document.getElementById("einsatzText");
const einsatzInfo = document.getElementById("einsatzInfo");
const statusButtons = document.getElementById("statusButtons");

// ===== Status-Benennung =====
const statusTexte = {
    1: "Einsatzbereit über Funk erreichbar",
    2: "Einsatzbereit auf Wache",
    3: "Einsatzauftrag übernommen",
    4: "Am Einsatzort angekommen",
    5: "Sprechwunsch",
    6: "Nicht Einsatzbereit"
};

// ===== Fahrzeuge laden =====
function ladeFahrzeuge() {
    const fahrzeuge = JSON.parse(localStorage.getItem("fahrzeugeDaten")) || [];
    fahrzeuge.forEach(f => {
        const opt = document.createElement("option");
        opt.value = f.name;
        opt.textContent = `${f.name} (${f.typ})`;
        fahrzeugSelect.appendChild(opt);
    });
}

// ===== Einsatz für Fahrzeug finden =====
function findeEinsatz(fahrzeugName) {
    const alleEinsaetze = JSON.parse(localStorage.getItem("einsaetze")) || [];

    const zugewiesenerEinsatz = alleEinsaetze
        .sort((a, b) => new Date(b.zeit) - new Date(a.zeit))
        .find(e => e.fahrzeuge?.some(f => f.name === fahrzeugName));

    if (zugewiesenerEinsatz) {
        return `${zugewiesenerEinsatz.beschreibung} – ${zugewiesenerEinsatz.strasse} ${zugewiesenerEinsatz.hausnummer}, ${zugewiesenerEinsatz.ort}`;
    }
    return "Kein Einsatz zugewiesen";
}

// ===== Auswahl-Handler =====
fahrzeugSelect.addEventListener("change", () => {
    const fahrzeug = fahrzeugSelect.value;
    if (!fahrzeug) return;

    einsatzText.textContent = findeEinsatz(fahrzeug);
    einsatzInfo.classList.remove("hidden");
    statusButtons.classList.remove("hidden");

    // Aktuellen Status aus Storage holen und Button aktiv setzen
    const gespeicherterStatus = localStorage.getItem(`status_${fahrzeug}`);
    if (gespeicherterStatus) {
        markiereAktivenStatus(gespeicherterStatus);
    }
});

// ===== Aktiven Button visuell markieren =====
function markiereAktivenStatus(statusText) {
    document.querySelectorAll("#statusButtons button").forEach(btn => {
        const btnStatusText = statusTexte[btn.dataset.status];
        if (btnStatusText === statusText) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
}

// ===== Status-Klick =====
document.querySelectorAll("#statusButtons button").forEach(button => {
    button.addEventListener("click", () => {
        const fahrzeug = fahrzeugSelect.value;
        const statusNummer = button.dataset.status;
        const statusText = statusTexte[statusNummer];

        // Speichern
        localStorage.setItem(`status_${fahrzeug}`, statusText);

        // Aktiven Button markieren
        markiereAktivenStatus(statusText);
    });
});

// ===== Funktion für Standort und Navigation =====
function getCurrentLocationAndNavigate() {
    if (navigator.geolocation) {
        // Aktuellen Standort des Nutzers abrufen
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            const einsatzTextContent = einsatzText.textContent;
            const einsatzDetails = einsatzTextContent.split(" – ");

            if (einsatzDetails.length > 1) {
                // Die Adresse wird aufgeteilt und auf Vollständigkeit überprüft
                const [beschreibung, adresse] = einsatzDetails;
                const addressParts = adresse.split(", ");

                // Sicherstellen, dass Straße, Hausnummer und Ort vorhanden sind
                if (addressParts.length === 2) {
                    const [strasseHausnummer, ort] = addressParts;
                    const address = `${strasseHausnummer}, ${ort}`;

                    // Google Maps URL mit den Koordinaten und der vollständigen Adresse
                    const googleMapsUrl = `https://www.google.com/maps/dir/${lat},${lon}/${encodeURIComponent(address)}`;
                    
                    // Google Maps im neuen Tab öffnen, der die Navigation startet
                    window.open(googleMapsUrl, "_blank");
                } else {
                    alert("Die Adresse des Einsatzortes ist unvollständig oder falsch formatiert.");
                }
            } else {
                alert("Kein Einsatzort verfügbar.");
            }
        }, (error) => {
            alert("Standort konnte nicht ermittelt werden.");
        });
    } else {
        alert("Geolocation wird in diesem Browser nicht unterstützt.");
    }
}

// Event Listener für den "Zum Einsatzort navigieren"-Button
document.getElementById("navigateBtn").addEventListener("click", getCurrentLocationAndNavigate);

// ===== Initialisierung =====
window.onload = () => {
    ladeFahrzeuge();
};
