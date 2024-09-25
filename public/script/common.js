// common.js


// Notez qu'avec cette refactorisation, vous devez changer de socket.on('eventName', function() {...}) à onEventName(socket, function() {...}). ' +
// 'Vous pouvez également faire la même chose pour loading.js.
export function initializeSocket() {
    const token = window.localStorage.getItem('token');
    return io.connect('http://192.168.1.98', {
        query: { token: token }
    });
}

export function onConnect(socket, callback) {
    socket.on('connect', callback);
}

export function onConnectError(socket, callback) {
    socket.on('connect_error', callback);
}

export function onRoomReady(socket, callback) {
    socket.on('roomReady', callback);
}

export function updateUsersList(users, userListId) {
    const userList = document.getElementById(userListId);
    userList.innerHTML = "";

    users.forEach(user => {
        const newUser = document.createElement('li');
        newUser.textContent = `${user} est connecté`;
        userList.appendChild(newUser);
    });
}

// game.js
import { initializeSocket, onConnect, addDisconnectHandler, onRoomReady, updateUsersList, updatePlayerList } from './common.js';

const socket = initializeSocket();
onConnect(socket, () => {
    socket.emit('ready');
    console.log('Connected to server');
});

// Event listeners and additional logic here