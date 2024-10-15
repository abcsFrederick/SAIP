const fs = require("fs");
const fsc = require("fs/promises");

const path = require('path');
var config = require('config');

const mysqlConfig = config.get('dbConfig.mysql');
const postgresConfig = config.get('dbConfig.postgres');
var logger = require('./loggerConfig.js');

const mysql = require('mysql');
var mysqlcon = mysql.createPool(mysqlConfig);

const Pool = require('pg-pool');
const { group } = require("console");
var parse = require('pg-connection-string').parse;

var {spawn, exec} = require('child_process');
const chokidar = require('chokidar');
const cron = require('node-cron');

var pgConfig = parse(postgresConfig);
const pgconpool = new Pool(pgConfig);


let insertRecord = (sql, value) => { 
    return new Promise ((resolve, reject) => {
        let insertId;
        mysqlcon.getConnection((err, connection) => {
            if (err) throw err;
            var query = connection.query(sql, [[value]]);
            query.on('error', (err) => {
              reject(err)
            });
            query.on('result', (re) => {
                insertId = re.insertId;
            });
            query.on('end', (re) => {
                connection.release();
                resolve(insertId);
            });
        });
    });
}

let getResults = (sql) => { 
    return new Promise ((resolve, reject) => {
        let groups = [];
        mysqlcon.getConnection((err, connection) => {
            if (err) reject(err);
            connection.query(sql, function (error, results, fields) {
              connection.release();
              if (error) reject(error);
              resolve(results);
            });
        });
    });
}

let removeDepulicate = (sql, dirLists) => {
    return new Promise ((resolve, reject) => {
        mysqlcon.getConnection((err, connection) => {
            if (err) reject(err);
            let query = connection.query(sql, [dirLists]);
            query.on('result', (row) => {
                dirLists.splice(dirLists.indexOf(row['path']), 1);
            });
            query.on('end', () => {
                connection.release();
                resolve(dirLists)
            });
        });
    });
}

let updateDB = (sql) => { 
    return new Promise ((resolve, reject) => {
        let lists = [];
        mysqlcon.getConnection((err, connection) => {
            if (err) throw err;
            var query = connection.query(sql);
            query.on('error', (err) => {
              reject(err)
            });
            query.on('end', (re) => {
                connection.release();
                resolve()
            });
        });
    });
}

var isSysAdmin = function (req, res, next) {
    if (req.session.admin_groups.filter(a => a.id === 7).length) {
        return next();
    } else {
        return res.json({'err': '1', 'msg': 'Contact System Admin user to gain permission'});
    }
}
var isAdmin = function (req, res, next) {
    if (req.session.admin_groups.length) {
        return next();
    } else {
        return res.json({'err': '1', 'msg': 'Contact Admin user to gain permission'});
    }
}

var isAuth = function (req, res, next) {
    if (req.session.status === 'Authenticated') {
        return next();
    } else {
        return res.json({'err': '1', 'msg': 'Please login first or contact admin user to whitelist you'});
    }
}

var initializeDB = function (partition, DB_TABLE, group_id) {
    function walk(connection, dir, parent_id, parent_type) {
        fs.readdir(dir, (err, files) => {
            if (err) throw err;

            files.forEach(file => {
            const filePath = path.join(dir, file);
            fs.stat(filePath, (err, stats) => {
                if (err) throw err;

                let sql = `INSERT INTO ${DB_TABLE} (name, type, parent_id, parent_type, path) VALUES ?`
                if (stats.isDirectory()) {
                    let value = [file, 'folder', parent_id, parent_type, filePath];
                    console.log(sql, value)
                    var query = connection.query(sql, [[value]]);
                    query.on('error', (err) => {
                        console.error(err)
                    });
                    query.on('result', (re) => {
                        console.log(`Successfully insert a FOLDERS with row: ${re.insertId} with value ${value}`)
                        walk(connection, filePath, re.insertId, 'folder'); // Recursively walk into subdirectories
                    });
                } else {
                    let value = [file, 'file', parent_id, parent_type, filePath];
                    console.log(sql, value)
                    var query = connection.query(sql, [[value]]);
                    query.on('error', (err) => {
                        console.error(err)
                    });
                    query.on('result', (re) => {
                        console.log(`Successfully insert a FILES with row: ${re.insertId} with value ${value}`)
                    });
                }
            });
            });
        });
    }
    mysqlcon.getConnection((err, connection) => {
        walk(connection, partition, group_id, 'group');
        connection.release();
    });
}

var monitorArchive = function (DB_TABLE, partition){
    const log = console.log.bind(console);
    return '';
}

var insertArchive = async function(connection, DB_TABLE, fileLevels, parentPath, parent_id, parent_type) {
    return new Promise((resolve) => {
        if(fileLevels.length) {
            let level = fileLevels.shift();
            let filePath = path.join(parentPath, level);
            let sql_1 = `SELECT * FROM ${DB_TABLE} WHERE path='${filePath}';`

            let findParent = connection.query(sql_1);
            let parent_re;
            let type = 'folder';
            findParent.on('error', (err) => {
                console.error(err)
            });
            findParent.on('result', (re) => {
                parent_re = re;
            });
            findParent.on('end', async () => {
                if (!parent_re) {
                    if (!fileLevels.length) {
                        type = 'file';
                    }
                    let sql = `INSERT INTO ${DB_TABLE} (name, type, parent_id, parent_type, path) VALUES ?`;
                    let value = [level, type, parent_id, parent_type, filePath];

                    var query = connection.query(sql, [[value]]);
                    query.on('error', (err) => {
                        console.error(err)
                    });
                    query.on('result', async (re) => {
                        console.log(`Successfully insert a ${type} with row: ${re.insertId} with value ${value}`)
                        await insertArchive(connection, DB_TABLE, fileLevels, filePath, re.insertId, 'folder');

                resolve(); 
                    });
                } else {
                    console.log(`Used existed parent: ${parent_re.id} and heading to the next level`)
                    await insertArchive(connection, DB_TABLE, fileLevels, filePath, parent_re.id, 'folder');
                    resolve();
                }
            });
        } else {
            resolve();
        }
    });
}

