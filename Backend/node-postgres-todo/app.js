var URL = require('url').URL;
var logger = require('./loggerConfig');
var express = require('express');
var path = require('path');
// var favicon = require('serve-favicon');
// var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var FileStore = require("session-file-store")(session);
var routes = require('./routes/index');
var projectsRoutes = require('./routes/projects');
var experimentsRoutes = require('./routes/experiments');
var request = require('request');

var compression = require('compression');  
var fs = require('fs-extra');
var rimraf = require('rimraf');
const mysql = require('mysql');
var cors = require('cors');

// var expressWs = require('express-ws')(express());
var app = express();
// var app = expressWs.app;
// var expressWs = require('express-ws')(app);

var config = require('config');
var identityKey = 'skey';

const version = config.get('version');
const doc_root = config.get('filesystemConfig.doc_root');
const archive_root = config.get('filesystemConfig.doc_root');
const intermediate_storage = config.get('filesystemConfig.intermediate_storage');

const mysqlConfig = config.get('dbConfig.mysql');
const postgresConfig = config.get('dbConfig.postgres');
const ADURL = config.get('adConfig.url');
const ADServiceAccount = config.get('adConfig.account');
const ADServicePassword = config.get('adConfig.password');

const CLIENT_ID = config.get('Cilogon.id');
const CLIENT_SECRET = config.get('Cilogon.secret');
const CLIENT_REDIRECT_URL = config.get('Cilogon.redirect_uri');

var testUsers = [{name:'test',password:'test123456789'}];
var mysqlcon = mysql.createPool(mysqlConfig);

const AUTHENTICATED = 1;
const APPROVAL = 1;
const INACTIVED = 2;
const REQUESTSENT = 3;
const REQUESTPENDING = 6;

const REQUESTDENIED = 4;
const DENIED = 0;
const AUTHFAILED = 0;
// console.log(mysqlcon)
/*
//FOR mariadb 10.2.8
var mysqlcon = mysql.createPool({
    host: "localhost",
    port:3306,
    user: "root",
    password: "yuAwf-6TwasEgar",
    database:"nci",
  //  socketPath: '/var/run/mysqld/mysqld.sock'
  });
*/ 

app.use(compression());  
app.use(session({
  name:identityKey,
  secret:'tymiao',
  store:new FileStore,
  saveUninitialized:false,
  resave:false,
  cookie:{
    maxAge:2*60*60*1000,
    httpOnly: true,       //dev false
   // secure: true
  }
}));
// view engine setup
var findUser = function(name,password){
  return testUsers.find(function(item){
    return item.name===name && item.password===password;
  });
};

function isAuth(){
  // console.log(authResults);
  var auth = authResults['status'];
  var userFirstName = authResults['userInfo']['FirstName'];
  var userLastName = authResults['userInfo']['LastName'];
};

