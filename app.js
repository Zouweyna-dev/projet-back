
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
        // const err = new Error('Simulated error');
        // err.status = 400;
        // next(err);
        const {userName, password} = request.body;

        if (!userName || !password || userName.trim() === "" || password.trim() === "") {
            console.log('Erreur : paramètres de requête invalides');
            next({status: 400, message: "Invalid request parameters"});
            return;
        }

        try {
            const db = await initDBConnection(); // Utilise la connexion existante
            const collection = db.collection("gamers");

            const user = await collection.findOne({userName}, {
                projection: {_id: 0, password: 1, userName: 1, email: 1, isConnected: 1},
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
            console.log("user login", user)

            // if (!user.isConnected) {


                const token = jwt.sign({
                    userName: user.userName, email: user.email, userId: user._id,
                }, jwtSecret);
                response.cookie("token", token, { httpOnly: true });

               // await collection.updateOne({userName}, {$set: {isConnected: true}});

                response.json({
                    userName: user.userName, email: user.email, userId: user._id, token,
                });
            // } else {
            //     next({status: 403, message: "Vous êtes déjà connecté."});
            //
            // }
        } catch (error) {
            console.error("Erreur lors de la connexion:", error);
            next({status: 500, message: "Internal Server Error"});
        }
    });

app.use((err, req, res, next) => {
    const statusCode = err.status || 500;
    res.status(statusCode).json({
        message: err.message || "Internal Server Error"
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
app.get("/403", (req, res) => {
    return res.render("403")
});


app.get('/leaderBoard', async (req, res) => {
    try {
        const db = await initDBConnection();
        const collection = db.collection("gameSessions");

        const leaderboard = await collection.aggregate([
            {
                $group: {
                    _id: "$playerId",
                    highestScore: { $max: "$score" },
                    totalPlaytime: { $sum: "$playtime" }
                }
            },
            {
                $project: {
                    playerId: "$_id",
                    highestScore: 1,
                    totalPlaytime: 1
                }
            },
            { $sort: { highestScore: -1 } }
        ]).toArray();

        console.log("Leaderboard data:", leaderboard);

        res.render('leaderBoard', { leaderboard });
    } catch (error) {
        console.error(error);
        res.status(500).send('Erreur lors de la récupération des données.');
    }
});


/** Partie Socket.io back-end */

const ioServer = new Server(httpServer, {
    cors: {
        origin: "*", methods: ["GET", "POST"]
    }
});

const ingredients = [
    { name: "Farine", image: "/images/farine.png" },
    { name: "Sucre", image: "/images/sucre.png" },
    { name: "Beurre", image: "/images/beurre.png" },
    { name: "Œufs", image: "/images/oeufs.png" },
    { name: "Lait", image: "/images/lait.png" },
    { name: "Levure chimique", image: "/images/levure.png" },
    { name: "Chocolat noir", image: "/images/choco.png" },
    { name: "Crème fraîche", image: "/images/creme_fraiche.png" },
    { name: "Vanille", image: "/images/vanille.png" },
    { name: "Fraises", image: "/images/farise.png" },
    { name: "Citron", image: "/images/citron.png" },
    { name: "Amandes", image: "/images/amande.png" },
    { name: "Noix de coco", image: "/images/noix_coco.png" },
    { name: "Crème au beurre", image: "/images/creme_beurre.png" },
    { name: "Poudre d'amandes", image: "/images/poudre_amande.png" },
    { name: "Mascarpone", image: "/images/mascarpone.png" },
    { name: "Café fort", image: "/images/café.png" },
    { name: "Cacao en poudre", image: "/images/cacao.png" },
    { name: "Fromage", image: "/images/fromage.png" },
    { name: "Courgette", image: "/images/courgette.png" }
];



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


class Game {
    constructor(ioServer) {
        this.ioServer = ioServer;
        this.waitingRoom = null;
        this.correctIngredients = [];
        this.newRoomId = null;
        this.playersWantToPlayAgain = [];
        this.gameOver=false;
        this.connectedUsers = {};
    }

    verifyToken(token) {
        try {
            console.log('token ok');
            return jwt.verify(token, jwtSecret);

        } catch (error) {
            console.error('Token verification error:', error);
            return null;
        }
    }


    createNewRoom(socket) {
        console.log('waitingRoom 2', this.waitingRoom)
        this.newRoomId = 'room-' + Math.random().toString(36).substr(2, 9);
        socket.join(this.newRoomId);
        console.log("waiting room dans creatroom",this.waitingRoom)
        this.waitingRoom = {

            roomId: this.newRoomId,
            players: [{username: socket.username, actif: true}]
        };        console.log("waiting room dans creatroom",this.waitingRoom)
        this.ioServer.to(this.newRoomId).emit('roomCreated',
            {roomID: this.newRoomId, player1: socket.username});
        this.ioServer.emit('usersUpdated', this.waitingRoom.players);

    }

    joinWaitingRoom(socket) {
        console.log('waitingRoom 3', this.waitingRoom)
        socket.join(this.waitingRoom.roomId);
        console.log("waitingRoom.roomId", this.waitingRoom.roomId)
        this.waitingRoom.players.push({
            username: socket.username, actif: true,
        });
        this.waitingRoom.players.forEach(player => {
            player.score = 0;
        });
        this.ioServer.emit('usersUpdated', this.waitingRoom.players);
        console.log("waitingRoom.players", this.waitingRoom.players)
    }

    checkIfAlreadyConnected(socket) {
        console.log('waitingRoom 4', this.waitingRoom)
        console.log("deja connecter ", socket.username)
        socket.emit('errorMessage', {message: 'Vous êtes déjà connecté au jeu.'});
    }

    startGame(socket) {
        this.gameOver=false;
        console.log("waitingRoom jj", this.waitingRoom)
        this.startTimer(this.waitingRoom.roomId);
    }

    startTimer(roomId) {
        let timeLeft = 40;

        this.gameStart = Date.now();
        const timerInterval = setInterval(() => {
            if (this.gameOver) {
                clearInterval(timerInterval);
                console.log("Timer arrêté");
                this.ioServer.to(roomId).emit('updateTimer', timeLeft);
                return;
            }

            console.log("Temps restant: ", timeLeft);
            timeLeft--;
            this.ioServer.to(roomId).emit('updateTimer', timeLeft);
            if (this.waitingRoom ) {
                this.checkWinCondition(this.waitingRoom.roomId,
                    this.correctIngredients.length, timeLeft, timerInterval);
            }
        }, 1000);
    }
    compareScores(player1Score, player2Score) {
        if (player1Score > player2Score) {
            return player1Score
            // `${waitingRoom.players[0].username} wins`
        }
        if (player2Score > player1Score) {
            return player2Score
            // `${waitingRoom.players[1].username} wins`
        }
    }


    endGame(roomId, player1Score, player2Score, playerScore, timerInterval) {

        this.endTime = Date.now();
        this.playtime = this.calculatePlaytime(this.gameStart, this.endTime);
        console.log(`Le temps de jeu était de ${this.playtime} minutes.`);

        console.log("watingroom avant insertion bdd", this.waitingRoom.players);
        this.waitingRoom.players.forEach(player => {
            this.insertGameScore(player.username,
                this.waitingRoom.roomId, player.score,
                this.playtime / 60000)
                .then(r =>
                    console.log(`Score updated for ${player.username}`))
                .catch(err => console.error(`An error occurred: ${err}`));
        });
        this.gameOver = true;
        clearInterval(timerInterval);
        if (playerScore === player1Score) {
            console.log("message endgame");
            this.ioServer.to(roomId).emit('endGame',
                this.waitingRoom.players[0].username);
        } else {
            if (playerScore === player2Score) {

                console.log("player 2 a gagné");
                this.ioServer.to(roomId).emit('endGame',
                    this.waitingRoom.players[1].username);
            }else{
                this.ioServer.to(roomId).emit('endGame', null);
            }
        }

    }
    checkWinCondition(roomId, totalCorrectIngredients, timeLeft, timerInterval) {

        if (this.gameOver) return;
        let playerScore;
        if (!this.gameOver && this.waitingRoom.players[0] && this.waitingRoom.players[1]) {
            const player1Score = this.waitingRoom.players[0].score;
            const player2Score = this.waitingRoom.players[1].score;

            if (totalCorrectIngredients !== 0) {

                if (timeLeft <= 0 || player1Score === totalCorrectIngredients
                    || player2Score === totalCorrectIngredients) {
                    console.log("timeLeft: ", timeLeft);
                    playerScore = this.compareScores(player1Score, player2Score);
                    this.endGame(roomId, player1Score, player2Score, playerScore, timerInterval)

                }
            }
        }


    }

    getPlayer(username) {
        return this.waitingRoom.players.find(player =>
            player.username === username);
    }
    getRandomRecipe() {
        return recipes[Math.floor(Math.random() * recipes.length)];

    }
    handleIngredientSelection(socket, ingredient) {

        let message;
        let player = this.getPlayer(socket.username);
        if (!player) {
            console.log(`Player with username ${socket.username} not found`);
        }
        console.log("ingredient",ingredient)
        console.log("player qui selectionner",player)
        console.log("correcte ingredient", this.correctIngredients);
        console.log("correcte ingredient",
            this.correctIngredients.includes(ingredient.ingredient));

        if (this.correctIngredients.includes(ingredient.ingredient.name)) {
            player.score++;
            message = 'Bien joué :) !';
            console.log("ingredient", ingredient)
            this.ioServer.to(this.waitingRoom.roomId).
            emit('disableIngredient', ingredient);
            this.ioServer.to(this.waitingRoom.roomId).emit
            ('updateScores', this.waitingRoom.players);
        } else {
            message = 'Essaie encore :( !!';
        }
        this.ioServer.to(this.waitingRoom.roomId).emit
        ('updateMessage', message, player);
    }

    async  insertGameScore(playerId, gameId, score,playtime) {
        const db = await initDBConnection();
        const collection = db.collection("gameSessions");

        return  await collection.findOneAndUpdate(
            { playerId: playerId, roomId: this.waitingRoom.roomId },
            { $set: { score: score, playtime: playtime } },
            { upsert: true, returnNewDocument: true })
    }
    calculatePlaytime(gameStart, endTime) {
        return (endTime - gameStart) / 1000 / 60;
    }
    handleStartGame(socket) {
        socket.on('startGame', () => {
            console.log("waitingRoom StartGme",this.waitingRoom)
            this.startGame(socket)
        });
    }

    handleSelectIngredient(socket) {
        socket.on('selectIngredient', (data) => {
            this.handleIngredientSelection(socket,data)
        })
    }

    handleWantToPlay(socket) {
        socket.on('wantToPlay', (token) => {

            let randomRecipe = this.getRandomRecipe();
            this.correctIngredients=randomRecipe.ingredients;
            let decodedToken = this.verifyToken(token);
            console.log("recette  dans wantToplay", randomRecipe.ingredients)
            console.log( decodedToken);
            if (decodedToken) {
                let userName = decodedToken.userName;
                if (!this.playersWantToPlayAgain.includes(userName)) {
                    this.playersWantToPlayAgain.push(userName);
                }

                console.log("recette  dans wantToplay", randomRecipe.ingredients)
                console.log("waitingRoom", this.waitingRoom.players)
                if(this.playersWantToPlayAgain.length ===this.waitingRoom.players.length){
                    this.ioServer.to(this.waitingRoom.roomId).emit('roomReady', {
                        players: this.waitingRoom.players,
                        recipe: randomRecipe.name,
                        ingredients: randomRecipe.ingredients,
                        allIngredients: ingredients
                    });
                    console.log("playersWantToPlayAgain", this.playersWantToPlayAgain);
                    console.log("waitingRoom", this.waitingRoom)

                    this.playersWantToPlayAgain = [];
                }
            }
        })
    }

    handleDisconnect(socket) {
        socket.on('disconnect', () => {    console.log(socket.username," is  disconnected");
            if (this.waitingRoom) {

                const playerIndex = this.waitingRoom.players.findIndex(
                    player => player.username === socket.username
                );
                if (playerIndex !== -1) {

                    const disconnectedPlayer = this.waitingRoom.players[playerIndex].username;
                    this.waitingRoom.players.splice(playerIndex, 1);
                    socket.to(this.waitingRoom.roomId).emit("playerDisconnected", disconnectedPlayer);
                    socket.to(this.waitingRoom.roomId).emit("usersUpdated", this.waitingRoom.players)
                    if (this.waitingRoom.players.length === 0) {
                        this.waitingRoom = null;
                    }
                }
            }

        });
    }

    gameConnection() {

        this.ioServer.on('connection', (socket) => {
            console.log('Un client est connecté');
            const token = socket.handshake.query.token;
            const decodedToken1 = this.verifyToken(token);
            if (!decodedToken1) return;

            const userId = decodedToken1.userName;
            console.log("userId", userId)
            // socket.on('join', (userId) => {
            //     if (this.connectedUsers[userId]) {
            //         // Si l'utilisateur est déjà connecté
            //         socket.emit('userAlreadyConnected', {message: "Vous êtes déjà connecté."});
            //         return;
            //     }
            //     this.connectedUsers[userId] = socket.id;
            // })



            socket.username = decodedToken1.userName;
            console.log('waitingRoom 1', this.waitingRoom)

            console.log('username socket',  socket.username )

            this.handleWantToPlay(socket);
            if (!this.waitingRoom) {
                this.createNewRoom(socket);
            } else if(!this.waitingRoom.players.map(player =>
                player.username).includes(socket.username)){
                this.joinWaitingRoom(socket);
            } else {
                this.checkIfAlreadyConnected(socket);
            }
            this.handleStartGame(socket);
            this.handleSelectIngredient(socket);

            this.handleDisconnect(socket);
        });
    }
}


const game = new Game(ioServer);
game.gameConnection();



// ioServer.on('connection', (socket) => {
//
//     console.log('Un client est connecté');
//     const token = socket.handshake.query.token;
//     const decodedToken = verifyToken(token);
//     console.log("decodedToken",decodedToken);
//
//     if (!decodedToken) return;
//
//     socket.username = decodedToken.userName;
//     addUserToConnectedList(socket.username,socket.id);
//         socket.emit('welcome', {message: 'Bienvenue dans le jeu !'});
//
//         if (!connectedUsers.includes(socket.username)) {
//             connectedUsers.push(socket.username);
//         }
//
//         console.log('connectedUsers:', connectedUsers);
//
//         ioServer.emit('usersUpdated', connectedUsers);
//
//         if (!waitingRoom) {
//
//                 newRoomId = 'room-' + Math.random().toString(36).substr(2, 9);
//                 socket.join(newRoomId);
//
//                 waitingRoom = {
//                     roomId: newRoomId,
//                     players: [{ username: socket.username,actif:true}]
//                 };
//                 ioServer.to(newRoomId).emit('roomCreated',
//                     { roomID: newRoomId, player1:socket.username});
//             } else {
//                 let randomRecipe = getRandomRecipe();
//                 correctIngredients = randomRecipe.ingredients;
//                 console.log("correct ingred dans le else room ready" , correctIngredients)
//                 socket.join(waitingRoom.roomId);
//
//                 console.log("waitingRoom.roomId",waitingRoom.roomId)
//                 waitingRoom.players.push({ username: socket.username, actif: true,
//                     });
//                 waitingRoom.players.forEach(player => {
//                     player.score = 0;
//                 });
//                 console.log("waitingRoom.players",waitingRoom.players)
//
//                 ioServer.to(waitingRoom.roomId).emit('roomReady', {
//                     roomID: waitingRoom.roomId,
//                     players: waitingRoom.players,
//                     recipe: randomRecipe.name,
//                     ingredients: randomRecipe.ingredients,
//                     allIngredients: ingredients
//                 });
//             }
//         if (waitingRoom.roomId){
//         let timerInterval;
//
//         socket.on('startGame', () => startGame(socket));
//         socket.on('selectIngredient', ({ ingredient }) => handleIngredientSelection(socket, ingredient));
//         socket.on('playerQuit', (token) => handlePlayerQuit(socket, token));
//         function startGame(socket){
//
//             console.log("waitingRoom jj",waitingRoom)
//             startTimer(waitingRoom.roomId);
//         }
//         function startTimer(roomId) {
//             let timeLeft = 40;
//             timerInterval = setInterval(() => {
//                 timeLeft--;
//                 ioServer.to(roomId).emit('updateTimer', timeLeft);
//                 checkWinCondition(waitingRoom.roomId, correctIngredients.length, timeLeft, timerInterval);
//
//             }, 1000);
//         }
//         function getPlayer(username) {
//             return waitingRoom.players.find(player =>
//                 player.username === username);
//         }
//
//         function handleIngredientSelection(socket, ingredient) {
//
//             let message;
//             let player = getPlayer(socket.username);
//
//             if (!player) {
//                     console.log(`Player with username ${socket.username} not found`);}
//                     console.log('playeeer dans select ',player);
//
//             if (correctIngredients.includes(ingredient)) {
//                         player.score++;
//                         message = 'Bien joué :) !';
//                         ioServer.to(waitingRoom.roomId).emit('disableIngredient', ingredient);
//                         ioServer.to(waitingRoom.roomId).emit('updateScores',waitingRoom.players);
//                     } else {
//                         message = 'Essaie encore :( !!';
//                     }
//                     ioServer.to(waitingRoom.roomId).emit('updateMessage', message,player);
//         }
//
//         function checkWinCondition(roomId, totalCorrectIngredients,timeLeft, timerInterval) {
//             const player1Score = waitingRoom.players[0].score;
//             const player2Score = waitingRoom.players[1].score;
//             let message = null;
//
//             if (timeLeft <=0 || player1Score === totalCorrectIngredients
//                 || player2Score === totalCorrectIngredients) {
//
//                 message = player1Score > player2Score ? 'Player 1 wins!' : 'Player 2 wins!';
//                          clearInterval(timerInterval);
//                     }
//                     // else {message = 'It\'s a tie!';}
//             if (message) {
//                 console.log("mesaage endgame")
//                 ioServer.to(roomId).emit('endGame', message);
//
//                     }
//                 }
//
//         function handlePlayerQuit(socket, token) {
//             const decodedToken = verifyToken(token);
//             if (!decodedToken) return;
//             socket.to(waitingRoom.roomId).emit('playerLeft', { player: decodedToken.userName });
//             console.log('Player quit:', socket.username);
//             socket.leave(waitingRoom.roomId);
//             clearInterval(timerInterval);
//             waitingRoom = null;//a verifier
//         }
//
//         }
//         socket.on("disconnect", () => {
//             console.log("A user disconnected");
//             // Si l'utilisateur était dans une room d'attente, cette room est maintenant supprimée
//             if (
//                 waitingRoom &&
//                 (waitingRoom.players[0].username === socket.username ||
//                     waitingRoom.players[1].username=== socket.username)
//             ) {
//                 waitingRoom = null;
//             }
//         });
//
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