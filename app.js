/** Partie HTTP */
import express from 'express';
import bodyParser from "body-parser"; // Permet de parser le corps des requêtes HTTP
import cors from "cors"; // Permet de paramétrer les en-têtes CORS
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { v4 } from 'uuid';
import { Server } from 'socket.io'
import res from "express/lib/response.js";
import  path from "path";
import compression from "compression";
import {MongoClient, ObjectId} from "mongodb"; // https://www.mongodb.com/docs/drivers/node/current/
import { apiStatus } from "./api-status.js";
import crypto from 'crypto';




const dbName = "Game";
const connectionString = "mongodb://127.0.0.1:27017";
const client = new MongoClient(connectionString);
import cookieParser from 'cookie-parser';
import * as http from "http";


const app = express();

// app.use(cors({
//     origin: 'http://192.168.1.98'
// }));

const jwtSecret = crypto.randomBytes(64).toString('hex');
console.log(jwtSecret);
app.set('view engine', 'pug');
app.use(cookieParser());
app.set('views', 'views');
app.use(express.static('public'));
// Compression des réponses HTTP
app.use(compression());

// http://expressjs.com/en/api.html#req.body
// pour parser du JSON dans le corps de la requête
app.use(bodyParser.json());

// Note : pour parser application/x-www-form-urlencoded dans le corps de la requête :
// app.use(bodyParser.urlencoded({ extended: true }));
// Ajoute Access-Control-Allow-Origin: * à toutes les en-têtes de réponse HTTP

app.use(cors());

// Met en forme le code source (HTML) généré
app.locals.pretty = true;


// Route de test pour vérifier que l’API est en ligne
app.get("/api-test", (request, response) => {
    response.json(apiStatus);
});
app.get("/index", (request, response) => {
    return response.render("index");
});

/**
 * Création de compte utilisateur
 *
 * - On enregistre le nom d’utilisateur, l’adresse e-mail et le mot de passe
 * chiffré dans la base de données.
 * - On renvoie un jeton JWT (JSON Web Token) qui contient le nom et l'adresse
 * e-mail de l’utilisateur.
 */
app.route('/subscribe')

    .get((req, res,next) => {
        //  const { userName, email, password } = request.body;

        console.log('route get');

        return res.render(
            'subscribe',
            {
                title: 'Inscription',
            },
            (err, html) => {
                if (err) {
                    return next(err.message);
                }
                if (html) {
                    return res.send(html);
                }
            },
        );
    })

    .post( async (request, response, next) => {
        const { userName, email, password } = request.body;
        console.log(request.body)
        if ((typeof userName === "string" && userName.trim() === "") ||
            (typeof email === 'string' && email.trim() === "") ||
            (typeof password === 'string' && password.length <1))  {
            next({ status: 400, message: "Password must be at least 6 characters long!" });
            console.log('ifff')
            return;
        }
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            console.log('tryyyy subscribe')
            await client.connect();
            const db = client.db(dbName);
            const collection = db.collection("gamers");
            const result = await collection.insertOne({
                userName,
                email,

                password: hashedPassword,
            });
            const token = jwt.sign(
                {
                    userName,
                    email,
                },
                jwtSecret
            );
//a modifier
            response.json({
                token,
            });
        } catch (error) {
            console.log(error);
            next({ status: 500, message: "Internal Server Error" });
        } finally {
            console.log("Closing connection.");
            client.close();
            console.log('finally subscribe')
        }
    });

/**
 * Vérification d'un utilisateur
 *
 * - Création d’un jeton JWT si on a reçu un nom d’utilisateur et un mot de
 * passe valides.
 */