var eventTracking=function(type,user){
    if(type=='Login')
    {
        let event = 'Login';
        let eventType = 'Site::UserLoginEvent';
        mysqlcon.getConnection((err,connection)=>{
            if(err) throw err;
            var query = connection.query("INSERT INTO site_statistics ( event,type,user_id,owner_id,timestamp,created_at,updated_at) \
                VALUES (?,?,?,null,NOW(),NOW(),NOW())",
                [event,eventType,user],
                function(err,result){
                    if(err) throw err;

                    logger.info({
                      level: 'info',
                      message: user + ' Login'
                    });
                    // console.log('successfully insert '+result.insertId+' row in `site_statistics` table');
                    // console.log('INSERT INTO site_statistics ( event,type,user_id,owner_id,timestamp,created_at,updated_at)');
                    // console.log('VALUES ('+event+', '+eventType+', '+user+', '+'null'+', '+'NOW()'+', '+'NOW()'+', '+'NOW());');
                    connection.release();
                });
        });
    }
}
function NIH_Authenticate(SERVICE_ACCOUNT_USERNAME,SERVICE_ACCOUNT_PASSWORD,CALLBACK) {
  return NIH_Authenticate[SERVICE_ACCOUNT_USERNAME,SERVICE_ACCOUNT_PASSWORD,CALLBACK] ||
  (NIH_Authenticate[SERVICE_ACCOUNT_USERNAME,SERVICE_ACCOUNT_PASSWORD,CALLBACK] = function(req, res_1, next) {
    if (req.session.status !== 'Authenticated') {
      // console.log('create session');
      var refererURL = new URL(req.headers.referer);
      var code = refererURL.searchParams.get('code');

      // get token
      var data = {'grant_type': 'authorization_code',
            'code': code,
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET,
            'redirect_uri': CLIENT_REDIRECT_URL
          }
      var authResults = {
          "status" : ""
          ,"error" : null
          ,"userInfo" : {}
      }
      // CILogon:
      request.post({url: 'https://cilogon.org/oauth2/token', form: data}, function(error, response, body) {
        if (error) {
          authResults.status = "Authentication failed";
          authResults.error = error;
          res_1.json({code:0, status:authResults.status});
          next();
        }
        if (response.statusCode == "200") {
          var id_token = JSON.parse(body).id_token
          var access_token = JSON.parse(body).access_token
          var data = {'access_token': access_token}
          request.post({url: 'https://cilogon.org/oauth2/userinfo', form: data}, function(error, response, body) {
            if (error) {
              authResults.status = "Authentication failed";
              authResults.error = error;
              res_1.json({code:0, status:authResults.status});
              next();
            } else {
              // Validate NIH provider later
              var userInfo = {
                "Provider": JSON.parse(body).idp,
                "FirstName": JSON.parse(body).given_name,
                "LastName": JSON.parse(body).family_name,
                "Email": JSON.parse(body).email,
                "UserPrincipalName": JSON.parse(body).eppn
              }
              authResults.status = "Authenticated";
              authResults.userInfo = userInfo;
              // var auth = 200;
              var userFirstName = authResults['userInfo']['FirstName'];
              var userLastName = authResults['userInfo']['LastName'];
              var Email = authResults['userInfo']['Email'];
              var UserPrincipalName = authResults['userInfo']['UserPrincipalName'];

              req.session.regenerate(function(err) {
                if (err) {
                  return res_1.json({msg:err})
                }

                var result_group_id = [];
                var result_user_id = [];
                var active;
                // console.log(mysqlConfig)
                mysqlcon.getConnection((err, connection) => {
                  if(err) throw err;
                  // var query = connection.query('SELECT t1.*,site_group_memberships.group_id AS group_id FROM (SELECT id,last_name,first_name,active FROM site_users WHERE last_name="' + userLastName + '" AND first_name="' + userFirstName + '") as t1 LEFT JOIN site_group_memberships ON site_group_memberships.person_id=t1.id;');
                  
                  var query = connection.query('SELECT t1.*,site_group_memberships.group_id AS group_id FROM (SELECT id,last_name,first_name,active FROM site_users WHERE userID IN ("'+UserPrincipalName.substr(0,UserPrincipalName.indexOf('@'))+'", "'+Email.substr(0,Email.indexOf('@'))+'")) as t1 LEFT JOIN site_group_memberships ON site_group_memberships.person_id=t1.id;');
                  
                  // console.log('SELECT t1.*,site_group_memberships.group_id AS group_id FROM (SELECT id,last_name,first_name,active FROM site_users WHERE userID IN ("'+UserPrincipalName.substr(0,UserPrincipalName.indexOf('@'))+'", "'+Email.substr(0,Email.indexOf('@'))+'")) as t1 LEFT JOIN site_group_memberships ON site_group_memberships.person_id=t1.id;')
                  query.on('result',(row) => {
                        result_group_id.push(row['group_id']);
                        result_user_id.push(row['id']);
                        active = row['active'];
                  });
                  query.on('end',() => {
                        // console.log(active)
                        connection.release();
                        if (result_user_id.length && active) {
                          req.session.FirstName = userFirstName;
                          req.session.LastName = userLastName;
                          // req.session.NedID = NedID;
                          // req.session.Telephone = Telephone;
                          req.session.Email = Email;
                          req.session.UserPrincipalName = UserPrincipalName;
                          req.session.status = authResults.status;
                          req.session.group_id = result_group_id;
                          req.session.user_id = result_user_id;
                          res_1.json({appVersion:version, code:1, status:req.session.status, FirstName:req.session.FirstName,
                                LastName:req.session.LastName, Email:req.session.Email, UserPrincipalName:req.session.UserPrincipalName, 
                                Group_id:req.session.group_id, User_id:req.session.user_id});
                          if (req.session.user_id[0]) {
                             eventTracking('Login', req.session.user_id[0]);
                          }
                          // console.log('page refresh!!!!!!!!!');
                          var workSpace = intermediate_storage + req.session.Email;
                          if (fs.existsSync(workSpace)) {
                            rimraf(workSpace, function () { 
                              // console.log('rm -rf '+workSpace); 
                              fs.mkdir(workSpace, 0o755);
                            });
                          } else {
                            fs.mkdir(workSpace, 0o755);
                          }
                          next();
                        } else {
                          logger.error({
                            level: 'error',
                            message: userFirstName + ' ' + userLastName + ' with userID ' 
                            + UserPrincipalName.substr(0,UserPrincipalName.indexOf('@')) 
                            + ' or ' 
                            + Email.substr(0,Email.indexOf('@')) 
                            + ' is not on(or not active) the SAIP whitelist'
                          });
                          authResults.status = "Authentication failed";
                          res_1.json({code:0, status: authResults.status});
                          next();
                        }
                  });
                });
              });
            }
          })
        } else {
          authResults.status = "Authentication failed";
          res_1.json({code:0,status:authResults.status});
          next();
        }   
      });
/*
      var RETURNED_TOKEN_FROM_LOGIN = req.headers.referer.substr(req.headers.referer.indexOf('?token=')).substring(7);
      var username = SERVICE_ACCOUNT_USERNAME;
      var password = SERVICE_ACCOUNT_PASSWORD;
      var token = RETURNED_TOKEN_FROM_LOGIN;

      // AD URL 
      var url = ADURL;

      var ntlmclient = require('ntlm-client')
      var async = require('async');
      var httpreq = require('httpreq');
      var HttpsAgent = require('agentkeepalive').HttpsAgent;
      var keepaliveAgent = new HttpsAgent();
      var parseseXML = require('xml2js').parseString
      var options = {
          url: url,
          username: username,
          password: password,
          workstation: '',
          domain: 'NIH'
      };
      async.waterfall([
          function (callback){
              var type1msg = ntlmclient.createType1Message(options.workstation,options.url);
              httpreq.get(options.url, {
                  headers:{
                      'Connection' : 'keep-alive',
                      'Authorization': type1msg,
                      'Content-Type': 'text/xml;charset=UTF-8;'
                  },
                  agent: keepaliveAgent
              }, callback);
          },
          function (res, callback){
              if(!res.headers['www-authenticate']){
                return callback(new Error('www-authenticate not found on response of second request'));
              }
              var type2msg = ntlmclient.decodeType2Message(res.headers['www-authenticate']);
              // console.log(type2msg);
              // console.log('149')
              var type3msg = ntlmclient.createType3Message(type2msg,options.username,options.password);
              //    // console.log(token);
              var data = '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://www.w3.org/2005/08/addressing">' 
              + '<s:Header><a:Action s:mustUnderstand="1">http://tempuri.org/ITokenConsumer/ConsumeToken</a:Action><a:MessageID>' 
              + 'urn:uuid:urn:uuid:</a:MessageID><a:ReplyTo><a:Address>http://www.w3.org/2005/08/addressing/anonymous</a:Address></a:ReplyTo>' 
              + '<a:To s:mustUnderstand="1">https://services.ncifcrf.gov/FederatedAuthentication/v1.0/TokenConsumer.svc</a:To></s:Header>' 
              + '<s:Body><ConsumeToken xmlns="http://tempuri.org/"><token>' + token + '</token></ConsumeToken></s:Body></s:Envelope>';
              setImmediate(function() {
                  httpreq.post(options.url, {
                      body: data,
                      headers:{
                          'Content-Type': 'application/soap+xml;charset=UTF-8',
                        'Connection' : 'keep-alive',
                        'Authorization': type3msg,
                        'Accept-Encoding': 'gzip, deflate',
                        'Expect': '100-continue'
                      },
                      allowRedirects: false,
                      agent: keepaliveAgent
                  }, callback);
              });
          }
      ], function (err, res) {
        // console.log(res)
        authResults = {
          "status" : ""
          ,"error" : null
          ,"userInfo" : {}
        }
        if (err) {
          authResults.status = "Authentication failed"
          authResults.error = err
        }
        if (res.statusCode == "200") {
          parseseXML(res.body,function(err,result){
            // console.log(result['s:Envelope']['s:Body']['0']['ConsumeTokenResponse']['0']['ConsumeTokenResult']['0'])
            if (err) {
              authResults.status = "Authentication succeeded, but there was an error in processing"
              authResults.error = err
            } else {
            //  // console.log(result);
              if (result['s:Envelope']['s:Body']['0']['ConsumeTokenResponse']['0']['ConsumeTokenResult']['0']['b:Email'] == undefined) {
            //    // console.log(result['s:Envelope']['s:Body']['0']['ConsumeTokenResponse']['0']['ConsumeTokenResult']);
                authResults.status = "Authentication failed"
              } else {
            //    // console.log(result['s:Envelope']['s:Body']['0']);
                var userInfo = {
                "Email" : result['s:Envelope']['s:Body']['0']['ConsumeTokenResponse']['0']['ConsumeTokenResult']['0']['b:Email']['0']
                ,"FirstName" : result['s:Envelope']['s:Body']['0']['ConsumeTokenResponse']['0']['ConsumeTokenResult']['0']['b:FirstName']['0']
                ,"LastName" : result['s:Envelope']['s:Body']['0']['ConsumeTokenResponse']['0']['ConsumeTokenResult']['0']['b:LastName']['0']
                ,"NedID" : result['s:Envelope']['s:Body']['0']['ConsumeTokenResponse']['0']['ConsumeTokenResult']['0']['b:NedID']['0']
                ,"Telephone" : result['s:Envelope']['s:Body']['0']['ConsumeTokenResponse']['0']['ConsumeTokenResult']['0']['b:Telephone']['0']
                ,"UserPrincipalName" : result['s:Envelope']['s:Body']['0']['ConsumeTokenResponse']['0']['ConsumeTokenResult']['0']['b:UserPrincipalName']['0']
              }
              authResults.status = "Authenticated"
              authResults.userInfo = userInfo
              } 
            }
          });
          
          var auth = authResults['status'];
          var userFirstName = authResults['userInfo']['FirstName'];
          var userLastName = authResults['userInfo']['LastName'];
          var NedID = authResults['userInfo']['NedID'];
          var Telephone = authResults['userInfo']['Telephone'];
          var Email = authResults['userInfo']['Email'];
          var UserPrincipalName = authResults['userInfo']['UserPrincipalName'];

          if(auth =='Authenticated'){
            req.session.regenerate(function(err){
              if(err){
                return res_1.json({msg:err})
              }

              var result_group_id=[];
              var result_user_id=[];
              var active;
              // console.log(mysqlConfig)
              mysqlcon.getConnection((err,connection)=>{

                    if(err) throw err;
                    var query = connection.query('SELECT t1.*,site_group_memberships.group_id AS group_id FROM (SELECT id,last_name,first_name,active FROM site_users WHERE userID IN ("'+UserPrincipalName.substr(0,UserPrincipalName.indexOf('@'))+'", "'+Email.substr(0,Email.indexOf('@'))+'")) as t1 LEFT JOIN site_group_memberships ON site_group_memberships.person_id=t1.id;');
                    // console.log('SELECT t1.*,site_group_memberships.group_id AS group_id FROM (SELECT id,last_name,first_name,active FROM site_users WHERE userID IN ("'+UserPrincipalName.substr(0,UserPrincipalName.indexOf('@'))+'", "'+Email.substr(0,Email.indexOf('@'))+'")) as t1 LEFT JOIN site_group_memberships ON site_group_memberships.person_id=t1.id;')
                    query.on('result',(row)=>{
                          result_group_id.push(row['group_id']);
                          result_user_id.push(row['id']);
                          active = row['active'];
                    });
                    query.on('end',()=>{
                          // console.log(active)
                          connection.release();
                          if(result_user_id.length&&active){
                            req.session.FirstName = userFirstName;
                            req.session.LastName = userLastName;
                            req.session.NedID = NedID;
                            req.session.Telephone = Telephone;
                            req.session.Email = Email;
                            req.session.UserPrincipalName = UserPrincipalName;
                            req.session.status = auth;
                            req.session.group_id = result_group_id;
                            req.session.user_id = result_user_id;
                            res_1.json({appVersion:version,code:1,status:req.session.status,FirstName:req.session.FirstName,
                                  LastName:req.session.LastName,NedID:req.session.NedID,Telephone:req.session.Telephone,
                                  Email:req.session.Email,UserPrincipalName:req.session.UserPrincipalName,Group_id:req.session.group_id,User_id:req.session.user_id});
                            if(req.session.user_id[0]){
                               eventTracking('Login',req.session.user_id[0])
                            }
                            // console.log('page refresh!!!!!!!!!');
                            var workSpace = __dirname+'/routes/'+req.session.UserPrincipalName
                            if (fs.existsSync(workSpace)){
                              rimraf(workSpace, function () { 
                                // console.log('rm -rf '+workSpace); 
                                fs.mkdir(workSpace,0o755)
                              });
                            }
                            else{
                              fs.mkdir(workSpace,0o755)
                            }
                            next();
                          }else{
                            logger.error({
                              level: 'error',
                              message: userFirstName + ' ' + userLastName + ' with userID ' 
                              + UserPrincipalName.substr(0,UserPrincipalName.indexOf('@')) 
                              + ' or ' 
                              + Email.substr(0,Email.indexOf('@')) 
                              + ' is not on(or not active) the SAIP whitelist'
                            });
                            authResults.status = "Authentication failed";
                            res_1.json({code:0,status:authResults.status});
                            next();
                          }
                          
                    });
              });
            });
          }
          else {
            authResults.status = "Authentication failed";
            res_1.json({code:0,status:authResults.status});
            next();
          }
        } else {
          authResults.status = "Authentication failed";
          res_1.json({code:0,status:authResults.status});
          next();
        }
      });
      */
    } else {
      // console.log('has session');
      // console.log('page refresh!!!!!!!!!');
      var workSpace = intermediate_storage + req.session.Email;
      // console.log(workSpace)
      if (fs.existsSync(workSpace)) {
        // console.log('remove workSpace')
        // console.log(workSpace)
        rimraf(workSpace, function (err) { 
          // console.log('rm -rf '+workSpace); 
          fs.mkdir(workSpace, 0o755);
        });
      } else {
        fs.mkdir(workSpace, 0o755);
      }
      let result_group_id = [];
      let result_user_id = [];
      let active;
      mysqlcon.getConnection((err, connection) => {
        if(err) throw err;
        // console.log('SELECT t1.*,site_group_memberships.group_id AS group_id FROM (SELECT id,last_name,first_name,active FROM site_users WHERE userID = "'+req.session.UserPrincipalName.substr(0,req.session.UserPrincipalName.indexOf('@'))+'")as t1 LEFT JOIN site_group_memberships ON site_group_memberships.person_id=t1.id;')
        // var query = connection.query('SELECT t1.*,site_group_memberships.group_id AS group_id FROM (SELECT id,last_name,first_name,active FROM site_users WHERE last_name="' + req.session.LastName + '" AND first_name="' + req.session.FirstName + '") as t1 LEFT JOIN site_group_memberships ON site_group_memberships.person_id=t1.id;');
                  
        var query = connection.query('SELECT t1.*,site_group_memberships.group_id AS group_id FROM (SELECT id,last_name,first_name,active FROM site_users WHERE userID IN ("'+req.session.UserPrincipalName.substr(0,req.session.UserPrincipalName.indexOf('@'))+'", "'+ req.session.Email.substr(0,req.session.Email.indexOf('@'))+'")) as t1 LEFT JOIN site_group_memberships ON site_group_memberships.person_id=t1.id;');

        query.on('result', (row) => {
          result_group_id.push(row['group_id']);
          result_user_id.push(row['id']);
          active = row['active'];
        });
        query.on('end', () => {
          connection.release();
          if (result_user_id.length && active) {
            req.session.group_id = result_group_id;
            req.session.user_id = result_user_id;
            res_1.json({appVersion:version,code:1,status:req.session.status,FirstName:req.session.FirstName,
                        LastName:req.session.LastName, UserPrincipalName:req.session.UserPrincipalName,
                        Email:req.session.Email,Group_id:req.session.group_id,User_id:req.session.user_id});
            next();
          } else {
            authResults.status = "User Inactived";
            res_1.json({code:2, status:authResults.status});
            next();
          }
        });
      });
    }
  });
}

