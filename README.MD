# Projet de Jeu Multijoueur
- start-game : Crée une nouvelle session de jeu. 
- active-games : Récupère toutes les sessions de jeu actives.
- join-game gameSessionId : Permet à un joueur de rejoindre une session de jeu existante.
- game gameSessionId : Récupère et affiche les détails d'une session de jeu

## Technologies utilisées
- JavaScript
- Express.js
- Socket.IO
- Pug

## Fonctionnalités
- Authentification par token
- Liste des joueurs connectés
- Jeu en temps réel avec Socket.IO

## Instructions d'installation
1. Clonez le dépôt.
2. Installez les dépendances avec `npm install`.
3. Lancez le serveur avec `node app.js`.

## Notes

Les événements de socket connection, disconnect, startGame, joinGame, selectIngredient.
roomsState, un objet qui stocke des informations sur chaque salle de jeu, y compris les joueurs dans la salle, la recette aléatoire pour la salle, etc.
startTimer: une fonction pour gérer la logique du décompte à rebours du jeu.
checkWinCondition et endGame: fonctions qui vérifient si un joueur a gagné et terminent le jeu.
Gestion de l'attente du joueur et assignation aux salles de jeux.on aux salles de jeux.