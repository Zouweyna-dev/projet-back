
import { connectSocket } from './socketUtils.js';

window.onload = function(){
    const token = window.localStorage.getItem('token');
    console.log('token:', token);

    const onRoomCreated = (data) => {
        console.log('Room created:', data.roomID);
        console.log('Player 1:', data.player1);
        updatePlayerList(data.player1);

    };

    if (!window.socket) {
        window.socket = connectSocket(token, onRoomCreated, updatePlayerList);
    }


let gameStarted = false;
    console.log("je suis dans loading")
    window.socket.on('roomReady', function (data) {
    console.log('Room', data.roomID, 'is ready');

    updatePlayerList([data.player1,data.player2]);

    gameStarted = true;
});


    const startButton = document.getElementById('startButton');

    if (startButton) {
        startButton.addEventListener('click', () => {
            window.location.href = '/api/game';
            console.log('La partie commence !');
            // socket.emit('startGame');
        });
    } else {
        console.error('L\'élément startButton n\'existe pas.');
    }

}

export function updatePlayerList(users) {
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