function request_Access(SERVICE_ACCOUNT_USERNAME,SERVICE_ACCOUNT_PASSWORD,CALLBACK) {
  return request_Access[SERVICE_ACCOUNT_USERNAME,SERVICE_ACCOUNT_PASSWORD,CALLBACK] ||
  (request_Access[SERVICE_ACCOUNT_USERNAME,SERVICE_ACCOUNT_PASSWORD,CALLBACK] = function(req, res_1, next) {
    // console.log(req.session.status)
    if(req.session.status!='Authenticated'){
      var RETURNED_TOKEN_FROM_LOGIN = req.headers.referer.substr(req.headers.referer.indexOf('?token=')).substring(7);
      var username = SERVICE_ACCOUNT_USERNAME;
      var password = SERVICE_ACCOUNT_PASSWORD;
      var token = RETURNED_TOKEN_FROM_LOGIN;

      // AD URL
      var url = ADURL;
     
      var ntlmclient = require('ntlm-client')
      var async = require('async');
      var httpreq = require('httpreq');
      var HttpsAgent = require('agentkeepalive').HttpsAgent;
      var keepaliveAgent = new HttpsAgent();
      var parseseXML = require('xml2js').parseString
      var options = {
          url: url,
          username: username,
          password: password,
          workstation: '',
          domain: 'NIH'
      };
      async.waterfall([
          function (callback){
              var type1msg = ntlmclient.createType1Message(options.workstation,options.url);
              httpreq.get(options.url, {
                  headers:{
                      'Connection' : 'keep-alive',
                      'Authorization': type1msg,
                      'Content-Type': 'text/xml;charset=UTF-8;'
                  },
                  agent: keepaliveAgent
              }, callback);
          },
          function (res, callback){
              if(!res.headers['www-authenticate']){
                return callback(new Error('www-authenticate not found on response of second request'));
              }
              var type2msg = ntlmclient.decodeType2Message(res.headers['www-authenticate']);
              // console.log(type2msg);
              var type3msg = ntlmclient.createType3Message(type2msg,options.username,options.password);
          //    // console.log(token);
          var data = '<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://www.w3.org/2005/08/addressing">' 
          + '<s:Header><a:Action s:mustUnderstand="1">http://tempuri.org/ITokenConsumer/ConsumeToken</a:Action><a:MessageID>' 
          + 'urn:uuid:urn:uuid:</a:MessageID><a:ReplyTo><a:Address>http://www.w3.org/2005/08/addressing/anonymous</a:Address></a:ReplyTo>' 
          + '<a:To s:mustUnderstand="1">https://services.ncifcrf.gov/FederatedAuthentication/v1.0/TokenConsumer.svc</a:To></s:Header>' 
          + '<s:Body><ConsumeToken xmlns="http://tempuri.org/"><token>' + token + '</token></ConsumeToken></s:Body></s:Envelope>';
              setImmediate(function() {
                  httpreq.post(options.url, {
                      body: data,
                      headers:{
                        'Content-Type': 'application/soap+xml;charset=UTF-8',
                        'Connection' : 'keep-alive',
                        'Authorization': type3msg,
                        'Accept-Encoding': 'gzip, deflate',
                        'Expect': '100-continue'
                      },
                      allowRedirects: false,
                      agent: keepaliveAgent
                  }, callback);
              });
          }
      ], function (err, res) {

        authResults = {
          "status" : ""
          ,"error" : null
          ,"userInfo" : {}
        }
        if (err) {
          authResults.status = "Authentication failed"
          authResults.error = err
        }
        if (res.statusCode == "200") {
          parseseXML(res.body,function(err,result){
            if (err) {
              authResults.status = "Authentication succeeded, but there was an error in processing"
              authResults.error = err
            } else {
              // console.log(result['s:Envelope']['s:Body']['0']['ConsumeTokenResponse']['0']['ConsumeTokenResult']['0']['b:Email']);
              if (result['s:Envelope']['s:Body']['0']['ConsumeTokenResponse']['0']['ConsumeTokenResult']['0']['b:Email'] == undefined) {
            //    // console.log(result['s:Envelope']['s:Body']['0']['ConsumeTokenResponse']['0']['ConsumeTokenResult']);
                authResults.status = "Authentication failed"
              } else {
                // console.log(result['s:Envelope']['s:Body']['0']);
                var userInfo = {
                "Email" : result['s:Envelope']['s:Body']['0']['ConsumeTokenResponse']['0']['ConsumeTokenResult']['0']['b:Email']['0']
                ,"FirstName" : result['s:Envelope']['s:Body']['0']['ConsumeTokenResponse']['0']['ConsumeTokenResult']['0']['b:FirstName']['0']
                ,"LastName" : result['s:Envelope']['s:Body']['0']['ConsumeTokenResponse']['0']['ConsumeTokenResult']['0']['b:LastName']['0']
                ,"NedID" : result['s:Envelope']['s:Body']['0']['ConsumeTokenResponse']['0']['ConsumeTokenResult']['0']['b:NedID']['0']
                ,"Telephone" : result['s:Envelope']['s:Body']['0']['ConsumeTokenResponse']['0']['ConsumeTokenResult']['0']['b:Telephone']['0']
                ,"UserPrincipalName" : result['s:Envelope']['s:Body']['0']['ConsumeTokenResponse']['0']['ConsumeTokenResult']['0']['b:UserPrincipalName']['0']
              }
              authResults.status = "Authenticated"
              authResults.userInfo = userInfo
              } 
            }
          });
          
          var auth = authResults['status'];
          var userFirstName = authResults['userInfo']['FirstName'];
          var userLastName = authResults['userInfo']['LastName'];
          var NedID = authResults['userInfo']['NedID'];
          var Telephone = authResults['userInfo']['Telephone'];
          var Email = authResults['userInfo']['Email'];
          var UserPrincipalName = authResults['userInfo']['UserPrincipalName'];

          if(auth =='Authenticated'){
            req.session.regenerate(function(err){
              if(err){
                return res_1.json({msg:err})
              }

              let result=[];
              let status;
              mysqlcon.getConnection((err,connection)=>{

                  if(err) throw err;
                  let checkExistResult =[];
                  let active;
                  var query = connection.query('SELECT * FROM site_users WHERE userID = ?', [UserPrincipalName.substr(0,UserPrincipalName.indexOf('@'))]);
                  // console.log('SELECT * FROM site_users WHERE userID = ' + UserPrincipalName.substr(0,UserPrincipalName.indexOf('@')) +';');
                  query.on('result',(row)=>{
                        checkExistResult.push(row);
                        active = row['active'];
                  });
                  query.on('end',()=>{
                    if(checkExistResult.length && active){
                      res_1.json({code:1,msg:'You are already have access to SAIP Image portal.'});
                      next();
                    }else{
                      var query = connection.query('SELECT * FROM request_users WHERE userID = ?', [UserPrincipalName.substr(0,UserPrincipalName.indexOf('@'))]);

                      // console.log('SELECT * FROM request_users WHERE userID = ' + UserPrincipalName.substr(0,UserPrincipalName.indexOf('@')) +';');
                      query.on('result',(row)=>{
                            result.push(row);
                            status = row['status'];
                      });
                      query.on('end',()=>{
                          req.session.FirstName = userFirstName;
                          req.session.LastName = userLastName;
                          req.session.NedID = NedID;
                          req.session.Telephone = Telephone;
                          req.session.Email = Email;
                          req.session.UserPrincipalName = UserPrincipalName;
                          req.session.status = auth;

                          if(result.length && status == 'approval'){
                            res_1.json({code:1,msg:'You are already have access to SAIP Image portal.'});
                            next();
                          }else if(result.length && status == 'pending'){
                            res_1.json({code:6,msg:'Your request is still in pending.'});
                            next();
                          }else if(result.length && status == 'denied'){
                            res_1.json({code:4,msg:'Your request is denied.'});
                            next();
                          }else{
                            let insert_result = []

                            var query = connection.query('INSERT INTO request_users ( last_name, first_name, userID, email, phone_office, nedID, status, created_at) \
                                                  VALUES (?,?,?,?,?,?,"pending",NOW())', [userLastName, userFirstName, UserPrincipalName.substr(0,UserPrincipalName.indexOf('@')), Email, Telephone, NedID]);
                            // console.log('INSERT INTO request_users ( last_name, first_name, userID, email, phone_office, nedID, status, created_at)');
                            // console.log('VALUES ('+userLastName+', '+userFirstName+', '+UserPrincipalName.substr(0,UserPrincipalName.indexOf('@'))+', '+Email+', '+Telephone+', '+ NedID +', '+' "pending" , NOW());');
                            query.on('result',(row)=>{
                                  insert_result.push(row);
                            });
                            query.on('end',()=>{
                              res_1.json({code:3,msg:'Access request for SAIP Image portal has been sent to admin.'});
                              next();
                            });
                          }
                      });
                    }
                  });
              });
            });
          }
          else {
            authResults.status = "Authentication failed";
            res_1.json({code:0,status:authResults.status});
            next();
          }
        } else {
          authResults.status = "Authentication failed";
          res_1.json({code:0,status:authResults.status});
          next();
        }
      });
    }else{
      mysqlcon.getConnection((err,connection)=>{

          if(err) throw err;
          let checkExistResult =[];
          let active;
          var query = connection.query('SELECT * FROM site_users WHERE userID = ?', [req.session.UserPrincipalName.substr(0,req.session.UserPrincipalName.indexOf('@'))]);
          // console.log('SELECT * FROM site_users WHERE userID = ' + req.session.UserPrincipalName.substr(0,req.session.UserPrincipalName.indexOf('@')) +';');
          query.on('result',(row)=>{
                checkExistResult.push(row);
                active = row['active'];
          });
          query.on('end',()=>{
            if(checkExistResult.length && active){
              res_1.json({code:1,msg:'You are already have access to SAIP Image portal.'});
              next();
            }else{
              var query = connection.query('SELECT * FROM request_users WHERE userID = ?', [req.session.UserPrincipalName.substr(0,req.session.UserPrincipalName.indexOf('@'))]);
              let result =[];
              let status;
              // console.log('SELECT * FROM request_users WHERE userID = ' + req.session.UserPrincipalName.substr(0,req.session.UserPrincipalName.indexOf('@')) +';');
              query.on('result',(row)=>{
                    result.push(row);
                    status = row['status'];
              });
              query.on('end',()=>{
                if(result.length && status == 'approval'){
                  res_1.json({code:1,msg:'You are already have access to SAIP Image portal.'});
                  next();
                }else if(result.length && status == 'pending'){
                  res_1.json({code:6,msg:'Your request is still in pending.'});
                  next();
                }else if(result.length && status == 'denied'){
                  res_1.json({code:4,msg:'Your request is denied.'});
                  next();
                }else{
                  let insert_result = []
                  var query = connection.query('INSERT INTO request_users ( last_name, first_name, userID, email, phone_office, nedID, status, created_at) \
                                        VALUES (?,?,?,?,?,?,"pending",NOW())', [req.session.LastName, req.session.FirstName, req.session.UserPrincipalName.substr(0,req.session.UserPrincipalName.indexOf('@')), req.session.Email, req.session.Telephone, req.session.NedID]);
                  // console.log('INSERT INTO request_users ( last_name, first_name, userID, email, phone_office, nedID, status, created_at)');
                  // console.log('VALUES ('+req.session.LastName+', '+req.session.FirstName+', '+req.session.UserPrincipalName.substr(0,req.session.UserPrincipalName.indexOf('@'))+', '+req.session.Email+', '+req.session.Telephone+', '+ req.session.NedID +', '+'"pending", NOW());');
                  query.on('result',(row)=>{
                    // console.log('on result');
                    insert_result.push(row);
                  });
                  query.on('error',(err)=>{
                    // console.log('on error');
                    // console.log(err);
                  });
                  query.on('end',()=>{
                    // console.log('on end');
                    res_1.json({code:3,msg:'Access request for SAIP Image portal has been sent to admin.'});
                    next();
                  });
                }
                    
              });
            }
        });
      });
    }
  });
}
//app.use( cors({credentials:true,origin:['http://fr-s-ivg-ssr-d1:8080','http://ivg-boxx:8082']}));
app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
// app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, './public')));

