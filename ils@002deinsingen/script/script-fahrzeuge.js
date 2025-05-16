        // ===== DATENLADUNG UND SPEICHERN =====
        let fahrzeugeDaten = JSON.parse(localStorage.getItem("fahrzeugeDaten")) || [];

        // Speichern der Daten im LocalStorage
        function saveData() {
            console.log("Speichere Daten:", fahrzeugeDaten); // Debugging-Ausgabe
            localStorage.setItem("fahrzeugeDaten", JSON.stringify(fahrzeugeDaten));
        }

        // ===== FAHRZEUGVERWALTUNG =====
        function fahrzeugHinzufuegen() {
            const name = document.getElementById('fahrzeugName').value.trim();
            const typ = document.getElementById('fahrzeugTyp').value.trim();

            if (!name || !typ) {
                alert('Bitte Fahrzeugname und -typ eingeben.');
                return;
            }

            // Neues Fahrzeug in das Array einfügen
            fahrzeugeDaten.push({ name, typ });
            document.getElementById('fahrzeugName').value = '';  // Eingabefeld zurücksetzen
            document.getElementById('fahrzeugTyp').value = '';  // Eingabefeld zurücksetzen

            saveData();  // Daten im LocalStorage speichern
            renderFahrzeugListe();  // Fahrzeugliste neu rendern
        }

        function renderFahrzeugListe() {
            const tabelle = document.getElementById('fahrzeugTabelle').querySelector('tbody');
            tabelle.innerHTML = ''; // Tabelle zurücksetzen

            // Fahrzeuge aus fahrzeugeDaten durchlaufen und anzeigen
            fahrzeugeDaten.forEach((f, index) => {
                const neueZeile = tabelle.insertRow();
                const zelleName = neueZeile.insertCell(0);
                const zelleTyp = neueZeile.insertCell(1);
                const zelleAktion = neueZeile.insertCell(2);

                zelleName.textContent = f.name;
                zelleTyp.textContent = f.typ;
                zelleAktion.innerHTML = `<button class="delete-button" onclick="diesesFahrzeugLoeschen(${index})">Löschen</button>`;
            });
        }

        function diesesFahrzeugLoeschen(index) {
            if (confirm(`Möchtest du dieses Fahrzeug wirklich löschen?`)) {
                fahrzeugeDaten.splice(index, 1);  // Fahrzeug aus dem Array löschen
                saveData();  // Daten im LocalStorage speichern
                renderFahrzeugListe();  // Fahrzeugliste neu rendern
            }
        }

        // ===== INIT =====
        window.onload = () => {
            // Fahrzeugliste rendern, wenn die Seite geladen wird
            renderFahrzeugListe();
        };