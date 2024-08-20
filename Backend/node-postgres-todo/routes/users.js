var path = require('path');
var express = require('express');
var config = require('config');
var fs = require('fs-extra');
var async = require('async');

const mysqlConfig = config.get('dbConfig.mysql');
const doc_root = config.get('filesystemConfig.doc_root');
var logger = require('../loggerConfig');

const { isAdmin, isAuth, mysqlcon } = require('../utils.js');

var usersRouter = express.Router();

var validationPermission = function (session_admin_groups, users) {
    let available_group_ids = session_admin_groups.map(x => x.id);
    for (let a = 0; a < users.length; a++) {
        if (!available_group_ids.includes(parseInt(users[a]))) {
           console.log('hello')
            return false;
        }
    }
    return true;
};
usersRouter.get('/users_overview', isAdmin, (req, res, next) => {   //is admin
  /*
      Query users
  */
  logger.info({
      level: 'info',
      message: req.session.FirstName + ' ' + req.session.LastName
      + '(' + req.session.user_id[0] + ') GET `/api/v1/users_overview`'
  });
  var results = [];
  mysqlcon.getConnection((err,connection)=>{
      if(err) throw err;
      //FOR mariadb10.2.8
      let sql;
      console.log(req.query.groups)
      if (req.query.permission > 1) {
        sql = `SELECT t3.id,t3.last_name,t3.first_name, t3.position, t3.email, t3.phone_office, t3.status, t3.active, t3.is_pi, t3.userID, 
        GROUP_CONCAT(t3.admin_groups) AS admin_groups, GROUP_CONCAT(t3.name) AS user_groups FROM 
(SELECT t2.*, site_groups.name, IF(t2.admin_of_groups IS NULL, NULL, site_groups.name) AS admin_groups FROM 
(SELECT t1.*, site_group_memberships.group_id, IF(site_group_memberships.is_admin=1, site_group_memberships.group_id, NULL) AS admin_of_groups FROM
(SELECT * FROM site_users) AS t1 
LEFT JOIN site_group_memberships ON t1.id=site_group_memberships.person_id) AS t2 
LEFT JOIN site_groups ON t2.group_id=site_groups.id) AS t3 GROUP BY t3.id;
`
      } else {
        sql = `SELECT t3.id,t3.last_name,t3.first_name, t3.position, t3.email, t3.phone_office, t3.status, t3.active, t3.is_pi, t3.userID, GROUP_CONCAT(t3.admin_groups) AS admin_groups, GROUP_CONCAT(t3.name) AS user_groups FROM 
(SELECT t2.*, site_groups.name, IF(t2.admin_of_groups IS NULL, NULL, site_groups.name) AS admin_groups FROM 
(SELECT t1.*, site_group_memberships.group_id, IF(site_group_memberships.is_admin=1, site_group_memberships.group_id, NULL) AS admin_of_groups FROM
(SELECT * FROM site_users) AS t1 
LEFT JOIN site_group_memberships ON t1.id=site_group_memberships.person_id WHERE group_id in (` + req.query.groups[0].id + `)) AS t2 
LEFT JOIN site_groups ON t2.group_id=site_groups.id) AS t3 GROUP BY t3.id;
`
      }
      var query = connection.query(sql);
      //FOR MySQL
      //var query = connection.query("SELECT t3.id,t3.last_name,t3.first_name, t3.active, t3.is_pi, JSON_ARRAYAGG(t3.name) AS Groups FROM (SELECT t2.*, site_groups.name FROM (SELECT t1.*, site_group_memberships.group_id FROM (SELECT id, last_name, first_name, active,is_pi FROM site_users) AS t1 LEFT JOIN site_group_memberships ON t1.id=site_group_memberships.person_id) AS t2 LEFT JOIN site_groups ON t2.group_id=site_groups.id) AS t3 GROUP BY t3.id;");
      query.on('result',(row)=>{
              results.push(row);
      });
      query.on('end',()=>{
              connection.release();
              return res.json(results);
      });
  });
});

