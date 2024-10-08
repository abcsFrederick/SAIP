var path = require('path');
var fs = require('fs-extra');
var fsp = require('fs').promises;
var rimraf = require('rimraf');
var validator = require('express-validator');
var express = require('express');
var archiver = require('archiver');
// var async = require('async');

const { isAdmin, isAuth, mysqlcon, pgconpool } = require('../utils.js');

var logger = require('../loggerConfig.js');

var datasourceRouter = express.Router();
require('express-ws')(datasourceRouter);

const Pool = require('pg-pool');
const { reject } = require('async');
var parse = require('pg-connection-string').parse;

var config = require('config');
const intermediate_storage = config.get('filesystemConfig.intermediate_storage');


const dirSize = async dir => {
    const files = await fsp.readdir( dir, { withFileTypes: true } );
  
    const paths = files.map( async file => {
        const file_path = path.join( dir, file.name );
    
        if ( file.isDirectory() ) return await dirSize( file_path );
    
        if ( file.isFile() ) {
            const { size } = await fsp.stat( file_path );
            
            return size;
        }
    
        return 0;
    } );
  
    return ( await Promise.all( paths ) ).flat( Infinity ).reduce( ( i, size ) => i + size, 0 );
  }

let zipFolderWithProgress = function(webSocket, srcFolder, zipFilePath, totalSize, callback) {
    var output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', {
        zlib: { level: 9 } // Sets the compression level.
    });

    output.on('close', function() {
        console.log(archive.pointer() + ' total bytes');
        console.log('archiver has been finalized and the output file descriptor has closed.');
        callback();
    });
    archive.on('progress', function() {
        var percent = 100 - ((totalSize - archive.pointer()) / totalSize) * 100;
        // check if webSocket is alive
        if (webSocket.readyState === 1) {
            webSocket.send(JSON.stringify({'err': 2, 'msg': `${parseInt(archive.pointer() / (1024 * 1024))}/${parseInt(totalSize / (1024 * 1024))}(${parseInt(percent)}%)`}));  
        } else {
            fs.unlink(zipFilePath);
            callback();
        }
    });
    archive.pipe(output);

    archive.directory(srcFolder, false);

    archive.finalize(function(err, bytes) {
        if(err) {
            callback(err);
        }
    });
}

