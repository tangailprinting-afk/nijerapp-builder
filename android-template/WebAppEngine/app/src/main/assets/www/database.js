const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

const CONFIG_FILE = path.join(
app.getPath("userData"),
"config.json"
);

function getConfig() {

if (!fs.existsSync(CONFIG_FILE)) {
    return null;
}

return JSON.parse(
    fs.readFileSync(
        CONFIG_FILE,
        "utf8"
    )
);

}

function saveConfig(data) {


fs.writeFileSync(
    CONFIG_FILE,
    JSON.stringify(
        data,
        null,
        2
    )
);

}


function connectDatabase() {


const config =
    getConfig();

if (!config) {
    return null;
}

return new sqlite3.Database(
    config.databasePath
);


}

function save(
collection,
data
) {


const db =
    connectDatabase();

return new Promise(
    (resolve, reject) => {

        db.run(
            `
            CREATE TABLE IF NOT EXISTS ${collection} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            `,
            (err) => {

                if (err) {

                    reject(
                        err.message
                    );

                    return;
                }

                db.run(
                    `
                    INSERT INTO ${collection}
                    (data)
                    VALUES (?)
                    `,
                    [
                        JSON.stringify(
                            data
                        )
                    ],
                    function(err) {

                        if (err) {

                            reject(
                                err.message
                            );

                        } else {

                            resolve(
                                this.lastID
                            );

                        }

                    }
                );

            }
        );

    }
);


}

function get(collection) {


const db = connectDatabase();

return new Promise((resolve, reject) => {

    db.all(
        `
        SELECT *
        FROM ${collection}
        ORDER BY id DESC
        `,
        [],
        (err, rows) => {

            if (err) {

                reject(err.message);

            } else {

                const data =
                    rows.map(row => ({
                        id: row.id,
                        ...JSON.parse(
                            row.data
                        )
                    }));

                resolve(data);

            }

        }
    );

});


}

function update(
collection,
id,
data
) {


const db = connectDatabase();

return new Promise((resolve, reject) => {

    db.run(
        `
        UPDATE ${collection}
        SET data = ?
        WHERE id = ?
        `,
        [
            JSON.stringify(data),
            id
        ],
        function(err) {

            if (err) {

                reject(err.message);

            } else {

                resolve(true);

            }

        }
    );

});


}

function remove(
collection,
id
) {


const db = connectDatabase();

return new Promise((resolve, reject) => {

    db.run(
        `
        DELETE FROM ${collection}
        WHERE id = ?
        `,
        [id],
        function(err) {

            if (err) {

                reject(err.message);

            } else {

                resolve(true);

            }

        }
    );

});


}

function count(collection) {


const db = connectDatabase();

return new Promise((resolve, reject) => {

    db.get(
        `
        SELECT COUNT(*) as total
        FROM ${collection}
        `,
        [],
        (err, row) => {

            if (err) {

                reject(err.message);

            } else {

                resolve(
                    row.total
                );

            }

        }
    );

});


}

function search(
collection,
keyword
) {


const db = connectDatabase();

return new Promise((resolve, reject) => {

    db.all(
        `
        SELECT *
        FROM ${collection}
        WHERE data LIKE ?
        ORDER BY id DESC
        `,
        [
            "%" +
            keyword +
            "%"
        ],
        (err, rows) => {

            if (err) {

                reject(
                    err.message
                );

            } else {

                const data =
                    rows.map(
                        row => ({
                            id: row.id,
                            ...JSON.parse(
                                row.data
                            )
                        })
                    );

                resolve(
                    data
                );

            }

        }
    );

});


}














module.exports = {
    getConfig,
    saveConfig,
    connectDatabase,
    save,
    get,
    update,
    remove,
    count,
    search
};