app.route('/login')
    .get((req, res) => {

        //res.render('login', { player1Name, player2Name });
        res.render('login');

    })

    .post( async (request, response, next) => {
        const { userName,password} = request.body;
        console.log('post login ',request.body)
        console.log('username',userName)
        console.log('password',password)


        if (typeof userName === "undefined" || typeof password=== "undefined"
            || userName.trim() === "" || password.trim() === "") {
            console.log('erreuur');
            next({ status: 400, message: "Invalid request parameters" });
            return;
        }

        try {
            await client.connect();
            const db = client.db(dbName);
            const collection = db.collection("gamers");

            const user = await collection.findOne(
                {
                    userName,
                },
                {
                    projection: {
                        _id: 0,
                        password: 1,
                        userName: 1,
                        email: 1,
                    },
                }
            );

            if (!user) {
                next({ status: 401, message: "Invalid user" });
                return;
            }

            const validPassword = await bcrypt.compare(password, user.password);

            if (!validPassword) {
                next({ status: 401, message: "Unauthorized" });
                return;
            }

            const token = jwt.sign(
                {
                    userName: user.userName,
                    email: user.email,
                    userId: user._id,
                },
                jwtSecret
            );
            response.cookie("token", token, { httpOnly: true });

            response.json({
                userName: user.userName,
                email: user.email,
                userId: user._id,
                token,
            });
        } catch (error) {
            console.log(error);
            next({ status: 500, message: "Internal Server Error" });
        } finally {
            console.log("Closing connection.");
            client.close();
        }
    });

/**
 * Middleware pour vérifier le jeton JWT.
 * Toute requête qui commence par /api/* doit contenir un jeton JWT valide.
 * Si le jeton est valide, on ajoute une propriété `token` sur la requête et on
 * appelle `next()` pour passer au middleware suivant.
 */
app.use("/api/*", (request, response, next) => {
    // Récupération du jeton JWT dans l’en-tête Authorization
    console.log("Requête API reçue : ", request.method, request.originalUrl);
    const authorizationHeader = request.get("Authorization");

    console.log('authorizationHeader ',authorizationHeader )
    let token = null;
    if (authorizationHeader) {
        token = authorizationHeader.trim().split(" ").pop();
    }

    if (!token) {
        return response.status(401).send("Unauthorized");
    }

    // Vérification du jeton JWT
    jwt.verify(token, jwtSecret, (error, decodedToken) => {
        // Si la vérification échoue, on rejette la requête
        if (error) {
            return response.status(401).send("Unauthorized");
        }

        // Si la vérification réussit, on ajoute le jeton et les données décodées
        // dans la requête.
        request.token = {
            token,
            decodedToken,
        };
        console.log('request token',request.token)
        request.token = decodedToken;

        next();
    });
});
app.get("/game", async (req, res, next) => {
    const token = req.cookies.token; // Vous pouvez lire le cookie ici.

    try {
        const payload = jwt.verify(token, jwtSecret);
        const userName = payload.userName;
        console.log("username",userName)
        res.render('game');
    } catch (error) {
        // Gérez l'erreur ici,
        //probablement en redirigeant vers la page de connexion.
    }
});
app.get('/gameSelection',(req,res)=>{


    return res.render('gameSelection')
})
app.post('/start-game', async (req, res) => {

    console.log('token',req.cookies.token);

    const userName = req.cookies.token.userName;
    const userId = req.cookies.token.userId;
    // Assurez-vous que userId est dans le token

    // Vérifiez si userName et userId sont définis
    if (!userName || !userId) {
        return res.status(400).send('Nom d\'utilisateur ou ID utilisateur manquant.');
    }

    // Créer une nouvelle session de jeu avec l'ID et le nom d'utilisateur du joueur
    let gameSession = {
        player1: { userId: userId, userName: userName, score: 0 },
        player2: null
    };

    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection("gameSessions"); // Assurez-vous que c'est le bon nom de collection

        const result = await collection.insertOne(gameSession);
        console.log('Session de jeu insérée avec succès:', result);
        const gameSessionId = result.insertedId;

        res.json({ gameSessionId: gameSessionId });
    } catch (error) {
        console.error('Erreur lors de l\'insertion de la session de jeu:', error);
        res.status(500).send('Erreur interne du serveur.');
    } finally {
        await client.close(); // Assurez-vous de fermer la connexion
    }
});


app.get('/active-games', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        const gameCollection = db.collection("gameSessions");

        const activeGames = await gameCollection.find({ player2: null }).toArray();
        console.log('Active games:', activeGames); // Ajoutez cette ligne pour vérifier les sessions actives

        res.json({ games: activeGames });
    } catch (error) {
        console.error('Erreur lors de la récupération des sessions de jeu actives:', error);
        res.status(500).send('Erreur interne du serveur.');
    } finally {
        await client.close();
    }
});


