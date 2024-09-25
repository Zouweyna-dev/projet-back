//créer une session
    function createGame() {

    fetch('http://localhost/api/start-game', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        }
    })
        .then(response => response.json())
        .then(data => {
            // Redirection vers la page de jeu après création de session
            window.location.href = `/game/${data.gameSessionId}`;
        })
        .catch(error => console.error('Erreur lors de la création de la partie:', error));
}
//rejoindre une session
function joinGame() {
    const gameSessionId = prompt("Entrez l'ID de la session de jeu :");
    if (gameSessionId) {
        fetch(`http://localhost/api/join-game/${gameSessionId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        })
            .then(response => response.json())
            .then(() => {
                // Rediriger vers la page du jeu
                window.location.href = `/game/${gameSessionId}`; // Redirection vers le jeu avec l'ID de session
            })
            .catch(error => console.error('Erreur lors de la connexion à la partie:', error));
    }

}
//afficher les sessions en cours
function displayActiveGames() {
    fetch('http://localhost/api/active-games', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        }
    })
        .then(response => response.json())
        .then(data => {
            const gamesList = document.getElementById('activeGamesList');
            gamesList.innerHTML = ''; // Vider la liste avant de la remplir
            data.games.forEach(game => {
                const li = document.createElement('li');
                li.textContent = `Session ID: ${game._id}, Joueur 1: ${game.player1.userName}`;
                gamesList.appendChild(li);
            });
        })
        .catch(error => console.error('Erreur lors de la récupération des sessions actives:', error));
}
