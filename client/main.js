const chatForm = document.getElementById("chat-form");
const chatMessages = document.getElementById("chat-messages");
const socket = io();

socket.on('message', message => {
    console.log(message);
    outputMessage(message);

    chatMessages.scrollTop = chatMessages.scrollHeight;
});

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let msg = e.target.elements.msg.value;
    socket.emit('chatMessage', msg);

    e.target.elements.msg.value = '';
    e.target.elements.msg.focus();


});

function outputMessage(message) {
    const div = document.createElement('div');
    div.classList.add('clearfix')
    div.classList.add('message');
    div.innerHTML = `<div class="float-end">
        <div>
            <span style="font-size: 13px;">${message.time}</span>
        </div>
        <div class="message other-message card p-2 bg-success bg-opacity-25">${message.text}</div>
    </div>`;
    chatMessages.appendChild(div);
}