app.use('/', routes);
app.use('/api/v1/projects', projectsRoutes);
app.use('/api/v1/experiments', experimentsRoutes);


app.get('/mysql',function(req,res,next){
  // console.log(req.session)
 var results=[];
  mysqlcon.getConnection((err,connection)=>{
        if(err) throw err;
        var query = connection.query('SELECT nci_projects.name AS nci_projects_name, nci_projects.created_at AS nci_projects_created_at, \
                                           nci_projects.updated_at AS nci_projects_updated_at, t1.site_users_id AS site_users_id, \
                                           t1.site_users_last_name AS site_users_last_name, t1.site_users_first_name AS site_users_first_name, \
                                           t1.nci_project_users_project_id AS nci_project_users_project_id FROM(SELECT site_users.id AS site_users_id, \
                                           site_users.last_name AS site_users_last_name, site_users.first_name AS site_users_first_name, \
                                           nci_project_users.project_id AS nci_project_users_project_id FROM site_users LEFT JOIN nci_project_users \
                                           ON site_users.id = nci_project_users.user_id) AS t1 LEFT JOIN nci_projects ON \
                                           t1.nci_project_users_project_id = nci_projects.id WHERE t1.site_users_last_name = "'+req.session.LastName+'" \
                                           and t1.site_users_first_name = "'+req.session.FirstName+'"');
                query.on('result',(row)=>{
                        results.push(row);
                });
                query.on('end',()=>{
                        return res.json(results);
                });
        connection.release();

    });


});

