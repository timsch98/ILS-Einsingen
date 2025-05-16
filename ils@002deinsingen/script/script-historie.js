    const historie = JSON.parse(localStorage.getItem("historie")) || [];
    const einsaetze = JSON.parse(localStorage.getItem("einsaetze")) || [];

    function saveAll() {
      localStorage.setItem("historie", JSON.stringify(historie));
      localStorage.setItem("einsaetze", JSON.stringify(einsaetze));
    }

    function showSuccess(msg) {
      const m = document.getElementById("successMessage");
      m.textContent = msg;
      m.style.display = "block";
      setTimeout(() => m.style.display = "none", 3000);
    }

    function wiederherstellen(id) {
      const index = historie.findIndex(e => e.id === id);
      if (index > -1) {
        einsaetze.push(historie[index]);
        historie.splice(index, 1);
        saveAll();
        renderHistorie();
        showSuccess("Einsatz wurde wiederhergestellt.");
      }
    }

    function loeschen(id) {
      if (!confirm("Möchtest du diesen Einsatz wirklich löschen?")) return;
      const index = historie.findIndex(e => e.id === id);
      if (index > -1) {
        historie.splice(index, 1);
        saveAll();
        renderHistorie();
        showSuccess("Einsatz wurde gelöscht.");
      }
    }

    function renderHistorie() {
      const container = document.getElementById("historieContainer");
      container.innerHTML = "";

      if (historie.length === 0) {
        container.innerHTML = "<p style='text-align:center;'>Keine abgeschlossenen Einsätze.</p>";
        return;
      }

      historie.forEach(e => {
        const div = document.createElement("div");
        div.className = "einsatz";

        const fahrzeuge = e.fahrzeuge.length
          ? e.fahrzeuge.map(f => `<li>${f}</li>`).join("")
          : "<li>Keine Fahrzeuge</li>";

        div.innerHTML = `
          <strong>${e.ort}</strong> – ${new Date(e.zeit).toLocaleString()}<br>
          ${e.beschreibung}<br>
          <em>Fahrzeuge:</em><ul>${fahrzeuge}</ul>
          <button class="restore-button" onclick="wiederherstellen(${e.id})">Wiederherstellen</button>
          <button class="delete-button" onclick="loeschen(${e.id})"> Löschen</button>
        `;

        container.appendChild(div);
      });
    }

    renderHistorie();