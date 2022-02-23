const pgPromise = require('pg-promise');
const pgp = pgPromise({});

// Local PostgreSQL credentials
const username = "postgres";
const password = "admin";
const cn = {
    connectionString: process.env.DATABASE_URL || `postgres://${username}:${password}@localhost/`,
    ssl: {
        require: true,
        rejectUnauthorized: false
    }
}
const db = pgp(cn);

async function connectAndRun(task) {
    let connection = null;
    try {
        connection = await db.connect();
        return await task(connection);
    } catch (e) {
        throw e;
    } finally {
        try {
            connection.done();
        } catch (ignored) {

        }
    }
}

async function addUser(name, hash) {
    try {
        if (await findUser(name)) {
            return false;
        }
        insertUser(name, hash);
        return true;
    } catch (error) {
        console.log(error);
    }
}

async function getUserHash(user) {
    return await connectAndRun(db => db.any("SELECT hash FROM users where username = $1", user));
}

async function insertUser(name, hash) {
    try {
        return await connectAndRun(db => db.any("INSERT INTO users(username, hash) VALUES($1, $2);", [name, hash]));
    } catch (error) {
        console.log(error);
    }
}

async function userExists(user) {
    try {
        return (await connectAndRun(db => db.any("SELECT EXISTS (SELECT * FROM users WHERE username=$1);", user)))[0].exists;
    } catch (error) {
        console.log(error);
    }
}

async function findUser(username) {
    try {
        if (await userExists(username)) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.log(error);
    }
}

async function addRooms(username) {
    try {
        const otherUsers = await connectAndRun(db => db.any("SELECT id FROM users WHERE NOT username=$1;", username));
        const user_id = (await connectAndRun(db => db.any("SELECT id FROM users WHERE username=$1;", username)))[0].id;
        for (let i = 0; i < otherUsers.length; i++) {
            await connectAndRun(db => db.any("INSERT INTO rooms DEFAULT VALUES;"));

            const room_id = (await connectAndRun(db => db.any("SELECT MAX(id) FROM rooms;")))[0].max;

            await connectAndRun(db => db.any(`INSERT INTO participants VALUES(${otherUsers[i].id}, ${room_id}); INSERT INTO participants VALUES(${user_id}, ${room_id});`));
        }
    } catch (error) {
        console.log(error);
    }
}

async function addMessage(sender, receiver, message) {
    try {
        await connectAndRun(db => db.any(`INSERT INTO messages(author_id, room_id, message) VALUES((SELECT id FROM users WHERE username='${sender}') , (SELECT room_id FROM (SELECT id, user_id AS user_id_1 FROM rooms INNER JOIN participants ON id=room_id WHERE user_id = (SELECT id FROM users WHERE username='${sender}')) AS foo INNER JOIN participants ON id=room_id WHERE user_id = (SELECT id FROM users WHERE username='${receiver}')), '${message}');`));
    } catch (error) {
        console.log(error);
    }    
}


module.exports = {
    addUser: addUser,
    getUserHash: getUserHash,
    findUser: findUser,
    addRooms: addRooms,
    addMessage : addMessage
};