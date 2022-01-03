const express = require('express');  
const http = require('http');
const socketio = require('socket.io');
const formatMessage = require('./messages.js');

const app = express();
const port = process.env.PORT || 8080;
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static('client'));

io.on('connection', socket => {
    console.log("New connection!");

    socket.emit('message', formatMessage('Connected to chat!'));

    socket.broadcast.emit('message', formatMessage('A user has joined the chat!'));

    socket.on('disconnect', () => {
        io.emit('message', formatMessage('A user has left the chat!'));
    });

    socket.on('chatMessage', msg =>{
        io.emit('message', formatMessage(msg));
    })
})

server.listen(port, () => {
    console.log(`App now listening at http://localhost:${port}`);
});

