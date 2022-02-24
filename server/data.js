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

async function addUser(username, hash) {
    if (await findUser(username)) {
        return false;
    }
    await insertUser(username, hash);
    return true;
}

async function getUserHash(username) {
    return await connectAndRun(db => db.any("SELECT hash FROM users where username = $1", username));
}

async function insertUser(username, hash) {
    return await connectAndRun(db => db.any("INSERT INTO users(username, hash) VALUES($1, $2);", [username, hash]));
}

async function userExists(username) {
    return (await connectAndRun(db => db.any("SELECT EXISTS (SELECT * FROM users WHERE username=$1);", username)))[0].exists;
}

async function findUser(username) {
    if (await userExists(username)) {
        return true;
    } else {
        return false;
    }
}

async function addRooms(username) {
    const otherUsers = await getOtherUserIds(username);
    const user_id = (await connectAndRun(db => db.any("SELECT id FROM users WHERE username=$1;", username)))[0].id;
    for (let i = 0; i < otherUsers.length; i++) {
        await connectAndRun(db => db.any("INSERT INTO rooms DEFAULT VALUES;"));

        const room_id = (await connectAndRun(db => db.any("SELECT MAX(id) FROM rooms;")))[0].max;
        await connectAndRun(db => db.any(`
            INSERT INTO participants VALUES($1, $3); 
            INSERT INTO participants VALUES($2, $3);`, [otherUsers[i].id, user_id, room_id]));
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

async function getOtherUserIds(username) {
    return await connectAndRun(db => db.any("SELECT id FROM users WHERE NOT username=$1;", username));
}

async function getUsernames() {
    return await connectAndRun(db => db.any("SELECT username FROM users"));
}

async function createUserList() {
    const userList = {};
    const usernames = await getUsernames();
    for (let i = 0; i < usernames.length; i++) {
        const username = usernames[i].username;
        userList[username] = null;   
    }
    return userList;
}

async function getMessages(username) {
    const messages = await connectAndRun(db => db.any(`
        SELECT id, author, reader, reader_2, message
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
            LEFT JOIN( SELECT username AS reader_2, id AS u_id FROM users) AS readers_2
            ON readers_2.u_id=buzz.user_id
            WHERE NOT reader_2=$1 ORDER BY id;`, username));
    return messages;
}

module.exports = {
    addUser: addUser,
    getUserHash: getUserHash,
    findUser: findUser,
    addRooms: addRooms,
    addMessage: addMessage,
    createUserList: createUserList,
    getMessages: getMessages
};