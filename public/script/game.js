
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
let player1;
let player2;
let tablePlayer={}
let currentRoom;

console.log("je suis dans game")
window.socket.on('roomReady', function (data) {
    console.log('Room', data.roomID, 'is ready');
    //currentRoom= data.roomID;
    console.log('Joueurs dans la salle player 1:', data.player1);
    console.log('Joueurs dans la salle player 2:', data.player2);
    player1=data.player1;
    player2=data.player2;


    updatePlayerList([data.player1, data.player2]);
    updatePlayerNames(data.player1, data.player2);


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

//console.log("currentroom dans roomdredyyy",currentRoom)
});
console.log("currentroom apres roomdredyyy",currentRoom)
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
console.log("currentroom avant joinGame",currentRoom)


window.socket.emit('joinGame', currentRoom);

//window.socket.emit('joinGame', currentRoom);
startButton.addEventListener('click', () => {

   // window.socket.emit('joinGame', currentRoom);
    window.socket.emit('startGame');
    // Émet l'événement 'startGame' au serveur
});



function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function initGame() {
    resetTimer();
    enableStartTimerButton();
}
window.socket.on('room', function(data) {

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

    document.getElementById('player1score').textContent = playerScores[playerScores.player1] || 0;
    document.getElementById('player2score').textContent = playerScores[playerScores.player2] || 0;

     // Log des scores pour débogage
    console.log("Score du joueur 1:", playerScores.player1);
    console.log("Score du joueur 2:", playerScores.player2);
});



    window.socket.on('updateMessage',({message, player}) => {
        if(player === player1) {
            document.getElementById('player1status').textContent = message;
        } else if(player === player2){
            document.getElementById('player2status').textContent = message;
        }
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
    function updateTimerDisplay() {
        document.getElementById('timer').textContent = `Temps restant: ${timeLeft}s`;
    }



// Mélanger un tableau


    window.socket.on('endGame', (message) => {
        //alert(message);
        //initGame(); // Réinitialiser le jeu pour un nouveau tour
    });
   // document.getElementById('player1status').textContent = `Dommage, "${ingredient}" n'est pas un ingrédient de cette recette.`;
    //document.getElementById('player2status').textContent = `Bien joué ! "${ingredient}" est un bon ingrédient.`;



// window.socket.on('disableIngredient', (ingredient) => {
//     const ingredientElement = document.getElementById(ingredient);
//     if (ingredientElement) {
//         ingredientElement.disabled = true;
//         // Désactive l'ingrédient dans l'UI
//         console.log(`L'ingrédient ${ingredient} a été désactivé.`);
//     }
// });

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




