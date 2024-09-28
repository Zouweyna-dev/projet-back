
import express from 'express';
import bodyParser from "body-parser";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import {v4} from 'uuid';
import {Server} from 'socket.io';
import compression from "compression";
import {MongoClient, ObjectId} from "mongodb";
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import * as http from "http";


let db;
const uri=process.env.MONGODB_URI;
const client = new MongoClient(uri);
const app = express();
const jwtSecret = crypto.randomBytes(64).toString('hex');
//console.log( 'jwt = ',jwtSecret);


app.set('view engine', 'pug');
app.use(cookieParser());
app.set('views', 'views');
app.use(express.static('public'));
app.use(compression());
app.use(bodyParser.json());

app.use(cors());

// Met en forme le code source (HTML) généré
app.locals.pretty = true;
async function initDBConnection() {
    if (!db) {
        const client = new MongoClient(uri);
        try {
            await client.connect();
            console.log("Connecté à MongoDB Atlas !");
            db = client.db('Game');
        } catch (error) {
            console.error("Erreur lors de la connexion à MongoDB Atlas", error);
            throw error;
        }
    }
    return db;
}
async function insertGameScore(playerId, gameId, score) {
    const db = await initDBConnection();
    const collection = db.collection("scores");

    const result = await collection.insertOne({
        playerId: playerId, // Utilise l'_id du joueur
        gameId: gameId,
        score: score,
        date: new Date(),
    });

    return result;
}


app.get('/', (req, res) => {
    return res.render("index");
});

app.route('/subscribe')

    .get((req, res, next) => {
        return res.render('subscribe', {
            title: 'Inscription',
        }, (err, html) => {
            if (err) {
                return next(err.message);
            }
            if (html) {
                return res.send(html);
            }
        },);
    })

    .post(async (request, response, next) => {
        const {userName, email, password} = request.body;
        console.log(request.body)
        if ((typeof userName === "string" && userName.trim() === "") || (typeof email === 'string' && email.trim() === "") || (typeof password === 'string' && password.length < 1)) {
            next({status: 400, message: "Password must be at least 6 characters long!"});

            return;
        }
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const db = await initDBConnection();
            const collection = db.collection("gamers");
            const result = await collection.insertOne({
                userName,
                email,
                password: hashedPassword,
            });
            const token = jwt.sign({
                userName, email,}, jwtSecret);
            response.json({
                token,
            });
        } catch (error) {
            console.log(error);
            next({status: 500, message: "Internal Server Error"});
        } finally {
            console.log("Closing connection.");
            client.close();
            console.log('finally subscribe')
        }
    });

app.route('/login')

    .get((req, res) => {
        res.render('login');
        })

    .post(async (request, response, next) => {
        const {userName, password} = request.body;

        if (typeof userName === "undefined" || typeof password === "undefined"
            || userName.trim() === "" || password.trim() === "") {
            console.log('erreuur');
            next({status: 400, message: "Invalid request parameters"});
            return;
        }

        try {
            const db = await initDBConnection();
            const collection = db.collection("gamers");

            const user = await collection.findOne({
                userName,
            }, {
                projection: {
                    _id: 0, password: 1, userName: 1, email: 1,
                },
            });

            if (!user) {
                next({status: 401, message: "Invalid user"});
                return;
            }

            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                next({status: 401, message: "Unauthorized"});
                return;
            }
            const token = jwt.sign({
                userName: user.userName, email: user.email, userId: user._id,
            }, jwtSecret);
            response.cookie("token", token, {httpOnly: true});

            response.json({
                userName: user.userName, email: user.email, userId: user._id, token,
            });
        } catch (error) {
            console.log(error);
            next({status: 500, message: "Internal Server Error"});
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
    console.log("Requête API reçue : ", request.method, request.originalUrl);
    const authorizationHeader = request.get("Authorization");
    console.log('authorizationHeader ', authorizationHeader)
    let token = null;

    if (authorizationHeader) {
        token = authorizationHeader.trim().split(" ").pop();
    }

    if (!token) {
        return response.status(401).send("Unauthorized");
    }
    jwt.verify(token, jwtSecret, (error, decodedToken) => {

        if (error) {
            return response.status(401).send("Unauthorized");
        }
        request.token = {
            token, decodedToken,
        };
        console.log('request token', request.token)
        request.token = decodedToken;

        next();
    });
});
app.get("/game", async (req, res, next) => {

    const token = req.cookies.token;
    try {
        const payload = jwt.verify(token, jwtSecret);
        const userName = payload.userName;
        console.log("username", userName)
        res.render('game');
    } catch (error) {
        res.render('login');
    }
});

