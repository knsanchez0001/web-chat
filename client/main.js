const chatForm = document.getElementById("chat-form");
const chatMessages = document.getElementById("chat-messages");
const socket = io();

let username = "null";

socket.emit('whoami', (user) => {
    console.log(`Got ${user} on the client`);
    username = user;
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
    let msg = e.target.elements.msg.value;
    socket.emit('chatMessage', username, msg);

    e.target.elements.msg.value = '';
    e.target.elements.msg.focus();
});

function outputMessage(message) {
    const div = document.createElement('div');
    div.classList.add('clearfix')
    div.classList.add('message');
    if (message.user === username) {
        div.innerHTML = `<div class="float-end">
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
        <div>
            <div>
                <span style="font-size: 13px;">${message.time}</span>
            </div>
            <div class="float-start card p-2 bg-primary bg-opacity-25">
                <span>${message.text}</span>
            </div>
        </div>
    </div>`;
    }
    chatMessages.appendChild(div);
}