const chatForm = document.getElementById("chat-form");
const chatMessages = document.getElementById("chat-messages");
const userList = [...document.getElementById('user-list').getElementsByTagName('li')];
const socket = io();
const chatRooms = {};

socket.on('connected', (note, username) => {
    console.log(note);
    socket.username = username;
});

socket.on('user-list', users => {
    for (const [key, value] of Object.entries(users)) {
        if (socket.username !== key) {
            if (!document.getElementById(key)) {
                addUserSideBar(key);
                const div = document.createElement('div');
                div.classList.add("h-100");
                div.id = `${key}-chat`;
                div.style.display = "none";
                chatMessages.appendChild(div);
            }
            chatRooms[key] = value;
        }
    }
    console.log(JSON.parse(window.sessionStorage.getItem("users")));
    window.sessionStorage.setItem("users", JSON.stringify(users));
    console.log(JSON.parse(window.sessionStorage.getItem("users")));
});

socket.onAny((event, ...args) => {
    console.log(event, args);
});

socket.on('message', message => {
    outputMessage(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

socket.on('private message', (anotherSocketId, usr, message) => {
    console.log(message);
    outputMessage(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const message = e.target.elements.msg.value;
    console.log(chatRooms[window.sessionStorage.getItem("currentChat")]);
    socket.emit('private message', chatRooms[window.sessionStorage.getItem("currentChat")],socket.username, message);

    e.target.elements.msg.value = '';
    e.target.elements.msg.focus();
});

userList.forEach(item => {
    item.addEventListener('click', e => currentChat(e));
})

function addUserSideBar(username) {
    const li = document.createElement("li");
    li.id = username;
    li.classList.add("clearfix", "list-group-item", "list-group-item-action", "p-2");
    li.innerHTML = `<img src="https://iptc.org/wp-content/uploads/2018/05/avatar-anonymous-300x300.png"
            class="rounded-circle float-start" style="max-width: 100%; height: 45px;"
            alt="avatar">
        <div class="about float-start ps-2">
            <div class="name">${username}</div>
        </div>`;
    li.addEventListener('click', e => currentChat(e));
    document.getElementById('user-list').appendChild(li);
}

function currentChat(e) {
    const target = e.target;
    target.classList.add('active');
    const siblings = [...target.parentElement.children];
    siblings.forEach(sibling => {
        if (sibling !== target) {
            sibling.classList.remove('active');
            document.getElementById(`${sibling.id}-chat`).style.display = "none";
        }
    });
    console.log(`activated chat with ${target.id}`);
    document.getElementById(`${target.id}-chat`).style.display = "block";
    window.sessionStorage.setItem("currentChat", target.id);
}

function outputMessage(message) {
    const div = document.createElement('div');
    div.classList.add('clearfix')
    div.classList.add('message');
    if (message.user === socket.username) {
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
        div.innerHTML = `<div>
            <div>
                <span style="font-size: 13px;">${message.time}</span>
            </div>
            <div class="float-start card p-2 bg-primary bg-opacity-25">
                <span>${message.text}</span>
            </div>
        </div>`;
    }
    console.log(`${window.sessionStorage.getItem("currentChat")}-chat`);
    document.getElementById(`${window.sessionStorage.getItem("currentChat")}-chat`).appendChild(div);
}
