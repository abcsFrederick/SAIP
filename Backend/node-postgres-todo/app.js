var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var FileStore = require("session-file-store")(session);
var routes = require('./routes/index');
//var users = require('./routes/users');
var cors = require('cors');
var app = express();

var identityKey = 'skey';
var users = [{name:'tymiao',password:'luying0325'},{name:'admin',password:'password'},{name:'yanling',password:'yanlingYANLING'},{name:'kalen',password:'kalenKALEN'}];
// view engine setup
var findUser = function(name,password){
  return users.find(function(item){
    return item.name===name && item.password===password;
  });
};

function isAuth(){
  console.log(authResults);
  var auth = authResults['status'];
  var userFirstName = authResults['userInfo']['FirstName'];
  var userLastName = authResults['userInfo']['LastName'];
};

function NIH_Authenticate(SERVICE_ACCOUNT_USERNAME,SERVICE_ACCOUNT_PASSWORD,CALLBACK) {
  return NIH_Authenticate[SERVICE_ACCOUNT_USERNAME,SERVICE_ACCOUNT_PASSWORD,CALLBACK] ||
  (NIH_Authenticate[SERVICE_ACCOUNT_USERNAME,SERVICE_ACCOUNT_PASSWORD,CALLBACK] = function(req, res_1, next) {
    if(req.session.status!='Authenticated'){
      console.log('create session');
      var RETURNED_TOKEN_FROM_LOGIN = req.headers.referer.substr(req.headers.referer.indexOf('?token=')).substring(7);
      var username = SERVICE_ACCOUNT_USERNAME;
      var password = SERVICE_ACCOUNT_PASSWORD;
      var token = RETURNED_TOKEN_FROM_LOGIN;
      var url = 'https://services-staging.ncifcrf.gov/FederatedAuthentication/v1.0/TokenConsumer.svc?singleWsdl'
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
              var type3msg = ntlmclient.createType3Message(type2msg,options.username,options.password);
          //    console.log(token);
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
        //console.log(res);
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
            //  console.log(result);
              if (result['s:Envelope']['s:Body']['0']['ConsumeTokenResponse']['0']['ConsumeTokenResult']['0']['b:Email'] == undefined) {
            //    console.log(result['s:Envelope']['s:Body']['0']['ConsumeTokenResponse']['0']['ConsumeTokenResult']);
                authResults.status = "Authentication failed"
              } else {
            //    console.log(result['s:Envelope']['s:Body']['0']);
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
          req.session.regenerate(function(err){
            if(err){
              return res_1.json({msg:err})
            }

            req.session.FirstName = userFirstName;
            req.session.LastName = userLastName;
            req.session.NedID = NedID;
            req.session.Telephone = Telephone;
            req.session.Email = Email;
            req.session.UserPrincipalName = UserPrincipalName;
            req.session.status = auth;

            res_1.json({code:1,status:auth,FirstName:userFirstName,
                        LastName:userLastName,NedID:NedID,Telephone:Telephone,
                        Email:Email,UserPrincipalName:UserPrincipalName});
            next();
          });

        } else {
          authResults.status = "Authentication failed";
          res_1.json({code:0,status:authResults.status});
          next();
        }
       // console.log(req.session.info);
      //  CALLBACK(authResults);
      //  req.session.info=authResults;
       // eval(CALLBACK+"(authResults)")
      });
    }else{
      console.log('has session');
      res_1.json({code:1,status:req.session.status,FirstName:req.session.FirstName,
                  LastName:req.session.LastName,NedID:req.session.NedID,Telephone:req.session.Telephone,
                  Email:req.session.Email,UserPrincipalName:req.session.UserPrincipalName});
      next();
    }
  });
}


//app.use( cors({credentials:true,origin:['http://fr-s-ivg-ssr-d1:8080','http://ivg-boxx:8082']}));
app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, './public')));

app.use('/', routes);
//app.use('/users', users);
app.use(session({
  name:identityKey,
  secret:'tymiao',
  store:new FileStore(),
  saveUninitialized:false,
  resave:false,
  cookie:{
    maxAge:2*60*60*1000
  }
}));

app.get('/',NIH_Authenticate("ncifivgSvc","333=yahoo=Google",isAuth),function(req,res,next){

console.log(req.session.status);
//  console.log(req.headers.referer.substr(req.headers.referer.indexOf('?token=')).substring(7));
//  if(!req.session.isAuth){
//    var ST = req.headers.referer.substr(req.headers.referer.indexOf('?token=')).substring(7);
//    NIH_Authenticate("ncifivgSvc","333=yahoo=Google",ST,isAuth);
//  }
/*
  if(!req.session.isAuth){
    console.log('auth');
    if (auth){
      req.session.regenerate(function(err){
        if(err){
          return res.json({msg:err})
        }
        req.session.loginUser = userFirstName + userLastName;
        req.session.isAuth = auth;
        res.json({code:1,msg:req.session.loginUser});
      });
    }else{
      res.json({code:0,msg:'no that user'})
    }
  }
  var sess = req.session;
  var loginUser = sess.loginUser;
  var isLogined = !!loginUser;
  console.log(sess);
  if(isLogined){
    res.json({code:1,msg:loginUser});
  }else{
    res.json({code:0,msg:'no user login'});
  }
  /*res.render('index',{
    isLogined:isLogined,
    name:loginUser ||""
  })*/
});

app.post('/login',function(req,res,next){
  var sess = req.session;
//  console.log(req);
  var user = findUser(req.body.name,req.body.password);
//  var token = ST;
//  NIH_Authenticate(req.body.name,req.body.password,token,isAuth);
//  console.log(user);
  if (user){
    req.session.regenerate(function(err){
      if(err){
        return res.json({msg:err})
      }
      req.session.loginUser = user.name;
      res.json({code:1,msg:user.name});
    });
  }else{
    res.json({code:0,msg:'no that user'})
  }
});

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