let getGroups = (sql) => { 
    return new Promise ((resolve, reject) => {
        let groups = [];
        mysqlcon.getConnection((err, connection) => {
            if (err) throw err;
            var query = connection.query(sql);
            query.on('result', (row) => {
                console.log(row)
                if (row['db_partition']) {
                    let is_admin = row['is_admin'];
                    if (is_admin === undefined) {
                        is_admin = 1;
                    }
                    groups.push({
                        'group_id': row['id'],
                        'group_name': row['name'],
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

let getLists = (sql, is_admin) => {
    return new Promise ((resolve, reject) => {
        let lists = [];
        mysqlcon.getConnection((err, connection) => {
            if (err) throw err;
            var query = connection.query(sql);
            query.on('result', (row) => {
                lists.push({
                    'user_id': row['user_id'],
                    'source_name': row['source_name'],
                    'source_id': row['source_id'],
                    'source_type': row['source_type'],
                    'source_path': row['source_path'],
                    'parent_id': row['parent_id'],
                    'parent_type': row['parent_type'],
                    'source_group_name': row['source_group_name'],
                    'source_group_id': row['source_group_id'],
                    'is_admin': is_admin
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
        + '(' + req.session.user_id[0] + ') GET `/api/v1/data_source_overview/`'
    });
    let data_source_list;
    if (req.session.permission === 2) {
        let mysql = `SELECT * FROM site_groups;`;

        let available_groups = await getGroups(mysql);
        for(let a = 0; a < available_groups.length; a++) {
            let mysql = `SELECT id AS source_id, name AS source_name, path AS source_path, 
                type AS source_type, parent_id, parent_type, @is_admin:=1 AS is_admin, 
                @source_group_name:='${available_groups[a]['group_name']}' AS source_group_name, 
                @source_group_id:=${available_groups[a]['group_id']} AS source_group_id FROM archive_${available_groups[a]['group_name']} 
                WHERE parent_type='group';`;
            let result = await getLists(mysql, available_groups[a]['is_admin']);
            if (data_source_list !== undefined) {
                data_source_list = data_source_list.concat(result);
            } else {
                data_source_list = result;
            }
        }
    } else {
        let mysql = `SELECT * FROM(SELECT site_group_memberships.group_id, site_group_memberships.is_admin 
        FROM (SELECT id FROM site_users WHERE id=${req.session.user_id[0]}) AS t1 
        LEFT JOIN site_group_memberships ON t1.id=site_group_memberships.person_id WHERE active=1) AS t2 
        LEFT JOIN site_groups ON t2.group_id=site_groups.id;`;
        let available_groups = await getGroups(mysql);
        let user_groups = [];
        for(let a = 0; a < available_groups.length; a++) {
            let mysql;
            if(available_groups[a]['is_admin']) {
                mysql = `SELECT id AS source_id, name AS source_name, path AS source_path, 
                type AS source_type, parent_id, parent_type, @is_admin:=1 AS is_admin, 
                @source_group_name:='${available_groups[a]['group_name']}' AS source_group_name, 
                @source_group_id:=${available_groups[a]['group_id']} AS source_group_id FROM archive_${available_groups[a]['group_name']} 
                WHERE parent_type='group';`;
            } else {
                user_groups.push(available_groups[a]);
                continue;
            }
            let result = await getLists(mysql, available_groups[a]['is_admin']);
            if (data_source_list !== undefined) {
                data_source_list = data_source_list.concat(result);
            } else {
                data_source_list = result;
            }
        }
        for (let a = 0; a < user_groups.length; a++) {
            let mysql = `SELECT name AS source_name, type AS source_type, path AS source_path, parent_id, parent_type,
            t1.source_id, t1.source_group_id, t1.source_group_name, @is_admin:=0  AS is_admin 
            FROM (SELECT source_group_id, source_group_name, source_id 
            FROM user_files WHERE user_id=${req.session.user_id[0]} AND source_group_id=${user_groups[a]['group_id']}) AS t1 
            LEFT JOIN archive_${user_groups[a]['group_name']} on t1.source_id=archive_${user_groups[a]['group_name']}.id;`
            let result = await getLists(mysql, user_groups[a]['is_admin']);
            if (data_source_list !== undefined) {
                data_source_list = data_source_list.concat(result);
            } else {
                data_source_list = result;
            }
        }
    }

    return res.json(data_source_list);
});

datasourceRouter.get('/data_source_children', isAuth, async (req, res, next) => {
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') GET `/data_source_children` '
    });
    let parent_id = req.query.source_id;
    let archive_DB = `archive_${req.query.source_group_name}`;
    let is_admin = parseInt(req.query.is_admin);
    let mysql = `SELECT id AS source_id, name AS source_name, path AS source_path, 
                type AS source_type, parent_id, parent_type, @is_admin:=1 AS is_admin, 
                @source_group_name:='${req.query.source_group_name}' AS source_group_name, 
                @source_group_id:=${req.query.source_group_id} AS source_group_id FROM ${archive_DB} 
                WHERE parent_id=${parent_id} AND parent_type='folder';`;
    let result = await getLists(mysql, is_admin);
    return res.json(result);
});

datasourceRouter.get('/post_download', isAuth, (req, res, next) => {
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') GET `/api/v1/post_download` path: '+ req.query.absolutePath
    });
    let downloadAbsolutePath = req.query.absolutePath;
    // for location test only
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.download(downloadAbsolutePath, async function(err){
        if(err) throw err;
        logger.info({
            level: 'info',
            message: req.session.FirstName + ' ' + req.session.LastName
            + '(' + req.session.user_id[0] + ') successfully download zip file path: '+ req.query.absolutePath
        });
        await rimraf(downloadAbsolutePath);
    });
});

datasourceRouter.ws('/pre_download', async (ws, req) => {
    if (req.session.status !== 'Authenticated') {
        ws.send(JSON.stringify({'err': 1, 'msg': 'Please login first or contact admin user to whitelist you'}));
        ws.close();
    }
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
                 + '(' + req.session.user_id[0] + ') WebSocket `/api/v1/pre_download` '
    });

    // let workSpace = '/Users/miaot2/Temp_Test';
    var workSpace = intermediate_storage + req.session.UserPrincipalName;
    let output_name = Date.now();
    let output = path.join(workSpace, output_name);

    if (fs.existsSync(output)) {
        await rimraf(output);
    }
    await fsp.mkdir(output, 0o755);

    ws.send(JSON.stringify({'err': 5, 'msg': 'ready for copy'}));

    ws.on('message', async function(msg) {
        let paths = JSON.parse(msg);
        for(let a = 0; a < paths.length; a++) {
            let src = paths[a];
            let dst = path.join(output, path.basename(src))
            await fsp.cp(src, dst, {recursive: true});
        }
        let output_stat = await dirSize(output);
        zipFolderWithProgress(ws, output, `${output}.zip`, output_stat, async function(err) {
            if (err) {
                rimraf(output, function () { 
                    ws.send(JSON.stringify({'err': 4, 'mgs': 'error occurs when compress the data.'}));
                    ws.close();
                });
                logger.error({
                    level: 'error',
                    message: req.session.FirstName + ' ' + req.session.LastName
                    + '(' + req.session.user_id[0] + ') unsuccessfully zip data to '
                    + output + ".zip"
                    + '\n' + err
                });
            }
            logger.info({
                level: 'info',
                message: req.session.FirstName + ' ' + req.session.LastName
                + '(' + req.session.user_id[0] + ') successfully zip data to '
                + output + ".zip"
            });
            if (ws.readyState === 1) { 
                ws.send(JSON.stringify({'err': 3, 'filePath': `${output}.zip`}));
            }
            await rimraf(output);
            ws.close();
          })
    });
          
});

datasourceRouter.post('/data_source/permission', isAdmin, async (req, res, next) => {

    // let source_id = req.body.source_id;
    // let source_group_id = req.body.source_group_id;
    // let source_group_name = req.body.source_group_name;
    let access_user_lists = req.body.access_user_lists;

    let validate_errors = `Please at least provide a user`;

    if (access_user_lists === '') {
        return res.json({'err': 1, validate_errors});
    }
    access_user_lists = access_user_lists.split(',');
    let source_list = JSON.parse(req.body.source_list);
    for (let a = 0; a < source_list.length; a++) {
        let source_id = source_list[a]['source_id'];
        let source_group_id = parseInt(source_list[a]['source_group_id']);
        let source_group_name = source_list[a]['source_group_name'];
        if (source_group_id === req.session.admin_groups[0]['id'] || req.session.permission > 1) {
            let check_exit_sql = `SELECT * from user_files WHERE source_id=${source_id} AND source_group_id=${source_group_id} AND source_group_name='${source_group_name}'`;
            let exist_users = await getLists(check_exit_sql);
            let exist_users_id = exist_users.map(x => x.user_id.toString());
            let new_users = access_user_lists.filter(function(e) {
                return this.indexOf(e) < 0;
            }, exist_users_id);
            var values =  new_users.map(x => [parseInt(x), source_group_id, source_group_name, source_id]);
            if (values.length) {
                let mysql = `INSERT INTO user_files ( user_id, 
            source_group_id, source_group_name, source_id) VALUES ?`;
                console.log(mysql)
                let result = await grantAccess(mysql, [values]);
            }
        }
    }
    return res.json({'err': 0, 'msg': 'Successfully grant permission for selected users.'});
    // return res.json({'err': 0, 'msg': 'These users already have the permission of the data.'})
});
module.exports = datasourceRouter;