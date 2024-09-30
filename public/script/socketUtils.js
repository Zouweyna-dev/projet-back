
export function connectSocket(token, onRoomCreated, onUsersUpdated) {

    if (!window.socket) {
        const socket = io.connect('', {
            query: {token: token, userName: localStorage.getItem('userName')},
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,

        });
        window.socket = socket;
        console.log("je suis dans socketUtil")
        socket.on('connect', () => {
            console.log('Connecté au serveur.');

            socket.on('userAlreadyConnected', (data) => {
                window.location.href = '/403';
            });
            socket.emit('ready');

            socket.on('roomCreated', (data) => {
                console.log('Événement roomCreated reçu:', data);


                if (onRoomCreated) {
                    onRoomCreated(data);
                    console.log("data", data.player1)
                }
            });

            socket.on('usersUpdated', (data) => {
                console.log('Événement usersUpdated reçu:', data);
                if (onUsersUpdated) {
                    onUsersUpdated(data);
                }
            });
            socket.on('disconnect', (reason) => {
                console.warn('Déconnecté du serveur:', reason);
            });

            socket.on('connect_error', (err) => {
                console.error('Erreur de connexion:', err);
            });
        });
    }
    else {

        console.log('Socket déjà connecté:', window.socket.id);
        window.location.href = '/game';
    }
    return socket;
}
