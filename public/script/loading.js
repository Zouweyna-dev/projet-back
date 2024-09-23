const token = window.localStorage.getItem('token');
console.log('token:', token);
const socket = io.connect('http://192.168.1.98', {
    query: { token: token }
});


    socket.on('connect', () => {
        console.log('Connecté au serveur.');
        socket.emit('ready');

        socket.on('connected', (data) => {
            console.log('Événement userConnected reçu:', data.name);
            const playerList = document.getElementById('playerList');
            const newPlayer = document.createElement('li');
            newPlayer.textContent = `${data.name} est connecté`;
            playerList.appendChild(newPlayer);
            console.log('Nouvel utilisateur connecté:', data.name);
        });
    });

    socket.on('usersUpdated', (users) => {
        const userList = document.getElementById('playerList'); // Assurez-vous que c'est le bon élément
        userList.innerHTML = ""; // Nettoyez la liste actuelle

        users.forEach(user => {
            const newUser = document.createElement('li');
            newUser.textContent = `${user} est connecté`; // Mettez à jour la manière dont vous affichez le nom
            userList.appendChild(newUser);
        });
        document.getElementById('startButton').addEventListener('click', function() {
            socket.emit('startGame');
            window.location.href = '/api/game';
        });
    });


// Gestion des erreurs de connexion
socket.on('connect_error', (err) => {
    console.error('Erreur de connexion:', err);
});

