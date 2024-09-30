//mport { updatePlayerList } from './loading.js';
import {connectSocket} from "./socketUtils.js";

console.log('game.js is loaded');
const token = window.localStorage.getItem('token');
let player1;
let player2;
let correctIngredients;
let timerStarted = false;

function onRoomCreated(data) {
    console.log('Joueurs dans la salle player 1:', data.player1);
    console.log('Room', data.roomID, 'is ready');
}
window.socket = connectSocket(token, onRoomCreated);

socket.on('usersUpdated', (data) => {
    console.log('Événement usersUpdated reçu:', data);
    onUsersUpdated(data);
    player1 = data[0].username;

    updatePlayerNames(data);
    console.log("userUpdated",data)

});

function onUsersUpdated(users) {
    const playerList = document.getElementById('playerList');
    // if (!Array.isArray(users)) {
    //     users = [users];
    // }
    playerList.innerHTML = "";
    users.forEach(user => {
        const newPlayer = document.createElement('li');
        newPlayer.textContent = `${user.username} est connecté`;
        playerList.appendChild(newPlayer);
    });
}

console.log("je suis dans game")

const resetButton = document.getElementById('resetButton');

resetButton.addEventListener('click', () => {
    console.log("player", token)
    window.socket.emit('wantToPlay', token);
});

window.socket.on('roomReady', function (data) {

    localStorage.setItem('roomId', data.roomId);
    console.log('Room', data, 'is ready');

    console.log('Joueurs dans la salle player 1:', data.players[0].username);
    console.log('Joueurs dans la salle player 2:', data.players[1].username);
    player1 = data.players[0].username;
    player2 = data.players[1].username;
    initIngredient(data);
    initGame();
    window.socket.emit('startGame');
});

function updatePlayerNames(users) {
    if(users[0]) {
        document.getElementById('player1Name').textContent = users[0].username;
        document.getElementById('player1Avatar').src = '/images/chef2.png';

    }
    if(users[1]) {
        document.getElementById('player2Name').textContent = users[1].username;
        document.getElementById('player2Avatar').src = '/images/chef3.png';
    }
}

let roomId = localStorage.getItem('roomId');

// function initIngredient(data) {
//
//     document.getElementById('recipe').textContent =
//         `Recette: ${data.recipe}`;
//     correctIngredients = data.ingredients;
//     shuffleArray(data.allIngredients);
//     const playerGrid = document.getElementById('player-grid');
//     playerGrid.innerHTML = '';
//
//     data.allIngredients.forEach(ingredient => {
//         const button1 = createIngredientButton(ingredient);
//         playerGrid.appendChild(button1);
//     });
// }

function initIngredient(data) {
    const playerGrid = document.getElementById('player-grid');
    document.getElementById('recipe').textContent = `Recette: ${data.recipe}`;
    playerGrid.innerHTML = '';
    console.log(data.allIngredients);
    data.allIngredients.forEach(ingredient => {
        // S'assurer que chaque objet a une propriété `name` et `image`
        console.log(ingredient.name);
        console.log(ingredient.image);
        const button = createIngredientButton(ingredient);
        playerGrid.appendChild(button);
    });
}


function createIngredientButton(ingredient) {
    const button = document.createElement('button');
    button.className = 'ingredient';
    button.onclick = () => {
        console.log("ingrediant dans selct ingred, ",{ingredient});
        window.socket.emit('selectIngredient', { ingredient });
    };

    const img = document.createElement('img');
    img.src = ingredient.image;
    img.alt = ingredient.name;

    button.appendChild(img);

    const label = document.createElement('span');
    label.textContent = ingredient.name;
    button.appendChild(label);

    return button;
}

// function createIngredientButton(ingredient) {
//     const button = document.createElement('button');
//     button.className = 'ingredient';
//     button.onclick = () => {
//
//         window.socket.emit('selectIngredient', {ingredient});
//     };
//     button.textContent = ingredient;
//     return button;
// }


window.socket.on('disableIngredient', (ingredient) => {
    const buttons = document.querySelectorAll('.ingredient-grid button');
    console.log(`Désactivation de l'ingrédient: ${ingredient.ingredient.name}`);
    buttons.forEach(button => {
        if (button.textContent === ingredient.ingredient.name) {
            button.disabled = true;
        }
    });
});


console.log("socket", window.socket);
console.log("currentroom avant joinGame", roomId);


function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function initGame() {
    timerStarted = false;
    updateTimerDisplay()
    //desactiver le jeu quand un joueur quitte
    //enableStartTimerButton();
}
function updateTimerDisplay() {
    document.getElementById('timer').textContent = `${30}s`;
}


