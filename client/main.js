const chatForm = document.getElementById("chat-form");
const chatMessages = document.getElementById("chat-messages");
const socket = io();
const chatRooms = {};

socket.on('connected', (note, username) => {
    console.log(note);
    socket.username = username;
    document.getElementById("sidebar-header").innerText = username;
});

socket.on('user-list', users => {
    for (const [key, value] of Object.entries(users)) {
        if (socket.username !== key) {
            if (!document.getElementById(key)) {
                addUserSideBar(key);
                const div = document.createElement('div');
                div.id = `${key}-chat`;
                div.classList.add("h-full", "w-full");
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

socket.on('private message', (anotherSocketId, username, message) => {
    console.log(message);
    if(socket.id === anotherSocketId){
        outputMessage(message, window.sessionStorage.getItem("selectedUser"));
    } else {
        outputMessage(message, username);
    }
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const message = e.target.elements.msg.value;
    console.log(chatRooms[window.sessionStorage.getItem("selectedUser")]);
    socket.emit('private message', chatRooms[window.sessionStorage.getItem("selectedUser")],socket.username, message);

    e.target.elements.msg.value = '';
    e.target.elements.msg.focus();
});

function addUserSideBar(username) {
    const div = document.createElement("div");
    div.id = username;
    div.classList.add("flex", "w-full", "h-12", "hover:bg-slate-500", "border-b", "border-slate-200");
    div.innerHTML = 
        `<div class="flex w-full justify-center items-center">
            <div class="name">${username}</div>
        </div>`;
    div.addEventListener('click', e => selectedUser(e));
    document.getElementById('sidebar-contacts-list').appendChild(div);
}

function selectedUser(e) {
    let target = e.target;
    while(target.id === ""){ // Weird bug fix
        target = target.parentElement;
    }
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
    document.getElementById("chat-header").innerText = target.id;
    window.sessionStorage.setItem("selectedUser", target.id);
    chatForm.classList.remove("invisible");
}

function outputMessage(message, selectedUser) {
    const div = document.createElement('div');
    div.classList.add('message', 'container');
    if (message.user === socket.username) {
        div.innerHTML = `<div class="flex flex-col max-w-fit ml-auto mr-4">
            <div class="ml-auto">
                <span style="font-size: 13px;">${message.time}</span>
            </div>
            <div class="p-2 bg-emerald-100">
                <span>${message.text}</span>
            </div>
        </div>`;
    }
    else {
        div.innerHTML = `<div class="flex flex-col max-w-fit ml-4">
            <div>
                <span style="font-size: 13px;">${message.time}</span>
            </div>
            <div class="p-2 bg-slate-50">
                <span>${message.text}</span>
            </div>
        </div>`;
    }
    console.log(`${selectedUser}-chat`);
    document.getElementById(`${selectedUser}-chat`).appendChild(div);
}