app.get('/gameSelection', (req, res) => {
    return res.render('gameSelection')
})

app.get("/loading", (req, res) => {
    return res.render("loading")
});
const httpServer = app.listen(80, () => {
    console.log('HTTP Server started on port 80');
});


/** Partie Socket.io back-end */

const ioServer = new Server(httpServer, {
    cors: {
        origin: "*", methods: ["GET", "POST"]
    }
});

// Définissez les ingrédients ici pour qu'ils soient accessibles globalement
const ingredients = ["Farine", "Sucre", "Beurre", "Œufs", "Lait", "Levure chimique", "Chocolat noir", "Crème fraîche", "Vanille", "Fraises", "Citron", "Amandes", "Noix de coco", "Crème au beurre", "Poudre d'amandes", "Mascarpone", "Café fort", "Cacao en poudre", "Fromage", "Courgette"];

// Ajoutez les recettes ici comme avant
const recipes = [{
    name: "Gâteau au Chocolat", ingredients: ["Farine", "Sucre", "Beurre", "Œufs", "Chocolat noir", "Levure chimique"]
}, {
    name: "Tarte aux Fraises", ingredients: ["Farine", "Beurre", "Sucre", "Œufs", "Crème fraîche", "Fraises"]
}, {
    name: "Tiramisu", ingredients: ["Mascarpone", "Œufs", "Sucre", "Café fort", "Cacao en poudre"]
}, {
    name: "Macarons", ingredients: ["Poudre d'amandes", "Sucre", "Œufs", "Crème au beurre"]
}, {
    name: "Gâteau au Citron", ingredients: ["Farine", "Sucre", "Beurre", "Œufs", "Citron", "Levure chimique"]
}];

function getRandomRecipe() {
    return recipes[Math.floor(Math.random() * recipes.length)];

}
let waitingRoom = null; // Variable globale pour la room d'attente
let playerScores = {}; // Initialisation des scores des joueurs
let correctIngredients = [];
let newRoomId;
const connectedUsers = []; // Objet pour stocker les utilisateurs connectés


