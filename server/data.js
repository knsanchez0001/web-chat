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
    try {
        if (await findUser(name)) {
            return false;
        }
        insertUser(name);
        return true;
    } catch (error) {
        console.log(error);
    }
}

async function insertUser(name) {
    try {
        return await connectAndRun(db => db.any("INSERT INTO users(name) Values($1);", [name]));
    } catch (error) {
        console.log(error);
    }
}

async function userExists(user) {  
    try {
        return (await connectAndRun(db => db.any("SELECT EXISTS (SELECT * FROM users WHERE name=$1);", user)))[0].exists;
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


module.exports = {
    addUser: addUser
};