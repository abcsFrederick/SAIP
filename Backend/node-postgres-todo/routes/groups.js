var path = require('path');
var express = require('express');
var config = require('config');
var fs = require('fs');
var async = require('async');

const pg = require('pg');
const Pool = require('pg-pool');
var parse = require('pg-connection-string').parse;

const mysqlConfig = config.get('dbConfig.mysql');
const doc_root = config.get('filesystemConfig.doc_root');

var logger = require('../loggerConfig');

const { isSysAdmin, isAdmin, isAuth, mysqlcon, initializeDB, refreshDB } = require('../utils.js');

var groupsRouter = express.Router();


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

groupsRouter.get('/groups_overview', isSysAdmin, (req, res, next) => {
  /*
      Query groups
  */
  logger.info({
      level: 'info',
      message: req.session.FirstName + ' ' + req.session.LastName
      + '(' + req.session.user_id[0] + ') GET `/api/v1/groups_overview`'
  });
  var results = [];
  mysqlcon.getConnection((err,connection)=>{
      if(err) throw err;
      //FOR mariadb10.2.8
      var query = connection.query("SELECT t1.*, count(site_group_memberships.group_id) as number_of_users, IFNULL(SUM(site_group_memberships.is_admin), 0) as number_of_admin  FROM (SELECT * FROM site_groups) AS t1 LEFT JOIN site_group_memberships ON t1.id=site_group_memberships.group_id GROUP BY t1.name;");
      //FOR MySQL
      //var query = connection.query("SELECT t3.id,t3.last_name,t3.first_name, t3.active, t3.is_pi, JSON_ARRAYAGG(t3.name) AS Groups FROM (SELECT t2.*, site_groups.name FROM (SELECT t1.*, site_group_memberships.group_id FROM (SELECT id, last_name, first_name, active,is_pi FROM site_users) AS t1 LEFT JOIN site_group_memberships ON t1.id=site_group_memberships.person_id) AS t2 LEFT JOIN site_groups ON t2.group_id=site_groups.id) AS t3 GROUP BY t3.id;");
      query.on('result', (row) => {
        results.push(row);
      });
      query.on('end', () => {
        connection.release();
        return res.json(results);
      });
  });
});