app.post('/join-game/:gameSessionId', async (req, res) => {


    const token = req.cookies.token;
    const userName = req.token.userName;
    const userId = req.token.userId;
    const gameSessionId = req.params.gameSessionId;

    try {
        await client.connect();
        const db = client.db(dbName);
        const gameCollection = db.collection("gameSessions");

        const gameSession = await gameCollection.findOne({ _id: new ObjectId(gameSessionId) });

        // Vérifier si la session de jeu existe et si le deuxième joueur peut rejoindre
        if (!gameSession || gameSession.player2) {
            return res.status(400).send('Session de jeu invalide ou déjà pleine.');
        }

        // Ajout du deuxième joueur à la session
        gameSession.player2 = { userId: userId, userName: userName, score: 0 };

        // Mettre à jour la session de jeu en base de données
        await gameCollection.updateOne(
            { _id: new ObjectId(gameSessionId) },
            { $set: { player2: gameSession.player2 } }
        );

        res.send("Rejoint le jeu avec succès.");
    } catch (error) {
        console.error('Erreur lors de la connexion à la session de jeu:', error);
        res.status(500).send('Erreur interne du serveur.');
    } finally {
        await client.close();
    }
});
//
// app.get('/api/game/:gameSessionId', async (req, res) => {
//     const gameSessionId = req.params.gameSessionId;
//
//     try {
//
//         await client.connect();
//         const db = client.db(dbName);
//         const gameCollection = db.collection("gameSessions");
//
//         const gameSession = await gameCollection.findOne({ _id: new ObjectId(gameSessionId) });
//
//         if (!gameSession) {
//             return res.status(404).send('Session de jeu introuvable.');
//         }
//         const player1 = gameSession.player1; // Supposant que player1 contient déjà toutes les infos
//         const player2 = gameSession.player2; // Peut être null si le deuxième joueur n'est pas encore présent
//
//         // Passer les informations à la vue Pug
//         res.render('game', {
//             gameSessionId,
//             player1,
//             player2
//         });
//     } catch (error) {
//         console.error('Erreur lors de la récupération de la session de jeu:', error);
//         res.status(500).send('Erreur interne du serveur.');
//     } finally {
//         await client.close();
//     }
// });



/**
 * Route de test, accessible uniquement si le middleware /api/* a vérifié
 * le jeton JWT.
 */

app.get("/loading",(req,res)=>{

    return res.render("loading")
});


const httpServer = app.listen(80, () => {
    console.log('HTTP Server started on port 80');
});


/** Partie Socket.io back-end */


const ioServer = new Server(httpServer, {
    cors: {
        origin: "http://localhost",
        methods: ["GET", "POST"]
    }
});

// Définissez les ingrédients ici pour qu'ils soient accessibles globalement
const ingredients = [
    "Farine", "Sucre", "Beurre", "Œufs", "Lait", "Levure chimique",
    "Chocolat noir", "Crème fraîche", "Vanille", "Fraises", "Citron",
    "Amandes", "Noix de coco", "Crème au beurre", "Poudre d'amandes",
    "Mascarpone", "Café fort", "Cacao en poudre,Chocolat blanc","Fromage", "Courgette"
];

// Ajoutez les recettes ici comme avant
const recipes = [
    {
        name: "Gâteau au Chocolat",
        ingredients: ["Farine", "Sucre", "Beurre", "Œufs", "Chocolat noir", "Levure chimique"]
    },
    {
        name: "Tarte aux Fraises",
        ingredients: ["Farine", "Beurre", "Sucre", "Œufs", "Crème fraîche", "Fraises"]
    },
    {
        name: "Tiramisu",
        ingredients: ["Mascarpone", "Œufs", "Sucre", "Café fort", "Cacao en poudre"]
    },
    {
        name: "Macarons",
        ingredients: ["Poudre d'amandes", "Sucre", "Œufs", "Crème au beurre"]
    },
    {
        name: "Gâteau au Citron",
        ingredients: ["Farine", "Sucre", "Beurre", "Œufs", "Citron", "Levure chimique"]
    }
];
let appelUnic=0;


// Fonction pour générer une recette au hasard
function getRandomRecipe() {
    return recipes[Math.floor(Math.random() * recipes.length)];

}
let  correctIngredients;
let connectedUsers = [];
let waitingRoom = null;
let   ConnexionsSocket={};
let playerScores = {
    player1:0,
    player2:0,
};