usersRouter.post('/usersChangePermission', isAdmin, (req, res, next) => {   //is admin

  logger.info({
      level: 'info',
      message: req.session.FirstName + ' ' + req.session.LastName
      + '(' + req.session.user_id[0] + ') POST `/api/v1/usersChangePermission`'
  });

  req.checkBody('user_id','user id cannot be empty').notEmpty();
  req.checkBody('user_id','user id should be an integer<int(11)>').isInt();
  req.checkBody('group_id','user status cannot be empty').notEmpty();
  req.checkBody('group_id','user id should be an integer<int(11)>').isInt();
  req.checkBody('is_admin','user status cannot be empty').notEmpty();
  req.checkBody('is_admin','user id should be an 0 or 1>').isBoolean();
  var errors = req.validationErrors();
  if (errors) {
      console.log(errors);
  } else {
      let results = [];
      let person_id = parseInt(req.body.user_id);
      let group_id = parseInt(req.body.group_id);
      let is_admin = parseInt(req.body.is_admin);
      mysqlcon.getConnection((err, connection) => {
          if(err) throw err;
          //FOR mariadb10.2.8
          //var query = connection.query("SELECT t3.id,t3.last_name,t3.first_name, t3.active, t3.is_pi, GROUP_CONCAT(t3.name) AS Groups FROM (SELECT t2.*, site_groups.name FROM (SELECT t1.*, site_group_memberships.group_id FROM (SELECT id, last_name, first_name, active,is_pi FROM site_users) AS t1 LEFT JOIN site_group_memberships ON t1.id=site_group_memberships.person_id) AS t2 LEFT JOIN site_groups ON t2.group_id=site_groups.id) AS t3 GROUP BY t3.id;");
          //FOR MySQL
          var sql = `UPDATE site_group_memberships SET is_admin=${is_admin} WHERE person_id=${person_id} AND group_id=${group_id};`
          var query = connection.query(sql);
          query.on('result',(row)=>{
            console.log(row)
                  results.push(row);
          });
          query.on('end',()=>{
              connection.release();
              logger.info({
                  level: 'info',
                  message: req.session.FirstName + ' ' + req.session.LastName
                  + '(' + req.session.user_id[0] + ') successfully UPDATE site_group_memberships SET is_admin = '+is_admin+' WHERE (person_id ='+person_id+'AND group_id='+group_id+')'
              });
              // console.log("UPDATE site_group_memberships SET group_id = "+group_id+" WHERE person_id ="+person_id+";");
              return res.json(results);
          });
      });
  }
});

usersRouter.post('/user_status', isAdmin, (req, res, next) => {
  /*
      remove project from particular users
  */
  
  logger.info({
      level: 'info',
      message: req.session.FirstName + ' ' + req.session.LastName
      + '(' + req.session.user_id[0] + ') POST `/api/v1/user_status`'
  });

  req.checkBody('user_id','user id cannot be empty').notEmpty();
  req.checkBody('user_id','user id should be an integer<int(11)>').isInt();
  req.checkBody('user_status','user status cannot be empty').notEmpty();
  req.checkBody('user_status','user status should be a string<varchar(255)>').isString();
  var errors = req.validationErrors();
  if(errors){
      console.log(errors);
  }
  else{
      let user_id = parseInt(req.body.user_id);
      let user_status = parseInt(req.body.user_status);
      let results=[];
      // console.log("UPDATE site_users SET active="+user_status+" WHERE id="+user_id+";");
      //console.log(typeof(project_status));
      //console.log(typeof(project_id));
      mysqlcon.getConnection((err,connection)=>{
          if(err) throw err;
          var query = connection.query("UPDATE site_users SET active=? WHERE id=?",[user_status,user_id]);
          query.on('result',(row)=>{
                  results.push(row);
          });
          query.on('end',()=>{
              logger.info({
                  level: 'info',
                  message: req.session.FirstName + ' ' + req.session.LastName
                  + '(' + req.session.user_id[0] + ') successfully UPDATE site_users SET active='+user_status+' WHERE id='+user_id
              });
              connection.release();
              return res.json(user_status);
          });
      }); 
      
      
  }
});

