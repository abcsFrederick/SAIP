var path = require('path');
var express = require('express');
var config = require('config');
var fs = require('fs-extra');
var async = require('async');

const mysqlConfig = config.get('dbConfig.mysql');
const doc_root = config.get('filesystemConfig.doc_root');
var logger = require('../loggerConfig');

const { isSysAdmin, isAdmin, isAuth, mysqlcon } = require('../utils.js');

var groupsRouter = express.Router();


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

groupsRouter.post('/group', isSysAdmin, (req, res, next) => {
    

  req.checkBody('name','Group name cannot be empty').notEmpty();
  req.checkBody('name','Group name should be a string<varchar(127)>').isString();

  var errors = req.validationErrors();

  if (errors) {
    return res.json({'err': 1, errors});
  } else {
      let name = req.body.name;
      let admin = req.body.admin;
      let comment = req.body.comment || '';

      let exist_group;
      async.waterfall([
        function(callback) {
          mysqlcon.getConnection((err,connection)=>{
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
            mysqlcon.getConnection((err, connection) => {
              if(err) throw err;
              var query = connection.query("INSERT INTO site_groups (name, comment, created_at, updated_at) VALUES (?, ?, NOW(), NOW())",
                  [name, comment], function(err, result) {
                  if(err) {
                      throw err; 
                  }
                  if(admin) {
                    mysqlcon.getConnection((err ,connection) => {
                      if(err) throw err;
                      var query = connection.query("INSERT INTO site_group_memberships (person_id, group_id, is_admin, created_at, updated_at) VALUES (?, ?, 1, NOW(), NOW())",
                          [admin, result.insertId], function(err, result) {
                          if(err) {
                              throw err; 
                          }
                          connection.release();
                          let msg = 'New group: ' + name + 'is added with admin user Id: ' + admin;
                          callback(null, {'err': 0,'msg': msg});
                      });
                    });
                  } else {
                    connection.release();
                    let msg = 'New group: ' + name + 'is added without admin user.';
                    callback(null, {'err': 0,'msg': msg});
                  }
              });
            });
          }
        }], function(err, result) {
            return res.json(result);
        })
  }
});

groupsRouter.put('/group_edit', isAdmin, (req, res, next) => {
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
      let status = req.body.status;

      let results = [];
      // console.log("UPDATE site_users SET last_name='"+last_name+"', first_name='"+first_name+"', position='"+position+"', is_pi="+is_pi+", email='"+email+"', phone_office='"+phone_office+"', userID='"+userID+"', status='"+status+"' WHERE id="+user_id+";");
      //console.log(typeof(project_status));
      //console.log(typeof(project_id));
      mysqlcon.getConnection((err, connection) => {
          if(err) throw err;
          var query = connection.query("UPDATE site_groups SET name=?, updated_at=NOW() WHERE id=?", [name, group_id]);
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
});

module.exports = groupsRouter;
