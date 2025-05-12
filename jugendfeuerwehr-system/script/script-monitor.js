const gemeldeteEinsaetze = new Map(); // Adresse → Set von Fahrzeugnamen
const eingesetzteKarten = new Map();   // Adresse → { map, marker }

const maxRetries = 3;   // Maximale Anzahl der Versuche für Kartenanfragen
const retryDelay = 1000; // Verzögerung in Millisekunden zwischen den Versuchen

function getAlleEinsaetze() {
    return JSON.parse(localStorage.getItem("einsaetze")) || [];
}

function getEinsatzKey(einsatz) {
    return `${einsatz.strasse}-${einsatz.hausnummer}-${einsatz.plz}-${einsatz.ort}`;
}

function renderMonitor() {
    const container = document.getElementById("monitorEinsaetze");
    const aktive = getAlleEinsaetze().sort((a, b) => new Date(b.zeit) - new Date(a.zeit));
    const vorhandeneKeys = new Set();

    if (aktive.length === 0) {
        container.innerHTML = "<p style='color: gray; font-size: 1.5em;'>Keine aktiven Einsätze</p>";
        gemeldeteEinsaetze.clear();
        eingesetzteKarten.clear();
        return;
    }

    aktive.forEach((einsatz, index) => {
        const einsatzKey = getEinsatzKey(einsatz);
        const fahrzeugNamen = (einsatz.fahrzeuge || []).map(f => f.name);
        const fahrzeugListeHTML = fahrzeugNamen.join("<br>");
        const adresse = `${einsatz.strasse} ${einsatz.hausnummer}, ${einsatz.plz || ""} ${einsatz.ort}`;
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
            <strong>Adresse: ${einsatz.strasse} ${einsatz.hausnummer}, ${einsatz.plz || ""}, ${einsatz.ort}</strong><br><br>
            <strong>Beschreibung:</strong><br>
            ${einsatz.beschreibung}<br><br>
            <div style="font-size: 0.8em">${fahrzeugListeHTML}</div>
            <div id="map-${einsatz.id}" style="height: 300px; margin-top: 1em;"></div>
        `;

        if (div.dataset.lastContent !== inhalt) {
            div.innerHTML = inhalt;
            div.dataset.lastContent = inhalt;
        }

        // Karte einmalig erstellen
        if (!eingesetzteKarten.has(einsatzKey)) {
            const cacheKey = `geocode_${adresse}`;
            const cached = sessionStorage.getItem(cacheKey);

            if (cached) {
                const { lat, lon } = JSON.parse(cached);
                renderMap(lat, lon, einsatz, adresse, einsatzKey);
            } else {
                // Fetch mit Fehlerbehandlung und Retry
                let attempts = 0;

                function fetchLocation() {
                    attempts++;
                    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(adresse)}`)
                        .then(res => {
                            if (!res.ok) {
                                console.error(`HTTP-Fehler beim Geocoding (${adresse}): Status ${res.status}`);
                                throw new Error(`HTTP error! status: ${res.status}`);
                            }
                            return res.json();
                        })
                        .then(data => {
                            if (data && data.length > 0) {
                                const { lat, lon } = data[0];
                                sessionStorage.setItem(cacheKey, JSON.stringify({ lat, lon }));
                                renderMap(lat, lon, einsatz, adresse, einsatzKey);
                            } else {
                                handleError("Kein Standort gefunden für Adresse:", einsatz.id);
                            }
                        })
                        .catch(error => {
                            console.error(`Fehler bei der Geocodierung (${adresse}), Versuch ${attempts} von ${maxRetries}:`, error);
                            if (attempts < maxRetries) {
                                console.warn(`Versuche erneut: Versuch ${attempts} von ${maxRetries} für ${adresse}`);
                                setTimeout(fetchLocation, retryDelay); // Retry mit Verzögerung
                            } else {
                                handleError(`Fehler bei der Kartenabfrage nach ${maxRetries} Versuchen:`, einsatz.id);
                            }
                        });
                }

                fetchLocation();
            }
        }

        // Sprach-Ausgabe bei neuen Fahrzeugen
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

    // Alte Karten/Einsätze entfernen
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

function renderMap(lat, lon, einsatz, adresse, einsatzKey) {
    const mapDiv = document.getElementById(`map-${einsatz.id}`);
    if (mapDiv) {
        const map = L.map(mapDiv).setView([lat, lon], 16);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap-Mitwirkende',
        }).addTo(map);

        const marker = L.marker([lat, lon]).addTo(map).bindPopup(adresse).openPopup();
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
    } else {
        console.error(`Karten-Container mit ID 'map-${einsatzId}' nicht gefunden für Fehleranzeige.`);
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
    setInterval(renderMonitor, 3000); // Alle 3 Sekunden aktualisieren
});