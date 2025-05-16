let availableVoices = [];
let selectedVoice = null;

document.addEventListener('DOMContentLoaded', () => {
    window.speechSynthesis.onvoiceschanged = () => {
        availableVoices = window.speechSynthesis.getVoices();
        selectedVoice = availableVoices.find(v =>
            v.name.includes("Google Deutsch") || v.name.includes("Microsoft Hedda")
        );
    };

    document.getElementById("saveBtn").addEventListener("click", durchsageSpeichern);
    document.getElementById("speakBtn").addEventListener("click", direktDurchsagen);

    renderDurchsageList();
});

function durchsageSpeichern() {
    const text = document.getElementById("durchsageText").value.trim();
    if (!text) {
        alert("Bitte einen Text für die Durchsage eingeben.");
        return;
    }

    let durchsageList = JSON.parse(localStorage.getItem("durchsageList")) || [];
    durchsageList.push({ text, timestamp: new Date().toISOString() });
    localStorage.setItem("durchsageList", JSON.stringify(durchsageList));

    renderDurchsageList();
    document.getElementById("durchsageText").value = "";
}

function direktDurchsagen() {
    const text = document.getElementById("durchsageText").value.trim();
    if (!text) {
        alert("Bitte einen Text für die Durchsage eingeben.");
        return;
    }

    // Direkt vorlesen
    abspielenMitWiederholung(text);

    // Gleichzeitig für Monitor speichern (ohne speichern in durchsageList)
    speichereMonitorDurchsage(text);

    renderDurchsageList();
    document.getElementById("durchsageText").value = "";
}

function speichereMonitorDurchsage(text) {
    if (!text) return;

    // Im localStorage unter "durchsagen" als Array speichern
    let monitorDurchsagen = JSON.parse(localStorage.getItem("durchsagen")) || [];
    monitorDurchsagen.push(text);
    localStorage.setItem("durchsagen", JSON.stringify(monitorDurchsagen));
}

function playDurchsage(index) {
    const durchsageList = JSON.parse(localStorage.getItem("durchsageList")) || [];
    const text = durchsageList[index].text;
    abspielenMitWiederholung(text);
}

function abspielenMitWiederholung(text) {
    const utterance1 = new SpeechSynthesisUtterance("Achtung: " + text);
    const utterance2 = new SpeechSynthesisUtterance(text);

    utterance1.rate = 0.85;
    utterance2.rate = 0.85;

    if (selectedVoice) {
        utterance1.voice = selectedVoice;
        utterance2.voice = selectedVoice;
    }

    utterance1.onend = () => {
        setTimeout(() => {
            window.speechSynthesis.speak(utterance2);
        }, 500);
    };

    window.speechSynthesis.speak(utterance1);
}

function loescheDurchsage(index) {
    let durchsageList = JSON.parse(localStorage.getItem("durchsageList")) || [];
    durchsageList.splice(index, 1);
    localStorage.setItem("durchsageList", JSON.stringify(durchsageList));
    renderDurchsageList();
}

function renderDurchsageList() {
    const listContainer = document.getElementById("durchsageListe");
    const durchsageList = JSON.parse(localStorage.getItem("durchsageList")) || [];

    if (durchsageList.length === 0) {
        listContainer.innerHTML = "<p>Keine gespeicherten Durchsagen.</p>";
        return;
    }

    listContainer.innerHTML = '';
    durchsageList.forEach((durchsage, index) => {
        const div = document.createElement("div");
        div.classList.add("durchsage");

        const formattedTimestamp = new Date(durchsage.timestamp).toLocaleString();

        div.innerHTML = `
            <span>${durchsage.text}</span>
            <span>${formattedTimestamp}</span>
            <button onclick="playDurchsage(${index})">Abspielen</button>
            <button onclick="loescheDurchsage(${index})">Löschen</button>
        `;
        listContainer.appendChild(div);
    });
}