ioServer.on('connection', (socket) => {
    console.log('Un client est connecté');

    const token = socket.handshake.query.token;
    let decodedToken;
    try {
        decodedToken = jwt.verify(token, jwtSecret);
        const userId = decodedToken.userId;
        console.log('Token décodé:', decodedToken);
    } catch (error) {
        console.error('Erreur de décodage du token:', error);
        return;
    }

    if (decodedToken && decodedToken.userName) {
        socket.username = decodedToken.userName;

        //socket.emit('joinGame', socket.username);
      socket.emit('welcome', { message: 'Welcome to the game!' });


        if (!connectedUsers.includes(socket.username)) {
            connectedUsers.push(socket.username);
        }
        console.log('connectedUsers:', connectedUsers);
        ioServer.emit('usersUpdated', connectedUsers);

        console.log("je suis dans le serveur");



        // Vérifie si l'utilisateur est déjà dans une room
        const existingRoom =
            Object.keys(socket.rooms).find(roomId =>
                roomId.startsWith('room-'));

        if (waitingRoom) {
            // Si une room d'attente existe, ajoute le joueur à cette room
            socket.join(waitingRoom.roomId);
            waitingRoom.player2 = socket.username;
            console.log(`User ${socket.username} joined room`);
             let randomRecipe = getRandomRecipe();
             correctIngredients = randomRecipe.ingredients;
            ioServer.to(waitingRoom.roomId).emit('roomReady', {

                roomID: waitingRoom.roomId,
                player1: waitingRoom.player1,
                player2: waitingRoom.player2,
                recipe: randomRecipe.name,
                ingredients: randomRecipe.ingredients ,
                allIngredients: ingredients
            });
console.log("recete,ingrediant",randomRecipe,randomRecipe.ingredients,)
            console.log("roomReadyyyyyyyyyyyyyyyy",  waitingRoom.player1,
                waitingRoom.player2);

            // startGame(waitingRoom.roomId);
            waitingRoom = null; // Réinitialise la room d'attente
        } else if (!existingRoom) {
            // Si aucune room n'existe, crée une nouvelle room
            const newRoomId = 'room-' + Math.random().toString(36).substr(2, 9);
            socket.join(newRoomId);
            console.log(`Room ${newRoomId} created for user ${socket.username}`);
            console.log('waitingRoom', waitingRoom);
            console.log("première création de room", newRoomId);
            waitingRoom = { roomId: newRoomId, player1: socket.username };
            ioServer.to(newRoomId).emit('roomCreated', { roomID: newRoomId, player1: socket.username });
        }

        const currentRoom = Array.from(socket.rooms).find(roomId =>
            roomId.startsWith('room-'));
        console.log("currentRoom",currentRoom);
        console.log("socket",socket.username);

    if (!playerScores.player1) {
        playerScores.player1 = socket.username; // Assigner le joueur 1
    } else if (!playerScores.player2) {
        playerScores.player2 = socket.username; // Assigner le joueur 2
    }

    console.log('avant if ',currentRoom );


    if (currentRoom) {

        socket.on('startGame', () => {

                console.log("currentRoom",currentRoom);
                console.log("correctIngredients ",correctIngredients );

                console.log('socket rooms', Array.from(socket.rooms));
                console.log('socket user name', socket.username)


                console.log('Event "startGame" received');

                startTimer(currentRoom);


            });

            function startTimer(currentRoom) {
                let timeLeft = 40; // Durée du jeu en secondes
                const timerInterval = setInterval(() => {
                    timeLeft--;

                    ioServer.to(currentRoom).emit('updateTimer', timeLeft);
                    checkWinCondition(currentRoom, correctIngredients.length, timeLeft);

                    if (timeLeft <= 0) {
                        clearInterval(timerInterval);
                        endGame(currentRoom);
                    }
                }, 1000);
            }

            socket.on('selectIngredient', ({ ingredient, player }) => {
                let message;
                player= socket.username;
                console.log("player", player);
                console.log(`Le joueur ${player} a sélectionné ${ingredient}`);
                console.log('Ingrédients corrects:', correctIngredients);
                console.log('Ingrédient sélectionné:', ingredient);
                console.log('Scores actuels:', playerScores);

                if (correctIngredients && correctIngredients.includes(ingredient)) {

                    if (!playerScores[player]) {
                        playerScores[player] = 0; // Initialise le score si nécessaire
                    }
                    // Mettre à jour le score du joueur
                    playerScores[player] = playerScores[player] + 1; // Incrémente le score
                    message='bien joué :) !';
                    ioServer.to(currentRoom).emit('disableIngredient', ingredient);
                    ioServer.to(currentRoom).emit('updateScores', playerScores);

                    // Vérifier si quelqu'un a gagné
                    checkWinCondition(currentRoom, correctIngredients.length);
                }
                else {
                    message='Essaie encore :( !!';
                    console.log(`${ingredient} n'est pas un ingrédient correct ou correctIngredients est vide.`);
                }
                ioServer.to(currentRoom).emit('updateMessage',{ message,player});
            });

            function checkWinCondition(roomId, totalCorrectIngredients,timeLeft) {
                const player1Score = playerScores.player1 ;
                const player2Score = playerScores.player2;
                let message;

                if (player1Score === totalCorrectIngredients) {
                   message= `${playerScores.player1} wins!`
                } else if (player2Score === totalCorrectIngredients) {
                    message= `${playerScores.player2} wins!`
                }
                if (timeLeft <= 0) {
                    if (player1Score > player2Score) {
                        message=`${playerScores.player1} wins with a higher score!`;
                    } else if (player2Score > player1Score) {
                        message=`${playerScores.player2} wins with a higher score!`;
                    } else {
                        message='It\'s a tie!';
                    }
                }

                ioServer.to(roomId).emit('endGame',message);
            }


            function endGame(roomId) {

                let message;
                const player1Score = playerScores.player1 || 0;
                const player2Score = playerScores.player2 || 0;

                if (player1Score > player2Score) {
                    message='Player 1 wins with more points!';
                } else if (player2Score > player1Score) {
                    message ='Player 2 wins with more points!';
                } else {
                    message='It\'s a tie!';
                }

                ioServer.to(roomId).emit('endGame',message);
            }

        }



        else {
            console.error('Aucune room trouvée pour démarrer le jeu.');
        }

    }

    socket.on('disconnect', () => {
        console.log('A user disconnected');
        // Si l'utilisateur était dans une room d'attente, cette room est maintenant supprimée
        if (waitingRoom && (waitingRoom.player1 === socket.username || waitingRoom.player2 === socket.username)) {
            waitingRoom = null;
        }
    });


});