groupsRouter.post('/group', isSysAdmin, async (req, res, next) => {
    

  req.checkBody('name','Group name cannot be empty').notEmpty();
  req.checkBody('name','Group name should be a string<varchar(127)>').isString();
  // req.checkBody('db','Group db cannot be empty').notEmpty();
  // req.checkBody('db','Group db should be a string<varchar(127)>').isString();
  // req.checkBody('partition','Group partition cannot be empty').notEmpty();
  // req.checkBody('partition','Group partition should be a string<varchar(127)>').isString();

  var errors = req.validationErrors();

  if (errors) {
    return res.json({'err': 1, errors});
  } else {
      let name = req.body.name;
      let admin = req.body.admin;
      let comment = req.body.comment || '';
      let db = req.body.db || '';
      let partition = req.body.partition || '';

      let exist_group;

      async.waterfall([
        function(callback) {
          mysqlcon.getConnection((err, connection)=>{
            var query = connection.query("SELECT * FROM site_groups WHERE name = '" + name + "';");
            query.on('result', (row) => {
                exist_group = row;
            });
            query.on('end', () => {
                connection.release();
                callback(null, exist_group);
            });
          });
        }, 
        function(arg, callback) {
          if (arg !== undefined) {
            let msg = 'Same Group named as: ' + name + ' is already exist';
            callback(null, {'err': 1, 'errors': msg});
          } else {
            if (partition !== '') {
              try {
                fs.accessSync(partition, fs.constants.R_OK);
                mysqlcon.getConnection((err, connection) => {
                    if(err) callback(null, {'err': 1, 'errors': 'Error occurred while getting the connection'});
                    return connection.beginTransaction(err => {
                      if (err) {
                        connection.release();
                        return callback(null, {'err': 1, 'errors': 'Error occurred while creating the transaction'});
                      }
                      return connection.query("INSERT INTO site_groups (name, comment, db_partition, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
                        [name, comment, partition], function(err, result) {
                        if(err) {
                          return connection.rollback(() => {
                            connection.release();
                            console.log(err)
                            return callback(null, {'err': 1, 'errors': 'Inserting to site_groups table failed'});
                          });
                        }
                        // Record the parition info
                        let DB_TABLE_NAME = `archive_${name}`;
                        var sql = `CREATE TABLE ${DB_TABLE_NAME} (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), type VARCHAR(255), 
                        parent_id INT, parent_type VARCHAR(255), path VARCHAR(255))`;
                        connection.query(sql, function (err, re) {
                          if (err) throw err;
                          initializeDB(partition, DB_TABLE_NAME, result.insertId)
                        });
                        if(admin) {
                          return connection.query("INSERT INTO site_group_memberships (person_id, group_id, is_admin, created_at, updated_at) VALUES (?, ?, 1, NOW(), NOW())",
                                [admin, result.insertId], function(err, result) {
                                if(err) {
                                  return connection.rollback(() => {
                                    connection.release();
                                    console.log(err)
                                    return callback(null, {'err': 1, 'errors': 'Inserting to site_group_memberships table failed'});
                                  });
                                }
                                return connection.commit((err) => {
                                  if (err) {
                                    return connection.rollback(() => {
                                      connection.release();
                                      return callback(null, {'err': 1, 'errors': 'Commit failed'});
                                    });
                                  }
                                  connection.release();
                                  let msg = 'New group: ' + name + 'is added with admin user Id: ' + admin;
                                  return callback(null, {'err': 0,'msg': msg});
                                });
                            });
                        } else {
                          return connection.commit((err) => {
                            if (err) {
                              return connection.rollback(() => {
                                    connection.release();
                                    return callback(null, {'err': 1, 'errors': 'Commit failed'});
                                });
                            }
                            let msg = 'New group: ' + name + 'is added without admin user.';
                            return callback(null, {'err': 0,'msg': msg});
                            connection.release();
                          });
                        }
                      });
                    });
                  });
              } catch (err) {
                let msg = 'Partiton is not exist or no permission.';
                callback(null, {'err': 1, 'errors': msg});
              }
            } else {
              mysqlcon.getConnection((err, connection) => {
                if(err) callback(null, {'err': 1, 'errors': 'Error occurred while getting the connection'});
                return connection.beginTransaction(err => {
                  if (err) {
                    connection.release();
                    return callback(null, {'err': 1, 'errors': 'Error occurred while creating the transaction'});
                  }
                  return connection.query("INSERT INTO site_groups (name, comment, db, db_partition, created_at, updated_at) VALUES (?, ?, '', '', NOW(), NOW())",
                    [name, comment], function(err, result) {
                    if(err) {
                      return connection.rollback(() => {
                        connection.release();
                        return callback(null, {'err': 1, 'errors': 'Inserting to site_groups table failed'});
                      });
                    }
                    if(admin) {
                      return connection.query("INSERT INTO site_group_memberships (person_id, group_id, is_admin, created_at, updated_at) VALUES (?, ?, 1, NOW(), NOW())",
                            [admin, result.insertId], function(err, result) {
                            if(err) {
                              return connection.rollback(() => {
                                connection.release();
                                console.log(err)
                                return callback(null, {'err': 1, 'errors': 'Inserting to site_group_memberships table failed'});
                              });
                            }
                            return connection.commit((err) => {
                              if (err) {
                                return connection.rollback(() => {
                                  connection.release();
                                  return callback(null, {'err': 1, 'errors': 'Commit failed'});
                                });
                              }
                              connection.release();
                              let msg = 'New group: ' + name + 'is added with admin user Id: ' + admin;
                              return callback(null, {'err': 0,'msg': msg});
                            });
                        });
                    } else {
                      return connection.commit((err) => {
                        if (err) {
                          return connection.rollback(() => {
                                connection.release();
                                return callback(null, {'err': 1, 'errors': 'Commit failed'});
                            });
                        }
                        let msg = 'New group: ' + name + 'is added without admin user.';
                        connection.release();
                        return callback(null, {'err': 0,'msg': msg});
                      });
                    }
                  });
                });
              });
            }
          }
        }], function(err, result) {
            return res.json(result);
        })
  }
});