// Activer le bouton de démarrage du chronomètre
// function enableStartTimerButton() {
//     startButton.disabled = false;
//     startButton.textContent = 'Lancer le chronomètre';
// }

window.socket.on('updateScores', function (players) {

    players.forEach((player, index) => {
        // En fonction de l'index, sélectionne le bon id de score
        let scoreID = (index === 0) ? 'player1score' : 'player2score';
        let playerScoreElement = document.querySelector(`#${scoreID}`);

        if (playerScoreElement) {
            playerScoreElement.textContent = `Score: ${player.score}`;
        }
    });

    console.log("Score du joueur 1:", players[0]?.username, players[0]?.score);
    console.log("Score du joueur 2:", players[1]?.username, players[1]?.score);
});

window.socket.on('updateMessage', (message, player) => {

    console.log("je suis dans updatemessage", player)
    if (player.username === player1) {
        document.getElementById('player1status').textContent = message;
    } else if (player.username === player2) {
        document.getElementById('player2status').textContent = message;
    }
});



window.socket.on('updateTimer', (timeLeft) => {

    document.getElementById('timer').textContent = `${timeLeft}s`;

    if (timeLeft === 0) {
        const ingredientButtons = document.querySelectorAll('.ingredient');

        ingredientButtons.forEach(button => {
            button.disabled = true;
        });

    }
});
const quitButton = document.getElementById('quitButton');
quitButton.addEventListener('click', function () {
    // const token = localStorage.getItem('token'); // or wherever you store your token
    // window.socket.emit('playerQuit', token);
    window.socket.emit('disconnect');
    // Se déconnecter réellement
    window.socket.disconnect();
});

window.socket.on('playerDisconnected', ({player}) => {
    // Afficher un message à l'autre joueur
    alert(`${player.username} disconnected`);
    let messageArea = document.getElementById('feedback');
    messageArea.textContent = player + ' a quitté le jeu.';
    onUsersUpdated(player);
    updatePlayerNames(player);

    //    // metter a jour la liste de sutilisateur
    //     // Optionnel : Mettre à jour l'interface pour refléter le départ du joueur
    //     // Par exemple, vous pouvez désactiver les boutons ou rediriger l'utilisateur
    initGame()
});


window.socket.on('endGame', (player) => {

    console.log("endGame ",player)
    if (player === player1) {
        document.getElementById('player1Card').classList.add('winner');
        document.getElementById('winnerMessage').innerText = `${player} a gagné !`;
    } else if (player === player2) {
        document.getElementById('player2Card').classList.add('winner');
        document.getElementById('winnerMessage').innerText = `${player} a gagné !`;
    }
    else {

        document.getElementById('winnerMessage').innerText = `Match null !`;
    }

    initGame(); // Réinitialiser le jeu pour un nouveau tour
});