//
// let waitingRoom = null; // Variable pour stocker la room d'attente
// let playerScores = {}; // Object pour stocker les scores des joueurs
//
// ioServer.on('connection', (socket) => {
//     console.log('A player connected:', socket.id);
//
//     const existingRoom = Object.keys(socket.rooms).find(roomId => roomId.startsWith('room-'));
//
//     if (waitingRoom) {
//         // Si une room d'attente existe, ajoute le joueur à cette room
//         socket.join(waitingRoom.roomId);
//         waitingRoom.player2 = socket.username;
//         console.log(`User ${socket.username} joined room ${waitingRoom.roomId}`);
//
//         // Émettre un événement pour indiquer que la room est prête
//         ioServer.to(waitingRoom.roomId).emit('roomReady', {
//             roomID: waitingRoom.roomId,
//             player1: waitingRoom.player1,
//             player2: waitingRoom.player2
//         });
//
//         // Initialiser les scores des joueurs
//         playerScores[waitingRoom.player1] = 0;
//         playerScores[waitingRoom.player2] = 0;
//
//         // Démarrer le jeu
//         startGame(waitingRoom.roomId);
//         waitingRoom = null; // Réinitialiser la room d'attente
//     } else if (!existingRoom) {
//         // Si aucune room n'existe, crée une nouvelle room
//         const newRoomId = 'room-' + Math.random().toString(36).substr(2, 9);
//         socket.join(newRoomId);
//         console.log(`Room ${newRoomId} created for user ${socket.username}`);
//
//         // Stocke la nouvelle room d'attente
//         waitingRoom = { roomId: newRoomId, player1: socket.username };
//         ioServer.to(newRoomId).emit('roomCreated', { roomID: newRoomId, player1: socket.username });
//     }
// });
//
// // Fonction pour démarrer le jeu
// function startGame(roomId) {
//     const randomRecipe = getRandomRecipe(); // Générez une recette aléatoire
//     const correctIngredients = randomRecipe.ingredients; // Obtenez les ingrédients corrects
//
//     // Diffusez les données de la recette à tous les joueurs dans la room
//     ioServer.to(roomId).emit('gameData', {
//         recipe: randomRecipe.name,
//         ingredients: randomRecipe.ingredients,
//         allIngredients: ingredients
//     });
//
//     // Démarrez le chronomètre
//     startTimer(roomId, correctIngredients);
// }
//
// // Fonction pour démarrer le timer
// function startTimer(currentRoom, correctIngredients) {
//     let timeLeft = 30;
//     const timerInterval = setInterval(() => {
//         timeLeft--;
//         ioServer.to(currentRoom).emit('updateTimer', timeLeft);
//         if (timeLeft <= 0) {
//             clearInterval(timerInterval);
//             endGame(currentRoom);
//         }
//     }, 1000);
//
//     // Gestion de la sélection d'ingrédients
//     socket.on('selectIngredient', ({ ingredient }) => {
//         console.log(`Le joueur ${socket.username} a sélectionné ${ingredient}`);
//         if (correctIngredients.includes(ingredient)) {
//             // Mettre à jour le score du joueur
//             playerScores[socket.username] = (playerScores[socket.username] || 0) + 1; // Incrémente le score
//
//             // Émettre les mises à jour aux autres joueurs
//             ioServer.to(currentRoom).emit('disableIngredient', ingredient);
//             ioServer.to(currentRoom).emit('updateScores', playerScores);
//
//             // Vérifier si quelqu'un a gagné
//             checkWinCondition(currentRoom, correctIngredients.length);
//         } else {
//             console.log(`${ingredient} n'est pas un ingrédient correct.`);
//         }
//     });
// }
//
// // Vérification de la condition de victoire
// function checkWinCondition(roomId, totalCorrectIngredients) {
//     const player1Score = playerScores[waitingRoom.player1] || 0;
//     const player2Score = playerScores[waitingRoom.player2] || 0;
//
//     // Vérifier si un des joueurs a trouvé tous les ingrédients corrects
//     if (player1Score >= totalCorrectIngredients) {
//         ioServer.to(roomId).emit('endGame', 'Player 1 wins!');
//     } else if (player2Score >= totalCorrectIngredients) {
//         ioServer.to(roomId).emit('endGame', 'Player 2 wins!');
//     }
// }
//
// // Fonction pour gérer la fin de la partie
// function endGame(roomId) {
//     const player1Score = playerScores[waitingRoom.player1] || 0;
//     const player2Score = playerScores[waitingRoom.player2] || 0;
//
//     if (player1Score > player2Score) {
//         ioServer.to(roomId).emit('endGame', 'Player 1 wins with more points!');
//     } else if (player2Score > player1Score) {
//         ioServer.to(roomId).emit('endGame', 'Player 2 wins with more points!');
//     } else {
//         ioServer.to(roomId).emit('endGame', 'It\'s a tie!');
//     }
// }
//
// // Gestion de la déconnexion des joueurs
// socket.on('disconnect', () => {
//     console.log('A user disconnected');
//     if (waitingRoom && (waitingRoom.player1 === socket.username || waitingRoom.player2 === socket.username)) {
//         waitingRoom = null; // Réinitialiser la room d'attente si un joueur se déconnecte
//     }
// });





