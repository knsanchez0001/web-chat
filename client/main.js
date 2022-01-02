const chatForm = document.getElementById("chat-form");
const socket = io();

socket.on('message', message => {
    console.log(message);
});

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let msg = e.target.elements.msg.value;
    socket.emit('chatMessage', msg);
});

function outputMessage(message){
    const div = document.createElement('div');
}