var refreshDB = function (DB_TABLE, partition, group_id, last_update_time) {

    const findDir = spawn('find', [partition, '-not', '-path', '*/.*', '-type', 'f', '-newermt', last_update_time]);
    findDir.stdout.on('data', async function(msg) {    
        let newFiles = msg.toString().split(/[\r\n|\n|\r]/).filter(String);
        let depulicateSql = `SELECT * FROM ${DB_TABLE} WHERE path in (?);`;
        let cleaned_newFiles = await removeDepulicate(depulicateSql, newFiles);
        mysqlcon.getConnection(async (err, connection) => {
            for (const file of cleaned_newFiles) {
                let fileLevels = path.relative(partition, file).split('/');
                await insertArchive(connection, DB_TABLE, fileLevels, partition, group_id, 'group');
            }
            connection.release();
            return cleaned_newFiles;
        });
    });
}

var eventTracking = function(type, user) {
    if (type === 'Login') {
        let event = 'Login';
        let eventType = 'Site::UserLoginEvent';
        mysqlcon.getConnection((err, connection) => {
            if (err) throw err;
            var query = connection.query("INSERT INTO site_statistics ( event,type,user_id,owner_id,timestamp,created_at,updated_at) \
                VALUES (?,?,?,null,NOW(),NOW(),NOW())",
                [event,eventType,user],
                function (err, result) {
                    if (err) throw err;
                    logger.info({
                        level: 'info',
                        message: 'Record user(' + user + ') login'
                    });
                    connection.release();
                });
        });
    }
    if (type === 'Study') {
        let event = 'Study Download';
        let eventType = 'Site::StudyDownloadEvent';
        mysqlcon.getConnection((err, connection) => {
            if (err) throw err;
            var query = connection.query("INSERT INTO site_statistics ( event,type,user_id,owner_id,timestamp,created_at,updated_at) \
                VALUES (?,?,?,null,NOW(),NOW(),NOW())",
                [event,eventType,user],
                function (err, result) {
                    if (err) throw err;
                    logger.info({
                        level: 'info',
                        message: 'Record user(' + user + ') download a study'
                    });
                    connection.release();
                });
        });
    }
    if (type === 'Experiment') {
        let event = 'Experiment Download';
        let eventType = 'Site::ExperimentDownloadEvent';
        mysqlcon.getConnection((err, connection) => {
            if (err) throw err;
            var query = connection.query("INSERT INTO site_statistics ( event,type,user_id,owner_id,timestamp,created_at,updated_at) \
                VALUES (?,?,?,null,NOW(),NOW(),NOW())",
                [event,eventType,user],
                function (err, result) {
                    if (err) throw err;
                    logger.info({
                        level: 'info',
                        message: 'Record user(' + user + ') download an experiment'
                    });
                    connection.release();
                });
        });
    }
    if (type === 'Series') {
        let event = 'Series Download';
        let eventType = 'Site::SeriesDownloadEvent';
        mysqlcon.getConnection((err, connection) => {
            if (err) throw err;
            var query = connection.query("INSERT INTO site_statistics ( event,type,user_id,owner_id,timestamp,created_at,updated_at) \
                VALUES (?,?,?,null,NOW(),NOW(),NOW())",
                [event,eventType,user],
                function (err, result) {
                    if(err) throw err;
                    logger.info({
                        level: 'info',
                        message: 'Record user(' + user + ') download a series'
                    });
                    connection.release();
                });
        });
    }
    if (type === 'Data') {
        let event = 'Data Download';
        let eventType = 'Site::DataDownloadEvent';
        mysqlcon.getConnection((err, connection) => {
            if (err) throw err;
            var query = connection.query("INSERT INTO site_statistics ( event,type,user_id,owner_id,timestamp,created_at,updated_at) \
                VALUES (?,?,?,null,NOW(),NOW(),NOW())",
                [event,eventType,user],
                function (err, result) {
                    if(err) throw err;
                    logger.info({
                        level: 'info',
                        message: 'Record user(' + user + ') download a data'
                    });
                    connection.release();
                });
        });
    }
    if (type === 'Permission') {
        let event = 'Assign Permission';
        let eventType = 'Site::AssignPermissionEvent';
        mysqlcon.getConnection((err, connection) => {
            if (err) throw err;
            var query = connection.query("INSERT INTO site_statistics ( event,type,user_id,owner_id,timestamp,created_at,updated_at) \
                VALUES (?,?,?,null,NOW(),NOW(),NOW())",
                [event,eventType,user],
                function (err, result) {
                    if(err) throw err;
                    logger.info({
                        level: 'info',
                        message: 'Record user(' + user + ') assign permission for users.'
                    });
                    connection.release();
                });
        });
    }
}
module.exports = { isSysAdmin, isAdmin, isAuth, mysqlcon, pgconpool, initializeDB, monitorArchive, refreshDB, eventTracking }