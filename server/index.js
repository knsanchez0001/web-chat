const express = require('express');
const http = require('http');
const path = require('path');
const socketio = require('socket.io');

const app = express();
const port = process.env.PORT || 8080;
const server = http.createServer(app);
const io = socketio(server);

const expressSession = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const data = require('./data.js');

const session = {
    secret: process.env.SECRET || 'SECRET',
    resave: false,
    cookie: { maxAge: 60000 },
    saveUninitialized: false
};

const strategy = new LocalStrategy(
    async (username, password, done) => {

        return done(null, username);
    });

const sessionMiddleware = expressSession(session);


app.use(sessionMiddleware);
passport.use(strategy);
app.use(passport.initialize());
app.use(passport.session());

// Convert user object to a unique identifier.
passport.serializeUser((username, done) => {
    done(null, username);
});
// Convert a unique identifier to a user object.
passport.deserializeUser((uid, done) => {
    done(null, uid);
});

function checkLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        res.redirect('/');
    }
}

app.use(express.static('client'));
app.use(express.urlencoded({ 'extended': true })); // allow URLencoded data

app.post('/login',
    passport.authenticate('local', {
        'successRedirect': '/chat',
        'failureRedirect': '/',
    }));

app.get('/chat', (req, res) => {
    res.sendFile(path.resolve("client/chat.html"));
});

const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);

io.use(wrap(sessionMiddleware));
io.use(wrap(passport.initialize()));
io.use(wrap(passport.session()));

io.use((socket, next) => {
    const username = socket.request.user;
    if (username) {
        socket.username = username;
        next();
    } else {
        next(new Error('unauthorized'))
    }
});

io.on('connection', socket => {

    socket.emit('connected', `You have connected with socket id: ${socket.id}` , socket.username);
    data.addUser(socket.username);

    const users = {};
    for (let [id, socket] of io.of("/").sockets) {
        users[socket.username] = id;
    }
    io.emit("user-list", users);

    socket.on("private message", (anotherSocketId, username, message) => {
        console.log("recieved private message");
        console.log(username);
        console.log(socket.username);
        socket.to(anotherSocketId).emit("private message", socket.id, socket.username, message);
        socket.emit("private message", socket.id, socket.username, message);
    });
})

server.listen(port, () => {
    console.log(`App now listening at http://localhost:${port}`);
});

