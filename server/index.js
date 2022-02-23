const express = require('express');
const http = require('http');
const path = require('path');
const socketio = require('socket.io');
const flash = require('connect-flash');

const app = express();
const port = process.env.PORT || 8080;
const server = http.createServer(app);
const io = socketio(server);

const expressSession = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const bcrypt = require('bcrypt');
const saltRounds = 10;

const database = require('./data.js');

const session = {
    secret: process.env.SECRET || 'SECRET',
    resave: false,
    cookie: { maxAge: 60000 },
    saveUninitialized: false
};

const strategy = new LocalStrategy({
    passReqToCallback: true
},
    async (req, username, password, done) => {
        if (!(await database.findUser(username))) {
            // no such user
            return done(null, false, { 'message': 'No such username' });
        }
        if (!(await validatePassword(username, password))) {
            // invalid password
            // should disable logins after N messages
            // delay return to rate-limit brute-force attacks
            await new Promise((r) => setTimeout(r, 2000)); // two second delay
            return done(null, false, { 'message': 'Wrong password' });
        }
        // success!
        // should create a user object here, associated with a unique identifier
        return done(null, username);
    });

const sessionMiddleware = expressSession(session);


app.use(sessionMiddleware);
passport.use(strategy);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Convert user object to a unique identifier.
passport.serializeUser((username, done) => {
    done(null, username);
});
// Convert a unique identifier to a user object.
passport.deserializeUser((uid, done) => {
    done(null, uid);
});

async function validatePassword(name, password) {
    const hash = (await database.getUserHash(name))[0].hash;
    const result = await bcrypt.compare(password, hash);
    return result;
}

app.use(express.static('client'));
app.use(express.urlencoded({ 'extended': true })); // allow URLencoded data

app.get("/fail", (req, res) => {
    const errors = req.flash('error');
    res.json(errors);
})

app.get("/finduser/:id", async (req, res) => {
    res.json(await database.findUser(req.params.id));
});

app.post('/login',
    passport.authenticate('local', {
        'successRedirect': '/chat',
        'failureRedirect': '/',
        'failureFlash': true
    })
);

app.post('/register',
    async (req, res, next) => {
        const username = req.body['username'];
        const password = req.body['password'];

        const salt = bcrypt.genSaltSync(saltRounds);
        const hash = bcrypt.hashSync(password, salt);

        if (database.addUser(username, hash)) {
            database.addRooms(username);
        }
        next();
    }, passport.authenticate('local', {
        'successRedirect': '/chat',
        'failureRedirect': '/',
        'failureFlash': 'Failed to register'
    })
);

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
    socket.emit('connected', `You have connected with socket id: ${socket.id}`, socket.username);
    database.addUser(socket.username);

    const users = {};
    for (let [otherId, otherSocket] of io.of("/").sockets) {
        users[otherSocket.username] = otherId;
    }
    io.emit("user-list", users);

    socket.on("private message", (anotherSocketId, receiver, message) => {
        console.log("recieved private message");
        database.addMessage(socket.username, receiver, message);
        socket.to(anotherSocketId).emit("private message", socket.id, socket.username, message);
        socket.emit("private message", socket.id, socket.username, message);
    });
})

server.listen(port, () => {
    console.log(`App now listening at http://localhost:${port}`);
});

