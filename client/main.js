const chatForm = document.getElementById("chat-form");
const chatMessages = document.getElementById("chat-messages");
const socket = io();

socket.on('connected', note => {
    console.log(note);
});

socket.on('user-data', (socketid, username) => {
    window.sessionStorage.setItem("user", username);
    window.sessionStorage.setItem("socketid", socketid);
});

socket.onAny((event, ...args) => {
    console.log(event, args);
});

socket.on('message', message => {
    outputMessage(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const user = window.sessionStorage.getItem("user");
    const message = e.target.elements.msg.value;
    socket.emit('chatMessage', user, message);

    e.target.elements.msg.value = '';
    e.target.elements.msg.focus();
});

function outputMessage(message) {
    const div = document.createElement('div');
    const user = window.sessionStorage.getItem("user");
    div.classList.add('clearfix')
    div.classList.add('message');
    if (message.user === user) {
        div.innerHTML = `<div class="message float-end">
            <div>
                <span style="font-size: 13px;">${message.time}</span>
            </div>
            <div class="message other-message card p-2 bg-success bg-opacity-25">
                <span>${message.text}</span>
            </div>
        </div>`;
    }
    else {
        div.innerHTML = `<div class="clearfix message">
        <div class="message">
            <div>
                <span style="font-size: 13px;">${message.time}</span>
            </div>
            <div class="float-start card p-2 bg-primary bg-opacity-25">
                <span>${message.text}</span>
            </div>
        </div>`;
    }
    chatMessages.appendChild(div);
}
