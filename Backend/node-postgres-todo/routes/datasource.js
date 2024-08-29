var validator = require('express-validator');
var express = require('express');
// var async = require('async');

const { isAdmin, isAuth, mysqlcon, pgconpool } = require('../utils.js');

var logger = require('../loggerConfig.js');

var datasourceRouter = express.Router();
const Pool = require('pg-pool');
const { reject } = require('async');
var parse = require('pg-connection-string').parse;

let getGroups = (sql) => { 
    return new Promise ((resolve, reject) => {
        let groups = [];
        mysqlcon.getConnection((err, connection) => {
            if (err) throw err;
            var query = connection.query(sql);
            query.on('result', (row) => {
                if (row['db']) {
                    let is_admin = row['is_admin'];
                    if (is_admin === undefined) {
                        is_admin = 1;
                    }
                    groups.push({
                        'group_id': row['id'],
                        'group_name': row['name'],
                        'db': row['db'],
                        'partition': row['db_partition'],
                        'is_admin': is_admin
                    })
                }
            });
            query.on('end', () => {
                connection.release();
                resolve(groups)
            });
        });
    });
}

let getLists = (sql) => { 
    return new Promise ((resolve, reject) => {
        let lists = [];
        mysqlcon.getConnection((err, connection) => {
            if (err) throw err;
            var query = connection.query(sql);
            query.on('result', (row) => {
                lists.push({
                    'user_id': row['user_id'],
                    'source_id': row['source_id'],
                    'source_group_name': row['source_group_name'],
                    'source_group_id': row['source_group_id'],
                    'is_admin': 0
                })
            });
            query.on('end', () => {
                connection.release();
                resolve(lists)
            });
        });
    });
}

let grantAccess = (sql, val) => { 
    return new Promise ((resolve, reject) => {
        console.log(sql)
        let lists = [];
        mysqlcon.getConnection((err, connection) => {
            if (err) throw err;
            var query = connection.query(sql, val);
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

datasourceRouter.get('/data_source_overview', isAuth, async (req, res, next) => {   //isAuth
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') GET `/api/v1/files_overview/`'
    });
    let data_source_list;
    if (req.session.permission === 2) {
        let mysql = `SELECT * FROM site_groups;`;

        let available_groups = await getGroups(mysql);
        console.log(available_groups)
        for(let a = 0; a < available_groups.length; a++) {
            let pgConfig = parse(available_groups[a]['db']);
            console.log(pgConfig)
            let pgconpool = new Pool(pgConfig);
            const client = await pgconpool.connect();
            // assume all db has the same query as below 
            let pgsql = `SELECT id AS source_id, name AS source_name, location AS source_path, 1 AS is_admin, 
            '${available_groups[a]['group_name']}' AS source_group_name, 
            '${available_groups[a]['group_id']}' AS source_group_id 
            FROM files`;
            let result = await client.query(pgsql);
            if (data_source_list !== undefined) {
                data_source_list = data_source_list.concat(result.rows);
            } else {
                data_source_list = result.rows;
            }
            client.release();
        }
    } else {
        let mysql = `SELECT * FROM(SELECT site_group_memberships.group_id, site_group_memberships.is_admin 
        FROM (SELECT id FROM site_users WHERE id=${req.session.user_id[0]}) AS t1 
        LEFT JOIN site_group_memberships ON t1.id=site_group_memberships.person_id) AS t2 
        LEFT JOIN site_groups ON t2.group_id=site_groups.id;`;
        let available_groups = await getGroups(mysql);
        let user_groups = [];

        for(let a = 0; a < available_groups.length; a++) {
            let pgConfig = parse(available_groups[a]['db']);
            let pgconpool = new Pool(pgConfig);
            const client = await pgconpool.connect();
            let pgsql;
            if(available_groups[a]['is_admin']) {
                // assume all db has the same query as below 
                pgsql = `SELECT id AS source_id, name AS source_name, location AS source_path, 1 AS is_admin, 
                '${available_groups[a]['group_name']}' AS source_group_name, 
                '${available_groups[a]['group_id']}' AS source_group_id 
                FROM files`;
            } else {
                user_groups.push(available_groups[a]);
                continue;
            }
            let result = await client.query(pgsql);
            if (data_source_list !== undefined) {
                data_source_list = data_source_list.concat(result.rows);
            } else {
                data_source_list = result.rows;
            }
            client.release();
        }
        for (let a = 0; a < user_groups.length; a++) {
            let mysql = `SELECT * from user_files WHERE user_id=${req.session.user_id[0]} AND source_group_id=${user_groups[a]['group_id']};`
            let source_lists = await getLists(mysql);

            let pgConfig = parse(user_groups[a]['db']);
            let pgconpool = new Pool(pgConfig);
            
            // get file info from pqsql to get the most up-to-date information
            let source_ids = source_lists.map(x => x.source_id);

            let pgsql = `SELECT id AS source_id, name AS source_name, location AS source_path, 0 AS is_admin, 
            '${user_groups[a]['group_name']}' AS source_group_name, 
            '${user_groups[a]['group_id']}' AS source_group_id 
            FROM files WHERE id=ANY(ARRAY[${source_ids}])`;

            const client = await pgconpool.connect();
            let result = await client.query(pgsql);
            if (data_source_list !== undefined) {
                data_source_list = data_source_list.concat(result.rows);
            } else {
                data_source_list = result.rows;
            }

            client.release();
        }
    }

    return res.json(data_source_list);
});

datasourceRouter.get('/downloadData', isAuth, (req, res, next) => {
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') GET `/api/v1/downloadZip` path: '+ req.query.absolutePath
    });
    let downloadAbsolutePath = req.query.absolutePath;
    // for location test only
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.download(downloadAbsolutePath, function(err){
        if(err) throw err;
        logger.info({
            level: 'info',
            message: req.session.FirstName + ' ' + req.session.LastName
            + '(' + req.session.user_id[0] + ') successfully download zip file path: '+ req.query.absolutePath
        });
    });
});

datasourceRouter.post('/data_source/permission', isAdmin, async (req, res, next) => {

    let source_id = req.body.source_id;
    let source_group_id = req.body.source_group_id;
    let source_group_name = req.body.source_group_name;
    let access_user_lists = req.body.access_user_lists;
    let validate_errors = `Please at least provide a user`;

    if (access_user_lists === '') {
        return res.json({'err': 1, validate_errors});
    }
    access_user_lists = access_user_lists.split(',');

    let check_exit_sql = `SELECT * from user_files WHERE source_id=${source_id} AND source_group_id=${source_group_id} AND source_group_name='${source_group_name}'`;
    let exist_users = await getLists(check_exit_sql);

    let exist_users_id = exist_users.map(x => x.user_id.toString())

    let new_users = access_user_lists.filter(function(e) {
        return this.indexOf(e) < 0;
    }, exist_users_id);
    var values =  new_users.map(x => [parseInt(x), source_group_id, source_group_name, source_id]);

    if (values.length) {
        let mysql = `INSERT INTO user_files ( user_id, 
    source_group_id, source_group_name, source_id) VALUES ?`
        let result = await grantAccess(mysql, [values]);
        return res.json({'err': 0, 'msg': 'Successfully grant permission for selected users.'});
    }
    return res.json({'err': 0, 'msg': 'These users already have the permission of the data.'})
});
module.exports = datasourceRouter;