groupsRouter.post('/group/refresh', isAdmin, async (req, res, next) => {
  logger.info({
    level: 'info',
    message: req.session.FirstName + ' ' + req.session.LastName
    + '(' + req.session.user_id[0] + ') PUT `/api/v1/group_edit`'
  });

  req.checkBody('group_id','group id cannot be empty').notEmpty();
  req.checkBody('group_id','group id should be an integer<int(11)>').isInt();
  
  let group_id = req.body.group_id;
  let previousUpdateTimeSQL = `SELECT * FROM site_groups WHERE id =${group_id};`
  let previousUpdateTime = await getResults(previousUpdateTimeSQL);
  let last_update_time = previousUpdateTime[0]['updated_at'].toISOString().slice(0, 19).replace('T', ' ');
  let cleaned_newFiles = refreshDB(`archive_${previousUpdateTime[0]['name']}`, previousUpdateTime[0]['db_partition'], group_id, last_update_time);
  let newUpdateTimeSQL = `UPDATE site_groups SET updated_at=NOW() WHERE id =${group_id};`
  let newUpdateTime = await getResults(newUpdateTimeSQL);

  return res.json({'err': 0, 'msg': 'Archive record updated.'});
});
groupsRouter.put('/group_edit', isAdmin, async (req, res, next) => {
  /*
      edit group information
  */
  
  logger.info({
      level: 'info',
      message: req.session.FirstName + ' ' + req.session.LastName
      + '(' + req.session.user_id[0] + ') PUT `/api/v1/group_edit`'
  });

  req.checkBody('group_id','group id cannot be empty').notEmpty();
  req.checkBody('group_id','group id should be an integer<int(11)>').isInt();
  req.checkBody('name','Name cannot be empty').notEmpty();
  req.checkBody('name','Name should be a string<varchar(127)>').isString();

  var errors = req.validationErrors();
  if (errors) {
    return res.json({'err': 1, errors});
  } else {
      let group_id = req.body.group_id;
      let name = req.body.name;
      let comment = req.body.comment || '';
      let partition = req.body.partition || '';

      if (partition !== '') {
        try {
          fs.accessSync(partition, fs.constants.R_OK);
          // TO DO avoid to create table for the same partition
         
          let sql = `SELECT * FROM site_groups WHERE db_partition = '${partition}';`;
          let result = await getResults(sql);

          if (result.length) {
            let msg = 'Partiton is existed.';
            return res.json({'err': 1, 'errors': msg});
          }
          mysqlcon.getConnection((err, connection) => {
            if(err) throw err;
            var query = connection.query("UPDATE site_groups SET name=?, db_partition=?, comment=?, updated_at=NOW() WHERE id=?", [name, partition, comment, group_id]);

            query.on('end', () => {
                logger.info({
                    level: 'info',
                    message: req.session.FirstName + ' ' + req.session.LastName
                    + '(' + req.session.user_id[0] + ') successfully UPDATE site_groups SET name="' + name
                    + '" WHERE id=' + group_id
                });
                let DB_TABLE_NAME = `archive_${name}`;
                var sql = `CREATE TABLE ${DB_TABLE_NAME} (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), type VARCHAR(255), 
                parent_id INT, parent_type VARCHAR(255), path VARCHAR(255))`;
                connection.query(sql, function (err, re) {
                  connection.release();
                  if (err) throw err;
                  syncArchiveWatcher(partition, DB_TABLE_NAME, group_id)
                });
                return res.json({'err': 0, msg: 'Group: ' + name + '\'s information has been updated'});
            });
          });
        } catch (err) {
          let msg = 'Partiton is not exist or no permission.';
          return res.json({'err': 1, 'errors': msg});
        }
      } else {
        mysqlcon.getConnection((err, connection) => {
          if(err) throw err;
          var query = connection.query("UPDATE site_groups SET name=?, comment=?, updated_at=NOW() WHERE id=?", [name, comment, group_id]);
          query.on('result', (row) => {
              results.push(row);
          });
          query.on('end', () => {
              connection.release();
              logger.info({
                  level: 'info',
                  message: req.session.FirstName + ' ' + req.session.LastName
                  + '(' + req.session.user_id[0] + ') successfully UPDATE site_groups SET name="' + name
                  + '" WHERE id=' + group_id
              });
              return res.json({'err': 0, msg: 'Group: ' + name + '\'s information has been updated'});
          });
        }); 
      }
  }
});

module.exports = groupsRouter;
