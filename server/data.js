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

async function getUserHash(username) {
    return await connectAndRun(db => db.one("SELECT hash FROM users where username = $1", username)).then(obj => obj.hash);
}

async function userExists(username) {
    return await connectAndRun(db => db.one("SELECT EXISTS (SELECT * FROM users WHERE username=$1)", username)).then(obj => obj.exists);
}

async function registerUser(username, hash) {
    if(await userExists(username)){
        return false;
    }
    await connectAndRun(db => db.none("INSERT INTO users(username, hash) VALUES($1, $2)", [username, hash]));
    await addRooms(username);
}

async function addRooms(username) {
    const otherUserIds = await connectAndRun(db => db.manyOrNone("SELECT id FROM users WHERE NOT username=$1;", username)).then(arr => arr.map(obj => obj.id));
    if(otherUserIds.length === 0){
        await connectAndRun(db => db.any("INSERT INTO rooms DEFAULT VALUES"));
        return;
    }
    
    const user_id = await connectAndRun(db => db.one("SELECT id FROM users WHERE username=$1", username)).then(obj => obj.id);
    for (let i = 0; i < otherUserIds.length; i++) {
        await connectAndRun(db => db.any(`
            INSERT INTO participants VALUES($1, (SELECT MAX(id) FROM rooms)); 
            INSERT INTO participants VALUES($2, (SELECT MAX(id) FROM rooms));
            INSERT INTO rooms DEFAULT VALUES;`, [otherUserIds[i], user_id]));
    }
}

async function addMessage(sender, receiver, message) {
    await connectAndRun(db => db.any(`
        INSERT INTO messages(author_id, room_id, message) 
        VALUES(
            (SELECT id FROM users WHERE username=$1) , 
            (SELECT room_id 
                FROM (
                        SELECT id, user_id AS user_id_1 
                            FROM rooms 
                        INNER JOIN participants 
                        ON id=room_id WHERE user_id = (SELECT id FROM users WHERE username=$1)) AS foo 
                INNER JOIN participants ON id=room_id WHERE user_id = (SELECT id FROM users WHERE username=$2)), 
            $3);`, [sender, receiver, message]));

}

async function createUserList() {
    const userList = {};
    const usernames = await connectAndRun(db => db.manyOrNone("SELECT username FROM users")).then(arr => arr.map(obj => obj.username))
    for (let i = 0; i < usernames.length; i++) {
        userList[usernames[i]] = null;   
    }
    return userList;
}

async function getMessages(username) {
    const messages = await connectAndRun(db => db.any(`
        SELECT author, buddy, message
            FROM (
                SELECT id, author, reader, message, user_id
                    FROM (
                        SELECT id, author, reader, message, room_id
                            FROM (
                                SELECT id, author, message, room_id, user_id
                                    FROM (
                                        SELECT id, author, message, room_id AS r_id
                                            FROM messages
                                            LEFT JOIN (SELECT username AS author, id AS u_id FROM users) AS authors
                                            ON author_id=authors.u_id) AS foo
                                    LEFT JOIN participants
                                    ON foo.r_id=participants.room_id) AS bar
                            LEFT JOIN (SELECT username AS reader, id AS u_id FROM users) AS readers
                            ON bar.user_id=readers.u_id
                            WHERE reader=$1) AS fizz
                    LEFT JOIN (SELECT user_id, room_id AS r_id FROM participants) AS par
                    ON fizz.room_id = par.r_id) AS buzz
            LEFT JOIN( SELECT username AS buddy, id AS u_id FROM users) AS buddies
            ON buddies.u_id=buzz.user_id
            WHERE NOT buddy=$1 ORDER BY id;`, username));
    return messages;
}

module.exports = {
    registerUser : registerUser,
    getUserHash: getUserHash,
    userExists : userExists,
    addMessage: addMessage,
    createUserList: createUserList,
    getMessages: getMessages
};