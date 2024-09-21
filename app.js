/** Partie HTTP */
import express from 'express';
import bodyParser from "body-parser"; // Permet de parser le corps des requêtes HTTP
import cors from "cors"; // Permet de paramétrer les en-têtes CORS
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { v4 } from 'uuid'
import { Server } from 'socket.io'
import res from "express/lib/response.js";
import  path from "path";
import compression from "compression";
import { MongoClient } from "mongodb"; // https://www.mongodb.com/docs/drivers/node/current/
import { apiStatus } from "./api-status.js";
import crypto from 'crypto';


const dbName = "Game";
const connectionString = "mongodb://127.0.0.1:27017";
const client = new MongoClient(connectionString);
import cookieParser from 'cookie-parser';


const app = express();
const server = http.createServer(app);
const io = socketIO(server);
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
app.get('/api/login',(req, res) => {

        //res.render('login', { player1Name, player2Name });
        res.render('login');

    });

app.post( '/api/login',async (request, response, next) => {
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
            },
            jwtSecret
        );

        response.json({
            userName: user.userName,
            email: user.email,
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

app.get('/api/game',(req,res)=>{

    // const player1Name = req.token.decodedToken.player1Name;
    // const player2Name = req.token.decodedToken.player2Name;

    return res.render('game');


});
app.route('/api/start-game')
    .post(async (req, res) => {
        const userName = req.token.userName;

        // Créer une nouvelle session de jeu en base de données avec le premier joueur
        let gameSession = {
            player1: userName,
            player2: null,
            // Autres informations liées à la session de jeu (état de la partie, ...)
        };

        // Insertion de la session de jeu en base de données (ajustez avec votre système de base de données)
        // const gameSessionId = await database.insert(gameSession);

        // Renvoyer l'identifiant de la session de jeu pour que le client puisse le réutiliser plus tard
        res.json({ gameSessionId });
    });

// /api/join-game/:gameSessionId n'a pas besoin d'être
// liée à une vue Pug. Elle peut simplement être une API
// qui permet à un utilisateur de rejoindre une session
// de jeu existante en utilisant AJAX ou une autre technique
// de requêtes HTTP côté client.
// Par exemple, lorsqu'un utilisateur clique sur un bouton
// "Rejoindre le jeu" sur votre site web, votre code client
// pourrait envoyer une requête POST à cette API en utilisant
// l'ID de la session de jeu.
app.route('/api/join-game/:gameSessionId')
    .post(async (req, res) => {
        const userName = req.token.userName;
        const gameSessionId = req.params.gameSessionId;

        // Récupérer la session de jeu en base de données
        // let gameSession = await database.get(gameSessionId);

        // Si la session de jeu n'existe pas ou que le deuxième joueur a déjà rejoint, envoyer une erreur
        // if (!gameSession || gameSession.player2) {
        //     return res.status(400).send("Invalid game session");
        // }

        // Ajout du deuxième joueur à la session de jeu
        // gameSession.player2 = userName;

        // Mettre à jour la session de jeu en base de données
        // await database.update(gameSessionId, gameSession);

        res.send("Joined game successfully");
    });

/**
 * Middleware pour vérifier le jeton JWT.
 * Toute requête qui commence par /api/* doit contenir un jeton JWT valide.
 * Si le jeton est valide, on ajoute une propriété `token` sur la requête et on
 * appelle `next()` pour passer au middleware suivant.
 */
app.use("/api/*", (request, response, next) => {
    // Récupération du jeton JWT dans l’en-tête Authorization
    const authorizationHeader = request.get("Authorization");
    console.log('authorizationHeader ',authorizationHeader )
    let token = null;
    if (authorizationHeader) {
        token = authorizationHeader.trim().split(" ").pop();
    }

    // Si le jeton n’est pas fourni, on rejette la requête
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
        request.token = decodedToken;

        next();
    });
});

/**
 * Route de test, accessible uniquement si le middleware /api/* a vérifié
 * le jeton JWT.
 */
app.get("/api/check-token", (request, response) => {
    return response.json({
        token: request.token,
    });
});

const httpServer = app.listen(80, () => {
    console.log('HTTP Server started on port 80');
})

/** Partie Socket.io back-end */


const ioServer = new Server(httpServer);
ioServer.on('connection', (socket) => {
    console.log('A user connected');

    // Écoute de l'événement pour recevoir le nom du joueur
    socket.on('registerName', (token) => {
        // Vérifie et extrait le nom d'utilisateur depuis le token
        const userName = req.token.userName; // Assure-toi que 'req.token' est accessible ici

        socket.username = userName; // Stocke le nom du joueur dans l'objet socket

        // Émet un événement à tous les autres joueurs
        socket.broadcast.emit('userConnected', { name: socket.username });

        // Optionnel : Envoie un message de bienvenue au joueur
        socket.emit('welcome', { message: 'Welcome to the game!' });
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});


// Pour aller plus loin sur la problématique de la latence sur
// les applications
// et les jeux en temps réél :
// https://arstechnica.com/gaming/2019/10/explaining-how-fighting-games-use-delay-based-and-rollback-netcode/