function verifyToken(token) {
    try { console.log('tocken verifié',token);
        return jwt.verify(token, jwtSecret);

    } catch (error) {
        console.error('Token verification error:', error);
        return null;
    }
}function addUserToConnectedList(userId, socketId) {
    connectedUsers[userId] = socketId;
    console.log(`Utilisateur ${userId} connecté avec le socket ID : ${socketId}`);
}
ioServer.on('connection', (socket) => {

    console.log('Un client est connecté');
    const token = socket.handshake.query.token;
    const decodedToken = verifyToken(token);
    if (!decodedToken) return;

    socket.username = decodedToken.userName;
    addUserToConnectedList(socket.username,socket.id);
        socket.emit('welcome', {message: 'Bienvenue dans le jeu !'});

        if (!connectedUsers.includes(socket.username)) {
            connectedUsers.push(socket.username);
        }
        console.log('connectedUsers:', connectedUsers);

        ioServer.emit('usersUpdated', connectedUsers);

            if (!waitingRoom) {

                newRoomId = 'room-' + Math.random().toString(36).substr(2, 9);
                socket.join(newRoomId);

                waitingRoom = {
                    roomId: newRoomId,
                    players: [{ username: socket.username,actif:true}]
                };
                ioServer.to(newRoomId).emit('roomCreated',
                    { roomID: newRoomId, player1:socket.username});
            } else {
                let randomRecipe = getRandomRecipe();
                correctIngredients = randomRecipe.ingredients;
                console.log("correct ingred dans le else room ready" , correctIngredients)
                socket.join(waitingRoom.roomId);

                console.log("waitingRoom.roomId",waitingRoom.roomId)
                waitingRoom.players.push({ username: socket.username, actif: true,
                    });
                waitingRoom.players.forEach(player => {
                    player.score = 0;
                });
                console.log("waitingRoom.players",waitingRoom.players)

                ioServer.to(waitingRoom.roomId).emit('roomReady', {
                    roomID: waitingRoom.roomId,
                    players: waitingRoom.players,
                    recipe: randomRecipe.name,
                    ingredients: randomRecipe.ingredients,
                    allIngredients: ingredients
                });
            }
        let timerInterval;

        socket.on('startGame', () => startGame(socket));
        socket.on('selectIngredient', ({ ingredient }) => handleIngredientSelection(socket, ingredient));
        socket.on('playerQuit', (token) => handlePlayerQuit(socket, token));
        function startGame(socket){

            console.log("waitingRoom jj",waitingRoom)
            startTimer(waitingRoom.roomId);
        }
        function startTimer(roomId) {
            let timeLeft = 40;
            timerInterval = setInterval(() => {
                timeLeft--;
                ioServer.to(roomId).emit('updateTimer', timeLeft);
                checkWinCondition(waitingRoom.roomId, correctIngredients.length, timeLeft, timerInterval);

            }, 1000);
        }
        function getPlayer(username) {
            return waitingRoom.players.find(player =>
                player.username === username);
        }

        function handleIngredientSelection(socket, ingredient) {

            let message;
            let player = getPlayer(socket.username);

            if (!player) {
                    console.log(`Player with username ${socket.username} not found`);}
                    console.log('playeeer dans select ',player);

            if (correctIngredients.includes(ingredient)) {
                        player.score++;
                        message = 'Bien joué :) !';
                        ioServer.to(waitingRoom.roomId).emit('disableIngredient', ingredient);
                        ioServer.to(waitingRoom.roomId).emit('updateScores',waitingRoom.players);
                    } else {
                        message = 'Essaie encore :( !!';
                    }
                    ioServer.to(waitingRoom.roomId).emit('updateMessage', message,player);
        }

        function checkWinCondition(roomId, totalCorrectIngredients,timeLeft, timerInterval) {
            const player1Score = waitingRoom.players[0].score;
            const player2Score = waitingRoom.players[1].score;
            let message = null;

            if (timeLeft <=0 || player1Score === totalCorrectIngredients
                || player2Score === totalCorrectIngredients) {

                message = player1Score > player2Score ? 'Player 1 wins!' : 'Player 2 wins!';
                         clearInterval(timerInterval);
                    }
                    // else {message = 'It\'s a tie!';}
            if (message) {
                console.log("mesaage endgame")
                ioServer.to(roomId).emit('endGame', message);

                    }
                }

        function handlePlayerQuit(socket, token) {
            const decodedToken = verifyToken(token);
            if (!decodedToken) return;
            socket.to(waitingRoom.roomId).emit('playerLeft', { player: decodedToken.userName });
            console.log('Player quit:', socket.username);
            socket.leave(waitingRoom.roomId);
            clearInterval(timerInterval);
            waitingRoom = null;//a verifier
        }
        socket.on("disconnect", () => {
            console.log("A user disconnected");
            // Si l'utilisateur était dans une room d'attente, cette room est maintenant supprimée
            if (
                waitingRoom &&
                (waitingRoom.players[0].username === socket.username ||
                    waitingRoom.players[1].username=== socket.username)
            ) {
                waitingRoom = null;
            }
        });

});




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