usersRouter.put('/user_edit', isAdmin, (req, res, next) => {
  /*
      remove project from particular users
  */
  
  logger.info({
      level: 'info',
      message: req.session.FirstName + ' ' + req.session.LastName
      + '(' + req.session.user_id[0] + ') PUT `/api/v1/user_edit`'
  });

  req.checkBody('user_id','user id cannot be empty').notEmpty();
  req.checkBody('user_id','user id should be an integer<int(11)>').isInt();

  req.checkBody('userID','User id cannot be empty').notEmpty();
  req.checkBody('userID','User id should be a string<varchar(127)>').isString();
  req.checkBody('first_name','First name cannot be empty').notEmpty();
  req.checkBody('first_name','First name should be a string<varchar(127)>').isString();
  req.checkBody('last_name','Last name cannot be empty').notEmpty();
  req.checkBody('last_name','Last name should be a string<varchar(127)>').isString();
  req.checkBody('status','Status cannot be empty').notEmpty();
  req.checkBody('status','Status should be a string<varchar(127)>').isString();
  

  var errors = req.validationErrors();
  if (errors) {
      return res.json({'err': 1, errors});
  } else {
      let user_id = req.body.user_id;
      let userID = req.body.userID;
      let first_name = req.body.first_name;
      let last_name = req.body.last_name;
      let is_pi = req.body.is_pi||null;
      let position = req.body.position||null;
      let status = req.body.status;
      let phone_office = req.body.phone_office||null;
      let email = req.body.email||null;
      let user_results = [];

      let results = [];
      // console.log("UPDATE site_users SET last_name='"+last_name+"', first_name='"+first_name+"', position='"+position+"', is_pi="+is_pi+", email='"+email+"', phone_office='"+phone_office+"', userID='"+userID+"', status='"+status+"' WHERE id="+user_id+";");
      //console.log(typeof(project_status));
      //console.log(typeof(project_id));
      mysqlcon.getConnection((err,connection)=>{
          if(err) throw err;
          var query = connection.query("UPDATE site_users SET last_name=?, first_name=?, position=?, is_pi=?, email=?, phone_office=?, userID=?, status=?, updated_at=NOW() WHERE id=?",[last_name, first_name, position, is_pi, email, phone_office, userID, status, user_id]);
          query.on('result',(row)=>{
              results.push(row);
          });
          query.on('end',()=>{
              connection.release();
              logger.info({
                  level: 'info',
                  message: req.session.FirstName + ' ' + req.session.LastName
                  + '(' + req.session.user_id[0] + ') successfully UPDATE site_users SET last_name="'+last_name
                  +'", first_name="'+first_name+'", position="'+position
                  +'", is_pi='+is_pi+', email="'+email+'", phone_office="'+phone_office
                  +'", userID="'+userID+'", status="'+status+'" WHERE id='+user_id
              });
              // console.log(results);
              return res.json({'err':0,msg:last_name+ ',' +first_name+'\'s information has been updated'});
          });
      }); 
      
      
  }
});

