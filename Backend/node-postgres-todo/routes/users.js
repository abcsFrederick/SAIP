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


usersRouter.get('/users_overview', isAdmin, (req, res, next) => {   //is admin
  /*
      Query users
  */
  logger.info({
      level: 'info',
      message: req.session.FirstName + ' ' + req.session.LastName
      + '(' + req.session.user_id[0] + ') GET `/api/v1/users_overview`'
  });
  var results=[];
  mysqlcon.getConnection((err,connection)=>{
      if(err) throw err;
      //FOR mariadb10.2.8
      var query = connection.query("SELECT t3.id,t3.last_name,t3.first_name,t3.position, t3.status, t3. email, t3.phone_office, t3.userID, t3.active, t3.is_pi, GROUP_CONCAT(t3.name) AS Groups FROM (SELECT t2.*, site_groups.name FROM (SELECT t1.*, site_group_memberships.group_id FROM (SELECT id, last_name, first_name, active, position, is_pi, status, email, phone_office, userID FROM site_users) AS t1 LEFT JOIN site_group_memberships ON t1.id=site_group_memberships.person_id) AS t2 LEFT JOIN site_groups ON t2.group_id=site_groups.id) AS t3 GROUP BY t3.id;");
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
  var errors = req.validationErrors();
  if(errors){
      console.log(errors);
  }
  else{
      let results=[];
      let person_id = parseInt(req.body.user_id);
      let group_id = parseInt(req.body.group_id);

      mysqlcon.getConnection((err,connection)=>{
          if(err) throw err;
          //FOR mariadb10.2.8
          //var query = connection.query("SELECT t3.id,t3.last_name,t3.first_name, t3.active, t3.is_pi, GROUP_CONCAT(t3.name) AS Groups FROM (SELECT t2.*, site_groups.name FROM (SELECT t1.*, site_group_memberships.group_id FROM (SELECT id, last_name, first_name, active,is_pi FROM site_users) AS t1 LEFT JOIN site_group_memberships ON t1.id=site_group_memberships.person_id) AS t2 LEFT JOIN site_groups ON t2.group_id=site_groups.id) AS t3 GROUP BY t3.id;");
          //FOR MySQL
          var query = connection.query("UPDATE site_group_memberships SET group_id=? WHERE person_id=?",[group_id,person_id]);
          query.on('result',(row)=>{
                  results.push(row);
          });
          query.on('end',()=>{
              connection.release();
              logger.info({
                  level: 'info',
                  message: req.session.FirstName + ' ' + req.session.LastName
                  + '(' + req.session.user_id[0] + ') successfully UPDATE site_group_memberships SET group_id = '+group_id+' WHERE person_id ='+person_id
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
  if(errors){
      return res.json({'err':1, errors});
  }
  else{
      let user_id = req.body.user_id;
      let userID = req.body.userID;
      let first_name = req.body.first_name;
      let last_name = req.body.last_name;
      let is_pi = req.body.is_pi||null;
      let position = req.body.position||null;
      let status = req.body.status;
      let phone_office = req.body.phone_office||null;
      let email = req.body.email||null;
      let user_results=[];

      let results=[];
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

module.exports = usersRouter;