// //mport { updatePlayerList } from './loading.js';
// import {connectSocket} from "./socketUtils.js";
// console.log('game.js is loaded');
// // Dans votre fichier JavaScript de la page /game
//
//     const token = window.localStorage.getItem('token');
// console.log("token",token)
//
// let player1;
//
// let player2;
// let correctIngredients;
// let timerStarted = false;
// let timeLeft ;
// let username;
// let username2;
//
// console.log('toooken1:', token);
//
// function onRoomCreated(data) {
//     console.log('Joueurs dans la salle player 1:', data.player1);
//     console.log('Joueurs dans la salle player 2:', data.player2);
//     console.log('Room', data.roomID, 'is ready');
//     username=data.player1;
//     console.log('username dans room', username, 'is ready');
//
//     //updatePlayerNames(player1, player2);
// }
// function onUsersUpdated(data){
//     username2=data[0];
//     console.log("userUpdate",data);
//
// }
//
// window.socket = connectSocket(token, onRoomCreated, onUsersUpdated);
// console.log("je suis dans game")
//
//
// function updatePlayerList(users) {
//     const playerList = document.getElementById('playerList');
//     if (!Array.isArray(users)) {
//         users = [users];
//     }
//     playerList.innerHTML = "";
//     users.forEach(user => {
//         const newPlayer = document.createElement('li');
//         newPlayer.textContent = `${user} est connecté`;
//         playerList.appendChild(newPlayer);
//     });
// }
// window.socket.on('roomReady', function (data) {
//
//     localStorage.setItem('roomId', data.roomId);
//     console.log('Room', data, 'is ready');
//
//     console.log('Joueurs dans la salle player 1:', data.players[0].username);
//     console.log('Joueurs dans la salle player 2:', data.players[1].username);
//     player1=data.players[0].username;
//     player2=data.players[1].username;
//
//     updatePlayerList([player1, player2]);
//     updatePlayerNames(player1, player2);
//     initIngredient(data);
//     initGame();
//     window.socket.emit('startGame');
// });
// function updatePlayerNames(player1, player2) {
//     document.getElementById('player1Name').textContent = player1;
//     document.getElementById('player2Name').textContent = player2;
// }
// let roomId = localStorage.getItem('roomId');
//
// function initIngredient(data){
//
//     document.getElementById('recipe').textContent =
//         `Recette: ${data.recipe}`;
//     correctIngredients = data.ingredients;
//     shuffleArray(data.allIngredients);
//     const playerGrid = document.getElementById('player-grid');
//     playerGrid.innerHTML = '';
//
//     data.allIngredients.forEach(ingredient => {
//         const button1 = createIngredientButton(ingredient);
//         playerGrid.appendChild(button1);
//     });
// }
// // function selectIngredient({ ingredient}) {
// //
// // }
//
// function createIngredientButton(ingredient) {
//     const button = document.createElement('button');
//     button.className = 'ingredient';
//     button.onclick = () => {
//
//         window.socket.emit('selectIngredient', { ingredient });
//     };
//     button.textContent = ingredient;
//     return button;
// }
// window.socket.on('updateTimer', (timeLeft) => {
//     document.getElementById('timer').textContent = `Temps restant: ${timeLeft}s`;
// });
//
// // Désactivez l'ingrédient sélectionné
// window.socket.on('disableIngredient', (ingredient) => {
//     const buttons = document.querySelectorAll('.ingredient');
//     console.log(`Désactivation de l'ingrédient: ${ingredient}`);
//     buttons.forEach(button => {
//         if (button.textContent === ingredient) {
//             button.disabled = true;
//         }
//     });
// });
//
//
// console.log("socket",window.socket);
// console.log("currentroom avant joinGame",roomId);
//
//
// function shuffleArray(array) {
//     for (let i = array.length - 1; i > 0; i--) {
//         const j = Math.floor(Math.random() * (i + 1));
//         [array[i], array[j]] = [array[j], array[i]];
//     }
// }
//
// function initGame() {
//     resetTimer();
//    //desactiv" le jeu quand un joueur quite
//     //enableStartTimerButton();
// }
//
// console.log("nooon")
//
// // Réinitialiser le chronomètre
// function resetTimer() {
//     timerStarted = false;
//     timeLeft=40;
//
//     updateTimerDisplay()
// }
//
// // Activer le bouton de démarrage du chronomètre
// // function enableStartTimerButton() {
// //     startButton.disabled = false;
// //     startButton.textContent = 'Lancer le chronomètre';
// // }
//
// window.socket.on('updateScores', function(players) {
//
//     players.forEach((player, index) => {
//         // En fonction de l'index, sélectionne le bon id de score
//         let scoreID = (index === 0) ? 'player1score' : 'player2score';
//         let playerScoreElement = document.querySelector(`#${scoreID}`);
//
//         if(playerScoreElement) {
//             playerScoreElement.textContent = `Score: ${player.score}`;
//         }
//     });
//
//     // Affiche les scores dans la console
//     console.log("Score du joueur 1:",players[0]?.username, players[0]?.score);
//     console.log("Score du joueur 2:", players[1]?.username, players[1]?.score);
// });
//
//     window.socket.on('updateMessage',(message, player) => {
//
//         console.log("je suis dans updatemessage",player)
//         if(player.username === player1) {
//             document.getElementById('player1status').textContent = message;
//         } else if(player.username === player2){
//             document.getElementById('player2status').textContent = message;
//         }
//     });
//
//
// function updateTimerDisplay() {
//         document.getElementById('timer').textContent = `Temps restant: ${timeLeft}s`;
//     }
//
// const quitButton = document.getElementById('quitButton');
// quitButton.addEventListener('click', function() {
//     const token = localStorage.getItem('token'); // or wherever you store your token
//     window.socket.emit('playerQuit', token);
// });
//
// window.socket.on('playerLeft', ({ player, message }) => {
//     // Afficher un message à l'autre joueur
//     alert(message);
//     // Optionnel : Mettre à jour l'interface pour refléter le départ du joueur
//     // Par exemple, vous pouvez désactiver les boutons ou rediriger l'utilisateur
//     initGame()
// });
// window.socket.on('endGame', (message) => {
//     alert(message);
//     //initGame(); // Réinitialiser le jeu pour un nouveau tour
// });
//
//
//
//
//