app.get('/accessRequest',request_Access(ADServiceAccount,ADServicePassword,isAuth),function(req,res,next){

});
app.get('/',NIH_Authenticate(ADServiceAccount,ADServicePassword,isAuth),function(req,res,next){
});

// Fake session
// app.get('/',function(req,res,next){
//   req.session.regenerate(function(err){
//     if(err){
//       return res_1.json({msg:err})
//     }
//     req.session.FirstName = 'Tianyi';
//     req.session.LastName = 'Miao';
//     req.session.NedID = 123;
//     req.session.Telephone = 123;
//     req.session.Email = 123;
//     req.session.UserPrincipalName = 123;
//     req.session.status = 'Authenticated';
//     req.session.group_id = [7];
//     req.session.user_id = [5];

//     // console.log(req.session);
//     return res.json({appVersion:version, code:1,status:req.session.status,FirstName:req.session.FirstName,
//                       LastName:req.session.LastName,NedID:req.session.NedID,Telephone:req.session.Telephone,
//                       Email:req.session.Email,UserPrincipalName:req.session.UserPrincipalName,Group_id:req.session.group_id,User_id:req.session.user_id})
//   });
// });


// app.post('/mockLogin',function(req,res,next){
//   var sess = req.session;
// //  // console.log(req);
//   var user = findUser(req.body.username,req.body.password);
// //  var token = ST;
// //  NIH_Authenticate(req.body.name,req.body.password,token,isAuth);
// //  // console.log(user);
//   if (user){
//     req.session.regenerate(function(err){
//       if(err){
//         return res.json({msg:err})
//       }
//       req.session.FirstName = 'TEST';
//       req.session.LastName = 'TEST';
//       req.session.NedID = 123;
//       req.session.Telephone = 123;
//       req.session.Email = 123;
//       req.session.UserPrincipalName = 123;
//       req.session.status = 'Authenticated';
//       req.session.group_id = [7];
//       req.session.user_id = [5];

//       // console.log(req.session);
//       return res.json({code:1,status:req.session.status,FirstName:req.session.FirstName,
//                         LastName:req.session.LastName,NedID:req.session.NedID,Telephone:req.session.Telephone,
//                         Email:req.session.Email,UserPrincipalName:req.session.UserPrincipalName,Group_id:req.session.group_id,User_id:req.session.user_id})
//     });
//   }else{
//     res.json({code:0,msg:'no that user'})
//   }
// });

app.get('/logout',function(req,res,next){
  req.session.destroy(function(err){
    if(err){
      res.json({msg:'Some error when logout'})
      return;
    }
    res.clearCookie(identityKey);
 //   res.redirect('http://fr-s-ivg-ssr-d1:8080');
    res.json({code:0,msg:'logout'})
  });
});
// catch 404 and forward to error handler
app.use(function(req, res, next) {
//  res.header("Access-Control-Allow-Origin", "*");
//  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
