let currentCode = "";
const maxDigits = 4; // Code à 4 chiffres (ou 3 selon ton wireframe)
const display = document.getElementById('display');

function updateDisplay() {
    // Remplace les chiffres par des points ou affiche les chiffres
    // Pour le style wireframe on affiche le chiffre.
    display.innerText = currentCode;
}

function addNumber(num) {
    if (currentCode.length < maxDigits) {
        currentCode += num;
        updateDisplay();
    }
}

function backspace() {
    currentCode = currentCode.slice(0, -1);
    updateDisplay();
}

function validate() {
    // EXEMPLE DE LOGIQUE DE JEU
    if (currentCode === "") return;

    console.log("Code entré : " + currentCode);

    // Simulation de validation
    if (currentCode === "1234") { // Remplace par ton vrai code
        alert("CODE ACCEPTÉ. ACCÈS AUTORISÉ.");
        // Redirection page suivante...
    } else {
        // Effet Erreur
        display.classList.add('shake');
        setTimeout(() => {
            display.classList.remove('shake');
            currentCode = "";
            updateDisplay();
        }, 500);
    }
}