
import { updatePlayerList } from './loading.js';
import {connectSocket} from "./socketUtils.js";
console.log('game.js is loaded');
// window.onload = function() {
const token = window.localStorage.getItem('token');
console.log('toooken1:', token);

    function onRoomCreated(data) {
        console.log('Joueurs dans la salle player 1:', data.player1);
        console.log('Joueurs dans la salle player 2:', data.player2);

    }

    window.socket = connectSocket(token, onRoomCreated, updatePlayerList);
    // const socket=window.socket;

    let tablePlayer={}
console.log("je suis dans game")
window.socket.on('roomReady', function (data) {
        console.log('Room', data.roomID, 'is ready');
        console.log('Joueurs dans la salle player 1:', data.player1);
        console.log('Joueurs dans la salle player 2:', data.player2);

     updatePlayerList([data.player1, data.player2]);
     updatePlayerNames(data.player1, data.player2);

    });


   // }
function updatePlayerNames(player1, player2) {
    document.getElementById('player1Name').textContent = player1;
    document.getElementById('player2Name').textContent = player2;
}
// Partie du jeu


let correctIngredients;
let scores = [0, 0];
let timeLeft = 30;
let timerInterval;
let timerStarted = false;

const startButton = document.getElementById('startTimerButton');
console.log("sockeeeeeettt")
// Écoutez l'événement 'startGame' au chargement du jeu

console.log("socket",window.socket)
startButton.addEventListener('click', () => {
    window.socket.emit('startGame'); // Émet l'événement 'startGame' au serveur
});
    window.socket.on('gameData', function(data) {
        document.getElementById('recipe').textContent =
            `Recette: ${data.recipe}`;
        correctIngredients = data.ingredients;
        shuffleArray(data.allIngredients);
        const playerGrid = document.getElementById('player-grid');
        playerGrid.innerHTML = '';

        data.allIngredients.forEach(ingredient => {
            const button1 = createIngredientButton(ingredient, 1);
            playerGrid.appendChild(button1);
        });
        initGame();
    });


// Écoutez l'événement de mise à jour du chronomètre
window.socket.on('updateTimer', (timeLeft) => {
    document.getElementById('timer').textContent = `Temps restant: ${timeLeft}s`;
});

// Écoutez l'événement de fin de jeu


    // initGame();

console.log("nooon")


// Réinitialiser le chronomètre
function resetTimer() {
    clearInterval(timerInterval);
    timerStarted = false;
    timeLeft = 30;
    updateTimerDisplay();
}

// Activer le bouton de démarrage du chronomètre
function enableStartTimerButton() {
    startButton.disabled = false;
    startButton.textContent = 'Lancer le chronomètre';
}

// Écoutez la fin du jeu
window.socket.on('endGame', (message) => {
    alert(message);
    initGame();
});

// Créez un bouton pour chaque ingrédient
function createIngredientButton(ingredient, playerNumber) {
    const button = document.createElement('button');
    button.className = 'ingredient';
    button.onclick = () => {
        selectIngredient({ ingredient, player: `player${playerNumber}` });
    };
    button.textContent = ingredient;
    return button;
}

// Mettez à jour les scores des joueurs


window.socket.on('updateScores', (playerScores) => {
    // Vérifiez si playerScores a bien été reçu

    console.log("Mise à jour des scores reçue:", playerScores);
    console.log('playerScores[playerScores.player1] ',playerScores[playerScores.player1] )

    // Met à jour l'affichage des scores
    document.getElementById('player1score').textContent = playerScores[playerScores.player1] || 0; // Défaut à 0 si undefined
    document.getElementById('player2score').textContent = playerScores[playerScores.player2] || 0;

    // Log des scores pour débogage
    console.log("Score du joueur 1:", playerScores.player1);
    console.log("Score du joueur 2:", playerScores.player2);
});

// Sélectionnez un ingrédient
function selectIngredient({ ingredient, player }) {
    window.socket.emit('selectIngredient', { ingredient, player });
}

// Désactivez l'ingrédient sélectionné
window.socket.on('disableIngredient', (ingredient) => {
    const buttons = document.querySelectorAll('.ingredient');

    console.log(`Désactivation de l'ingrédient: ${ingredient}`);
    buttons.forEach(button => {
        if (button.textContent === ingredient) {
            button.disabled = true;
        }
    });
});
window.socket.on('disableIngredient', (ingredient) => {
    const ingredientElement = document.getElementById(ingredient);
    if (ingredientElement) {
        ingredientElement.disabled = true;
        // Désactive l'ingrédient dans l'UI
        console.log(`L'ingrédient ${ingredient} a été désactivé.`);
    }
});

// Mettez à jour l'affichage des scores



// function startTimer() {
//     if (timerStarted) return;
//
//     timerStarted = true;
//     startButton.disabled = true; // Désactivez le bouton une fois cliqué
//     timerInterval = setInterval(() => {
//         timeLeft--;
//         updateTimerDisplay();
//         if (timeLeft <= 0) {
//             clearInterval(timerInterval);
//             window.socket.emit('endGame');
//         }
//     }, 1000);
// }


function updateTimerDisplay() {
    document.getElementById('timer').textContent = `Temps restant: ${timeLeft}s`;
}



// Initialiser le jeu
function initGame() {
    resetTimer();
    enableStartTimerButton();
}

// Mélanger un tableau
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

window.socket.on('endGame', (message) => {
    //alert(message);
    //initGame(); // Réinitialiser le jeu pour un nouveau tour
});

