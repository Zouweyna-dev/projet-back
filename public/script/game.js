
//mport { updatePlayerList } from './loading.js';
import {connectSocket} from "./socketUtils.js";
console.log('game.js is loaded');
const token = window.localStorage.getItem('token');
let player1;
let player2;
let correctIngredients;
let timerInterval;
let timerStarted = false;
let timeLeft ;
let username;
let username2;

console.log('toooken1:', token);

function onRoomCreated(data) {
    console.log('Joueurs dans la salle player 1:', data.player1);
    console.log('Joueurs dans la salle player 2:', data.player2);
    console.log('Room', data.roomID, 'is ready');
    username=data.player1;
    console.log('username dans room', username, 'is ready');

    //updatePlayerNames(player1, player2);
}
function onUsersUpdated(data){
    username2=data[0];
    console.log("userUpdate",data);

}

window.socket = connectSocket(token, onRoomCreated, onUsersUpdated);
console.log("je suis dans game")


function updatePlayerList(users) {
    const playerList = document.getElementById('playerList');
    if (!Array.isArray(users)) {
        users = [users];
    }
    playerList.innerHTML = "";
    users.forEach(user => {
        const newPlayer = document.createElement('li');
        newPlayer.textContent = `${user} est connecté`;
        playerList.appendChild(newPlayer);
    });
}
window.socket.on('roomReady', function (data) {

    localStorage.setItem('roomId', data.roomId);
    console.log('Room', data, 'is ready');

    console.log('Joueurs dans la salle player 1:', data.players[0].username);
    console.log('Joueurs dans la salle player 2:', data.players[1].username);
    player1=data.players[0].username;
    player2=data.players[1].username;

    updatePlayerList([player1, player2]);
    updatePlayerNames(player1, player2);
    initIngredient(data);
    initGame();
});
function updatePlayerNames(player1, player2) {
    document.getElementById('player1Name').textContent = player1;
    document.getElementById('player2Name').textContent = player2;
}
let roomId = localStorage.getItem('roomId');
window.socket.emit('startGame');
function initIngredient(data){

    document.getElementById('recipe').textContent =
        `Recette: ${data.recipe}`;
    correctIngredients = data.ingredients;
    shuffleArray(data.allIngredients);
    const playerGrid = document.getElementById('player-grid');
    playerGrid.innerHTML = '';

    data.allIngredients.forEach(ingredient => {
        const button1 = createIngredientButton(ingredient);
        playerGrid.appendChild(button1);
    });
}
// function selectIngredient({ ingredient}) {
//
// }

function createIngredientButton(ingredient) {
    const button = document.createElement('button');
    button.className = 'ingredient';
    button.onclick = () => {
        console.log("username dans select ",username2);
        window.socket.emit('selectIngredient', { ingredient });
    };
    button.textContent = ingredient;
    return button;
}
window.socket.on('updateTimer', (timeLeft) => {
    document.getElementById('timer').textContent = `Temps restant: ${timeLeft}s`;
});

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


console.log("socket",window.socket);
console.log("currentroom avant joinGame",roomId);


function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function initGame() {
    resetTimer();
    //enableStartTimerButton();
}

console.log("nooon")

// Réinitialiser le chronomètre
function resetTimer() {
    timerStarted = false;
    timeLeft=40;
    updateTimerDisplay();
}

// Activer le bouton de démarrage du chronomètre
// function enableStartTimerButton() {
//     startButton.disabled = false;
//     startButton.textContent = 'Lancer le chronomètre';
// }




// Mettez à jour les scores des joueurs
window.socket.on('updateScores', function(players) {

    players.forEach((player, index) => {
        // En fonction de l'index, sélectionne le bon id de score
        let scoreID = (index === 0) ? 'player1score' : 'player2score';
        let playerScoreElement = document.querySelector(`#${scoreID}`);

        if(playerScoreElement) {
            playerScoreElement.textContent = `Score: ${player.score}`;
        }
    });

    // Affiche les scores dans la console
    console.log("Score du joueur 1:",players[0]?.username, players[0]?.score);
    console.log("Score du joueur 2:", players[1]?.username, players[1]?.score);
});

    window.socket.on('updateMessage',({message, player}) => {
        if(player === player1) {
            document.getElementById('player1status').textContent = message;
        } else if(player === player2){
            document.getElementById('player2status').textContent = message;
        }
    });


function updateTimerDisplay() {
        document.getElementById('timer').textContent = `Temps restant: ${timeLeft}s`;
    }

const quitButton = document.getElementById('quitButton');
quitButton.addEventListener('click', () => {
    // Émettre un événement au serveur pour informer de la déconnexion
    socket.emit('playerQuit', { roomId: localStorage.getItem('roomId'), player: socket.username });
});
socket.on('playerLeft', ({ player, message }) => {
    // Afficher un message à l'autre joueur
    alert(message);

    // Optionnel : Mettre à jour l'interface pour refléter le départ du joueur
    // Par exemple, vous pouvez désactiver les boutons ou rediriger l'utilisateur
});

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




