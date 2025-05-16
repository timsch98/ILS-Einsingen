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
        const ortAnzeigen = zugewiesenerEinsatz.strasse && zugewiesenerEinsatz.hausnummer && zugewiesenerEinsatz.ort;
        const ortText = ortAnzeigen
            ? `${zugewiesenerEinsatz.strasse} ${zugewiesenerEinsatz.hausnummer}, ${zugewiesenerEinsatz.ort}`
            : "📍 Einsatzort per Koordinaten";
        return `${zugewiesenerEinsatz.beschreibung} – ${ortText}`;
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

        localStorage.setItem(`status_${fahrzeug}`, statusText);
        markiereAktivenStatus(statusText);
    });
});

// ===== Navigation mit Priorität auf Koordinaten =====
function getCurrentLocationAndNavigate() {
    if (!navigator.geolocation) {
        alert("Geolocation wird in diesem Browser nicht unterstützt.");
        return;
    }

    navigator.geolocation.getCurrentPosition((position) => {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;

        const fahrzeug = fahrzeugSelect.value;
        const alleEinsaetze = JSON.parse(localStorage.getItem("einsaetze")) || [];
        const einsatz = alleEinsaetze.find(e => e.fahrzeuge?.some(f => f.name === fahrzeug));

        if (!einsatz) {
            alert("Kein Einsatz für dieses Fahrzeug gefunden.");
            return;
        }

        const hatKoordinaten = Array.isArray(einsatz.koordinaten) && einsatz.koordinaten.length === 2;
        const adresseVollständig = einsatz.strasse && einsatz.hausnummer && einsatz.ort;

        let zielUrl = "";

        if (hatKoordinaten) {
            const [zielLat, zielLon] = einsatz.koordinaten;
            zielUrl = `https://www.google.com/maps/dir/${userLat},${userLon}/${zielLat},${zielLon}`;
        } else if (adresseVollständig) {
            const zielAdresse = `${einsatz.strasse} ${einsatz.hausnummer}, ${einsatz.ort}`;
            zielUrl = `https://www.google.com/maps/dir/${userLat},${userLon}/${encodeURIComponent(zielAdresse)}`;
        } else {
            alert("Weder Adresse noch Koordinaten sind für diesen Einsatz vollständig.");
            return;
        }

        window.open(zielUrl, "_blank");
    }, () => {
        alert("Standort konnte nicht ermittelt werden.");
    });
}

// ===== Event Listener für Navigation =====
document.getElementById("navigateBtn").addEventListener("click", getCurrentLocationAndNavigate);

// ===== Initialisierung =====
window.onload = () => {
    ladeFahrzeuge();
};
