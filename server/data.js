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


module.exports = {
    addUser: addUser,
    getUserHash : getUserHash,
    findUser : findUser
};