// Le serveur envoie un message à tous
// les clients de la salle pour annoncer
// quelle est la nouvelle recette.
// Vous pouvez le faire de manière
// similaire à la façon dont vous envoyez
// les noms des joueurs avec l'événement
// playerNames.
// ioServer.to(roomId).emit
// ('newRecipe',
//     { name: currentRecipe.name, ingredients: currentRecipe.ingredients });
// io.emit('newRecipe', { name: currentRecipe.name, ingredients: currentRecipe.ingredients });
//git remote -v
//git remote add origin http:// github.com/tonnom/repository.git
//git push -u origin master
// # ou 'main' si ton branche principale s'appelle 'main'
//git remote -v
//git remote remove origin


// Pour aller plus loin sur la problématique de la latence sur
// les applications
// et les jeux en temps réél :
// https://arstechnica.com/gaming/2019/10/explaining-how-fighting-games-use-delay-based-and-rollback-netcode/
// /api/join-game/:gameSessionId n'a pas besoin d'être
// liée à une vue Pug. Elle peut simplement être une API
// qui permet à un utilisateur de rejoindre une session
// de jeu existante en utilisant AJAX ou une autre technique
// de requêtes HTTP côté client.
// Par exemple, lorsqu'un utilisateur clique sur un bouton
// "Rejoindre le jeu" sur votre site web, votre code client
// pourrait envoyer une requête POST à cette API en utilisant
// l'ID de la session de jeu.