usersRouter.post('/whitelist', isAdmin, (req, res, next) => {
    req.checkBody('userID','User id cannot be empty').notEmpty();
    req.checkBody('userID','User id should be a string<varchar(127)>').isString();
    req.checkBody('first_name','First name cannot be empty').notEmpty();
    req.checkBody('first_name','First name should be a string<varchar(127)>').isString();
    req.checkBody('last_name','Last name cannot be empty').notEmpty();
    req.checkBody('last_name','Last name should be a string<varchar(127)>').isString();
    req.checkBody('status','Status cannot be empty').notEmpty();
    req.checkBody('status','Status should be a string<varchar(127)>').isString();

    var errors = req.validationErrors();

    if (errors) {
        return res.json({'err': 1, errors});
    } else {
        let userID = req.body.userID;
        let first_name = req.body.first_name;
        let last_name = req.body.last_name;
        let is_pi = req.body.is_pi||null;
        let position = req.body.position||null;
        let status = req.body.status;
        let phone_office = req.body.phone_office||null;
        let email = req.body.email||null;
        let user_results = [];
        
        let adminlist = [];
        let userlist = [];
        let validate_errors = `Invalid action, user ${req.session.FirstName} ${req.session.LastName} is trying to add new user to the group that he does not have permission. Action is reported to the system admin.`;

        if (req.body.adminlist !== '') {
            adminlist = req.body.adminlist.split(',');
        }
        if (req.body.userlist !== '') {
            userlist = req.body.userlist.split(',');
        }
        if (req.session.permission < 2) {
            if (req.body.adminlist !== '') {
                if (!validationPermission(req.session.admin_groups, adminlist)) {
                    return res.json({'err': 1, validate_errors});
                }
            }
            if (req.body.userlist !== '') {
                if (!validationPermission(req.session.admin_groups, userlist)) {
                    return res.json({'err': 1, validate_errors});
                }
            }
        }
        userlist = userlist.filter(x => !adminlist.includes(x));

        async.waterfall([
            function(callback) {
                 mysqlcon.getConnection((err, connection) => {
                    var query = connection.query("SELECT id, last_name, first_name, position, is_pi, status, email, phone_office, userID, created_at, updated_at FROM site_users WHERE userID = '"+userID+"';");
                    query.on('result', (row) => {
                        user_results.push(row);
                    });
                    query.on('end', () => {
                        connection.release();
                        callback(null, user_results)
                    });
                 });
            }, function(arg, callback) {
                if (!arg.length) {
                    mysqlcon.getConnection((err, connection) => {
                        if(err) throw err;
                        var query = connection.query(`INSERT INTO site_users (last_name, first_name, position, is_pi, status, email, phone_office, userID, created_at, updated_at) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                            [last_name, first_name, position, is_pi, status, email, phone_office, userID], function(err, result) {
                            if (err) {
                               throw err; 
                            }
                            console.log(`successfully insert ${result.insertId} row in site_users table`);
                            console.log('INSERT INTO site_users (last_name,first_name,position,is_pi,status,email,phone_office,userID,created_at,updated_at)');
                            console.log('VALUES ('+last_name+', '+first_name+', '+position+', '+is_pi+', '+status+', '+email+', '+phone_office+', '+userID+', NOW(), NOW());');

                            if (adminlist.length) {
                                var sql = `INSERT INTO site_group_memberships (person_id, group_id, is_admin, created_at, updated_at) VALUES ?`;
                                var values =  adminlist.map(x => [result.insertId, parseInt(x), 1, new Date(), new Date()]);
                                var query = connection.query(sql, [values], function(err) {
                                    if (err) throw err;
                                });
                            } 
                            if (userlist.length) {
                                var sql = `INSERT INTO site_group_memberships (person_id, group_id, is_admin, created_at, updated_at) VALUES ?`;
                                var values =  userlist.map(x => [result.insertId, parseInt(x), 0, new Date(), new Date()]);
                                var query = connection.query(sql, [values], function(err) {
                                    if (err) throw err;
                                });
                            }
                            // In case the group admin did not select the groups
                            if (!userlist.length && !adminlist.length) {
                                if (req.session.permission !== 2) {

                                    var sql = `INSERT INTO site_group_memberships (person_id, group_id, is_admin, created_at, updated_at) VALUES ?`;
                                    var values = [[result.insertId, parseInt(req.session.admin_groups[0].id), 0, new Date(), new Date()]];
                                    var query = connection.query(sql, [values], function(err) {
                                        if (err) throw err;
                                    });
                                }
                                userlist = [req.session.admin_groups[0].id];
                            }
                            connection.release();
                            
                            let msg = `${last_name} ${first_name} has been added in the whitelist with user permission of admin(s): ${adminlist} and group(s): ${userlist}`;
                            callback(null, {'err': 0, 'msg': msg});
                        });
                    });
                } else {
                    mysqlcon.getConnection((err, connection) => {
                        if(err) throw err;
                        let exist_user_id = arg[0].id;
                        if (adminlist.length) {
                            var sql = `INSERT INTO site_group_memberships (person_id, group_id, is_admin, created_at, updated_at) VALUES ?`;
                            var values =  adminlist.map(x => [exist_user_id, parseInt(x), 1, new Date(), new Date()]);
                            var query = connection.query(sql, [values], function(err) {
                                if (err) throw err;
                            });
                        }
                        if (userlist.length) {
                            var sql = `INSERT INTO site_group_memberships (person_id, group_id, is_admin, created_at, updated_at) VALUES ?`;
                            var values =  userlist.map(x => [exist_user_id, parseInt(x), 0, new Date(), new Date()]);
                            var query = connection.query(sql, [values], function(err) {
                                if (err) throw err;
                            });
                        }
                        // In case the group admin did not select the groups
                        if (!userlist.length && !adminlist.length) {
                            if (req.session.permission !== 2) {
                                var sql = `INSERT INTO site_group_memberships (person_id, group_id, is_admin, created_at, updated_at) VALUES ?`;
                                var values = [[exist_user_id, parseInt(req.session.admin_groups[0].id), 0, new Date(), new Date()]];
                                var query = connection.query(sql, [values], function(err) {
                                    if (err) throw err;
                                });
                            }
                            userlist = [req.session.admin_groups[0].id];
                        }
                        connection.release();
                        
                        let msg = `${last_name} ${first_name} has been assigned with user permission of admin(s): ${adminlist} and group(s): ${userlist}`;
                        callback(null, {'err': 0, 'msg': msg});
                    });
                }
                
            }
            ],function(err,result){
                return res.json(result)
            })
        
    }
});
module.exports = usersRouter;
