const pgPromise = require('pg-promise');
const pgp = pgPromise({});

// Local PostgreSQL credentials
const username = "postgres";
const password = "admin";
const url = process.env.DATABASE_URL || `postgres://${username}:${password}@localhost/`;
const db = pgp(url);

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

async function addUser(name) {
    if (await findUser(name)) {
        return false;
    }
    insertUser(name);
    return true;
}

async function insertUser(name) {
    return await connectAndRun(db => db.any("INSERT INTO users(name) Values($1);", [name]));
}

async function userExists(user) {
    return (await connectAndRun(db => db.any("SELECT EXISTS (SELECT * FROM users WHERE name=$1);", user)))[0].exists;
}

async function findUser(username) {
    if (await userExists(username)) {
        return true;
    } else {
        return false;
    }
}


module.exports = {
    addUser: addUser
};