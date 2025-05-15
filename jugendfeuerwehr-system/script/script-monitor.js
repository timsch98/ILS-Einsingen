// Einsatzmonitor-Skript

const gemeldeteEinsaetze = new Map();
const eingesetzteKarten = new Map();

const maxRetries = 3;
const retryDelay = 1000;

function getAlleEinsaetze() {
    return JSON.parse(localStorage.getItem("einsaetze")) || [];
}

function getEinsatzKey(einsatz) {
    return `${einsatz.strasse}-${einsatz.hausnummer}-${einsatz.plz}-${einsatz.ort}`;
}

function renderMonitor() {
    const container = document.getElementById("monitorEinsaetze");
    const aktive = getAlleEinsaetze()
        .filter(e => Array.isArray(e.fahrzeuge) && e.fahrzeuge.length > 0)
        .sort((a, b) => new Date(b.zeit) - new Date(a.zeit));
    const vorhandeneKeys = new Set();

    if (aktive.length === 0) {
        container.innerHTML = "<p style='color: gray; font-size: 1.5em;'>Keine aktiven Einsätze</p>";
        gemeldeteEinsaetze.clear();
        eingesetzteKarten.clear();
        return;
    }

    aktive.forEach((einsatz, index) => {
        const einsatzKey = getEinsatzKey(einsatz);
        const fahrzeugNamen = einsatz.fahrzeuge.map(f => f.name);
        const anzeigeAdresse = `${einsatz.strasse} ${einsatz.hausnummer}, ${einsatz.plz || ""} ${einsatz.ort}`;
        vorhandeneKeys.add(einsatzKey);

        let div = document.getElementById(`einsatz-${einsatz.id}`);
        if (!div) {
            div = document.createElement("div");
            div.id = `einsatz-${einsatz.id}`;
            div.className = "einsatzAnzeige";
            container.appendChild(div);
        }

        div.style.border = index === 0 ? "3px solid red" : "";
        div.style.animation = index === 0 ? "blink 1s step-start 0s infinite" : "";

        const inhalt = `
            <strong>Einsatzort: ${anzeigeAdresse}</strong><br><br>
            <strong>Beschreibung:</strong><br>
            ${einsatz.beschreibung}<br><br>
            <div style="font-size: 0.8em">${fahrzeugNamen.join("<br>")}</div>
            <div id="map-${einsatz.id}" style="height: 300px; margin-top: 1em;"></div>
        `;

        if (div.dataset.lastContent !== inhalt) {
            div.innerHTML = inhalt;
            div.dataset.lastContent = inhalt;
        }

        const mapDiv = document.getElementById(`map-${einsatz.id}`);
        const karteFehlt = !eingesetzteKarten.has(einsatzKey) || !mapDiv || mapDiv.innerHTML.trim() === "";

        if (karteFehlt) {
            if (Array.isArray(einsatz.koordinaten) && einsatz.koordinaten.length === 2) {
                const [lat, lon] = einsatz.koordinaten;
                renderMap(lat, lon, einsatz, anzeigeAdresse, einsatzKey);
            } else {
                const adresse = `${einsatz.strasse} ${einsatz.hausnummer}, ${einsatz.plz || ""} ${einsatz.ort}`;
                const cacheKey = `geocode_${adresse}`;
                const cached = sessionStorage.getItem(cacheKey);

                if (cached) {
                    const { lat, lon } = JSON.parse(cached);
                    renderMap(lat, lon, einsatz, anzeigeAdresse, einsatzKey);
                } else {
                    let attempts = 0;

                    function fetchLocation() {
                        attempts++;
                        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(adresse)}`)
                            .then(res => {
                                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                                return res.json();
                            })
                            .then(data => {
                                if (data && data.length > 0) {
                                    const { lat, lon } = data[0];
                                    sessionStorage.setItem(cacheKey, JSON.stringify({ lat, lon }));
                                    renderMap(lat, lon, einsatz, anzeigeAdresse, einsatzKey);
                                } else {
                                    handleError("Kein Standort gefunden für Adresse:", einsatz.id);
                                }
                            })
                            .catch(error => {
                                console.error(`Fehler bei der Geocodierung (${adresse}), Versuch ${attempts} von ${maxRetries}:`, error);
                                if (attempts < maxRetries) {
                                    setTimeout(fetchLocation, retryDelay);
                                } else {
                                    handleError(`Fehler bei der Kartenabfrage nach ${maxRetries} Versuchen:`, einsatz.id);
                                }
                            });
                    }

                    fetchLocation();
                }
            }
        }

        const bekannteFahrzeuge = gemeldeteEinsaetze.get(einsatzKey);
        if (!bekannteFahrzeuge) {
            gemeldeteEinsaetze.set(einsatzKey, new Set(fahrzeugNamen));
            playGongAndAnnounce(einsatz, fahrzeugNamen);
        } else {
            const neueFahrzeuge = fahrzeugNamen.filter(name => !bekannteFahrzeuge.has(name));
            if (neueFahrzeuge.length > 0) {
                neueFahrzeuge.forEach(name => bekannteFahrzeuge.add(name));
                announceUpdate(einsatz, neueFahrzeuge);
            }
        }
    });

    Array.from(container.children).forEach(child => {
        if (!aktive.some(e => `einsatz-${e.id}` === child.id)) {
            child.remove();
        }
    });

    for (const key of eingesetzteKarten.keys()) {
        if (!vorhandeneKeys.has(key)) {
            eingesetzteKarten.delete(key);
            gemeldeteEinsaetze.delete(key);
        }
    }
}

function renderMap(lat, lon, einsatz, popupText, einsatzKey) {
    const mapDiv = document.getElementById(`map-${einsatz.id}`);
    if (mapDiv) {
        const map = L.map(mapDiv).setView([lat, lon], 16);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap-Mitwirkende',
        }).addTo(map);

        const marker = L.marker([lat, lon]).addTo(map).bindPopup(popupText).openPopup();
        eingesetzteKarten.set(einsatzKey, { map, marker });
    } else {
        console.error(`Karten-Container mit ID 'map-${einsatz.id}' nicht gefunden.`);
    }
}

function handleError(message, einsatzId) {
    console.error(message, einsatzId);
    const mapDiv = document.getElementById(`map-${einsatzId}`);
    if (mapDiv) {
        mapDiv.innerHTML = "<p style='color: gray;'>Fehler bei der Kartenabfrage</p>";
    }
}

function playGongAndAnnounce(einsatz, fahrzeugNamen) {
    const gongAudio = document.getElementById("gongAudio");
    if (gongAudio.readyState >= 3) {
        gongAudio.play().catch(error => console.error("Fehler beim Abspielen des Gongs:", error));
        gongAudio.onended = () => announceEinsatz(einsatz, fahrzeugNamen);
    } else {
        announceEinsatz(einsatz, fahrzeugNamen);
    }
}

function announceEinsatz(einsatz, fahrzeuge = []) {
    if (!('speechSynthesis' in window)) return;

    let text = `Achtung! Neuer Einsatz in ${einsatz.ort}, ${einsatz.strasse} ${einsatz.hausnummer}, ${einsatz.plz || ""}. Beschreibung: ${einsatz.beschreibung}.`;
    if (fahrzeuge.length > 0) {
        text += ` Folgende Fahrzeuge rücken aus: ${fahrzeuge.join(", ")}.`;
    }

    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'de-DE';
    window.speechSynthesis.speak(msg);
}

function announceUpdate(einsatz, neueFahrzeuge) {
    if (!('speechSynthesis' in window)) return;

    const text = `Neue Aktualisierung für Einsatz in der ${einsatz.strasse}, ${einsatz.ort}. Zusätzlich rückt aus: ${neueFahrzeuge.join(", ")}.`;
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'de-DE';
    window.speechSynthesis.speak(msg);
}

document.getElementById("startButton").addEventListener("click", () => {
    const gongAudio = document.getElementById("gongAudio");
    gongAudio.play().catch(() => {});
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));

    document.getElementById("startButton").style.display = "none";
    document.getElementById("monitorEinsaetze").style.display = "block";

    renderMonitor();
    renderDurchsagen();
    setInterval(renderMonitor, 3000);
    setInterval(renderDurchsagen, 5000);
});

// Map zur Nachverfolgung wie oft vorgelesen wurde
const vorgelesenCount = new Map();

function renderDurchsagen() {
    const durchsagen = JSON.parse(localStorage.getItem("durchsagen")) || [];

    if (durchsagen.length === 0) return;

    // Alle Durchsagen vorlesen, aber nur max 2x pro Durchsage
    for (const text of durchsagen) {
        const count = vorgelesenCount.get(text) || 0;
        if (count < 2) {
            vorlesenMitWiederholung(text);
            vorgelesenCount.set(text, count + 1);
        }
    }

    // Alle Durchsagen entfernen, damit keine neuen Vorlesungen starten
    localStorage.removeItem("durchsagen");
}

// Funktion: zweimaliges Vorlesen mit Pause
function vorlesenMitWiederholung(text) {
    if (!('speechSynthesis' in window)) return;

    const msg1 = new SpeechSynthesisUtterance("Achtung: " + text);
    const msg2 = new SpeechSynthesisUtterance(text);

    msg1.lang = 'de-DE';
    msg2.lang = 'de-DE';

    msg1.rate = 0.85;
    msg2.rate = 0.85;

    msg1.onend = () => {
        setTimeout(() => {
            window.speechSynthesis.speak(msg2);
        }, 500);
    };

    window.speechSynthesis.speak(msg1);
}

document.addEventListener("DOMContentLoaded", () => {
    setInterval(renderDurchsagen, 5000);
});
