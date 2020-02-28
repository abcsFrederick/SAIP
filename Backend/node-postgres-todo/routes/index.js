var logger = require('../loggerConfig');
var express = require('express');
var app = express();
var compression = require('compression'); 
app.use(compression());  

var router = express.Router();
var cors = require('cors');

var rimraf = require('rimraf');
var fs = require('fs-extra');
var path = require('path');
var zipFolder = require('zip-folder');

var archiver = require('archiver');
var fileUpload = require('express-fileupload');

var ncp = require('ncp').ncp;
var async = require('async');

var validator = require('express-validator');
var config = require('config');


require('express-ws')(router);
// var ws = require('./ws')
/*
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
*/

const doc_root = config.get('filesystemConfig.doc_root');
const archive_root = config.get('filesystemConfig.archive_root');
const mysqlConfig = config.get('dbConfig.mysql');
const postgresConfig = config.get('dbConfig.postgres');

router.use(fileUpload());
router.use(validator({
    customValidators: {
     isArrayOfInt: function(value) {
        return Array.isArray(value)&&Number.isInteger(parseInt(value[0]));
     }}
}));
router.use( cors({credentials:true,origin:['http://fr-s-ivg-ssr-d1:8080',
                                           'http://ivg-boxx:8082',
                                           'http://localhost:8888',
                                           'http://localhost:9876',                     //for jasmine testing
                                 'http://localhost:8889',
                                           'http://frsivg-mip01p:8888',
                                           'https://frsivg-mip01p.ncifcrf.gov/']}));  //for cross domin with cookie credientials

//router.all('*', cors());
/* GET home page. */
router.get('/api/v1/scippy/', function(req, res) {
  res.render('index', { title: 'Express' });
});


const pg = require('pg');
//const connectionString = process.env.DATABASE_URL || 'postgres://scippy_readonly:cardio372@fr-s-ivg-mip-s:5432/scippy';
//const connectionString = process.env.DATABASE_URL || 'postgres://miaot2:luying0325@localhost:5432/miaot2';
//const connectionString = process.env.DATABASE_URL || 'postgres://miaot2:luying0325@ivg-boxx:5432/miaot2';
connectionString = process.env.DATABASE_URL || postgresConfig;
var session = require('express-session');
var identityKey = 'skey';
var FileStore = require("session-file-store")(session);

router.use(session({
  name:identityKey,
  secret:'tymiao',
  store:new FileStore,
  saveUninitialized:false,
  resave:false,
  cookie:{
    maxAge:2*60*60*1000,
    httpOnly: true,
    secure: true
  }
}));

var isAdmin = function(req,res,next){
//    console.log('in isAuth');
    if(req.session.group_id.includes(7))
    {
        return next();
    }else{
        return res.json({'err':'1','msg':'Contact Admin user to gain permission'})
    }
    //res.redirect('/')
  //  'https://ncifrederick.cancer.gov/SignIn/NihLoginIntegration.axd?returnUrl=https://frsivg-mip01p.ncifcrf.gov/Scippy/'
  //  res.redirect('https%3a%2f%2fncifrederick%2Ecancer%2Egov%2fSignIn%2fNihLoginIntegration%2Eaxd%3FreturnUrl=https%3a%2f%2ffrsivg-mip01p%2Encifcrf%2Egov%2fScippy%2f')
}


var isAuth = function(req,res,next){
   // console.log('in isAuth');
   // console.log(req);
//    console.log(req.session.status);
    if(req.session.status=='Authenticated')
    {
 //       console.log('true?');
        return next();
    }else{
        return res.json({'err':'1','msg':'Please login first or contact admin user to whitelist you'})
    }
    //res.redirect('/')
  //  'https://ncifrederick.cancer.gov/SignIn/NihLoginIntegration.axd?returnUrl=https://frsivg-mip01p.ncifcrf.gov/Scippy/'
  //  res.redirect('https%3a%2f%2fncifrederick%2Ecancer%2Egov%2fSignIn%2fNihLoginIntegration%2Eaxd%3FreturnUrl=https%3a%2f%2ffrsivg-mip01p%2Encifcrf%2Egov%2fScippy%2f')
}

function stringFilter(str){
    return str.replace(/[^A-Za-z0-9]/g, '');
}
// router.get('/api/v1/scippy/date=:from.:to/patient=:name',isAuth,(req,res,next)=>{
//         //console.log('in query');
//         const results = [];
//         //console.log("SELECT * FROM patients WHERE mod_time >= '"+req.params.from+"' and mod_time <= '"+req.params.to+"' and pat_name LIKE '%"+req.params.name+"%'");
//         pg.connect(connectionString,(err,client,done)=>{
//                if(err){
//                         done();
//                         console.log(err);
//                         return res.status(500),json({success:false,data:err});
//                 }
//         //        console.log('in query 2');
//                 if(req.params.name == 'none'){
//         //            console.log('in query 3');
//                     var dateFrom = stringFilter(req.params.from);
//                     var dateTo = stringFilter(req.params.to);
//                 // var query = client.query("SELECT patients.pat_name AS patient, patients.id AS patient_id, studies.pat_id AS pat_id, studies.id AS study_id, studies.study_description AS study_description, patients.pat_path AS patient_path, studies.study_path AS study_path FROM patients LEFT JOIN studies ON patients.id = studies.pat_id WHERE patients.mod_time >= '"+dateFrom+"' and patients.mod_time <= '"+dateTo+"' \
//                 //                  and patients.pat_name LIKE '%%' ORDER BY patient_id");
//                     var query = client.query("SELECT DISTINCT ON (t2.serie_id) * FROM(SELECT t1.study_description AS study_description, \
//                         t1. patient AS patient, t1.patient_id AS patient_id, t1.study_id AS study_id, series.id AS serie_id, t1.patient_path AS patient_path, \
//                         t1.study_path AS study_path, series.series_path AS serie_path, series.modality AS modality, series.series_description AS serie_description, \
//                         series.series_uid AS serie_uid, series.mod_time AS series_mod_time, images.filename AS image_name From (SELECT patients.pat_name AS patient, patients.id AS patient_id, \
//                         studies.pat_id AS pat_id, studies.id AS study_id, studies.study_description AS study_description, patients.pat_path AS patient_path, \
//                         studies.study_path AS study_path FROM patients LEFT JOIN studies ON patients.id = studies.pat_id \
//                         WHERE patients.mod_time >= '"+req.params.from+"' and patients.mod_time <= '"+req.params.to+"' and patients.pat_name LIKE '%%') AS t1 \
//                         LEFT JOIN series ON t1.study_id = series.study_id LEFT JOIN images ON series.id = images.series_id ORDER BY patient_id) AS t2");
                
//                 //    var query = client.query("SELECT * FROM patients");
//                 }
//                 else{
//                     queryParams = stringFilter(req.params.name);
//                     console.log(queryParams);
//                  var query = client.query("SELECT patients.pat_name AS patient, patients.id AS patient_id, studies.pat_id AS pat_id, studies.id AS study_id, studies.study_description AS study_description, patients.pat_path AS patient_path, studies.study_path AS study_path FROM patients LEFT JOIN studies ON patients.id = studies.pat_id WHERE patients.mod_time >= '"+req.params.from+"' and patients.mod_time <= '"+req.params.to+"' \
//                                   and (LOWER(patients.pat_name) LIKE LOWER('%"+queryParams+"%') or LOWER(studies.study_description) LIKE LOWER('%"+queryParams+"%')) ORDER BY patient_id");
//                 }
                
//                 query.on('row',(row)=>{
//                 //        console.log(row);
//                         results.push(row);
//                 });
//                 query.on('end',()=>{
//                         done();
//                         return res.json(results);
//                 });
//         });
// });


// router.get('/api/v1/scippy/study=:id',isAuth,(req,res,next)=>{
//         const results = [];
//         console.log(req.params);
//         //console.log("SELECT * FROM patients WHERE mod_time >= '"+req.params.from+"' and mod_time <= '"+req.params.to+"' and pat_name LIKE '%"+req.params.name+"%'");
//         pg.connect(connectionString,(err,client,done)=>{
//                if(err){
//                         done();
//                         console.log(err);
//                         return res.status(500),json({success:false,data:err});
//                 }

//                 var query = client.query("SELECT DISTINCT ON (serie_id) * FROM (SELECT studies.id AS study_id, series.study_id AS stu_id, series.modality AS modality, series.series_description AS serie_description, series.series_path AS serie_path, series.series_uid AS serie_uid, series.id AS serie_id, images.filename AS image_name FROM studies LEFT JOIN series ON studies.id = series.study_id LEFT JOIN images ON series.id = images.series_id  WHERE study_id = '"+req.params.id+"' ORDER BY study_id) AS referenceTable");
               
//                 query.on('row',(row)=>{

//                         results.push(row);
//                 });
//                 query.on('end',()=>{
//                         done();
//                         return res.json(results);
//                 });
//         });
// });
// router.get('/api/v1/scippy/downloadSeries/:patientPath/:studyPath/:seriePath/:patientName/:Modality',isAuth,(req,res,next)=>{

//     var seriePathArr=req.params.seriePath.split(",");
//     var modalityArr=req.params.Modality.split(",");


//     var total=[];
//     for(let a=0;a < seriePathArr.length;a++){
//         let index=[];
//         index.push(seriePathArr[a]);
//         index.push(modalityArr[a]);
//         total.push(index);
//     };

//  console.log(total);

//     var archive = archiver('zip',{
//           zlib: { level: 1 } // Sets the compression level.
//         });

//     var output = fs.createWriteStream(__dirname+"/"+req.params.patientName+' '+req.params.Modality+'.zip');

//     output.on('close', function() {
//         console.log(archive.pointer() + ' total bytes');
//         console.log('archiver has been finalized and the output file descriptor has closed.');
//         res.header("Access-Control-Expose-Headers", "Content-Disposition");
//         res.download(__dirname+"/"+req.params.patientName+' '+req.params.Modality+'.zip',__dirname+"/"+req.params.patientName+'.zip',function(err){
//                                 //CHECK FOR ERROR
//                                 fs.unlink(__dirname+"/"+req.params.patientName+' '+req.params.Modality+'.zip');
//                             });   
//     });

//     archive.on('error', function(err) {
//         throw err;
//     });

//     archive.pipe(output);

//     for(let a=0;a<total.length;a++){
//         archive.directory(archive_root+req.params.patientPath+'/'+req.params.studyPath+'/'+total[a][0], req.params.patientName+' '+total[a][0] , { date: new Date() });
//     }
//     archive.finalize();
  
// });
// router.get('/api/v1/scippy/downloadStudy/:patientPath/:studyPath',isAuth,(req,res,next)=>{


//     var filePath = path.join(__dirname,'./empty');
//     filePath = archive_root+req.params.patientPath+'/'+req.params.studyPath;
//     console.log(filePath);

//     zipFolder(filePath,__dirname+"/"+req.params.studyPath+'.zip',function(err){
//             if(err){
//                 console.log("ops!"+err);
//             }else{
//                 console.log("package done");
//                 var stats = fs.statSync(__dirname+"/"+req.params.studyPath+".zip");
//                 if(stats.isFile){
//                     res.download(__dirname+"/"+req.params.studyPath+".zip",req.params.studyPath+".zip")        
//                 }else
//                 {
//                         res.end(404)
//                 }
//             }
//     });
        
// });
// router.get('/api/v1/scippy/downloadAllStudies/:patientPath/:studyPath/:patientName/:study_description/:seriesPath',isAuth,(req,res,next)=>{
//     var patientPathArr=req.params.patientPath.split(",");
//     console.log(patientPathArr);
//     var studyPathArr=req.params.studyPath.split(",");
//     var seriesPathArr=req.params.seriesPath.split(",");
//     var patientNameArr=req.params.patientName.split(",");
//     console.log(studyPathArr);
//     console.log(seriesPathArr);
//     console.log(patientNameArr);
//     var study_description = req.params.study_description;
//     //Change back to real name
//     var study_description_realName = req.params.study_description.replace('!@REPlace','%2F');//\\:?
//     console.log("study_description:"+study_description_realName);
//     // Clean array To avoid duplicate (comes from multiple series with same study and patient path)
//    /* uniquepatientPathArr = patientPathArr.filter(function(elem, pos) {
//         return patientPathArr.indexOf(elem) == pos;
//     });
//     uniquestudyPathArr = studyPathArr.filter(function(elem, pos) {
//         return studyPathArr.indexOf(elem) == pos;
//     });
//     uniquepatientNameArr = patientNameArr.filter(function(elem, pos) {
//         return patientNameArr.indexOf(elem) == pos;
//     });*/
//     var total=[];
//     for(let a=0;a < patientPathArr.length;a++){
//         let flag=0;
//         fs.readdirSync(archive_root+patientPathArr[a]+'/'+studyPathArr[a]+'/'+seriesPathArr[a]).forEach(file => {
//             if(path.extname(archive_root+patientPathArr[a]+'/'+studyPathArr[a]+'/'+seriesPathArr[a]+'/'+file)=='.jpg'){
//                 flag=1;
//             }
//         });
//         if(!flag){
//             let index=[];
//             index.push(patientPathArr[a]);
//             index.push(studyPathArr[a]);
//             index.push(patientNameArr[a]);
//             index.push(seriesPathArr[a]);
//             total.push(index);
//         }
//     }
//     console.log(total);
    
//     for(let a=0;a < studyPathArr.length;a++){
//         let index=[];
//         index.push(patientPathArr[a]);
//         index.push(studyPathArr[a]);
//         index.push(patientNameArr[a]);
//         index.push(seriesPathArr[a]);
//         total.push(index);
//     };
    
//     console.log(total);

//     var archive = archiver('zip',{
//           zlib: { level: 1 } // Sets the compression level.
//         });

//     console.log('createWriteStream');

//     var output = fs.createWriteStream(__dirname +"/"+ study_description_realName+'.zip');

//     console.log('createWriteStream done');

//     output.on('close', function() {
//         console.log(archive.pointer() + ' total bytes');
//         console.log('archiver has been finalized and the output file descriptor has closed.');
//     //    fs.createReadStream(__dirname+"/"+req.params.study_description+".zip").pipe(res);
//     //    fs.unlinkSync(__dirname+"/"+req.params.study_description+".zip");
//         res.header("Access-Control-Expose-Headers", "Content-Disposition");
//         res.download(__dirname+"/"+study_description_realName+".zip",study_description_realName+".zip"
//                             ,function(err){
//                                 //CHECK FOR ERROR
//                                 fs.unlink(__dirname+"/"+study_description_realName+".zip");
//                             });
//     });
//     archive.on('error', function(err) {
//         throw err;
//     });

//     archive.pipe(output);

//     for(let a=0;a<total.length;a++){
//         archive.directory( archive_root+total[a][0]+'/'+total[a][1]+'/'+total[a][3], study_description_realName+'/'+total[a][2]+'/'+total[a][2] + ' '+total[a][3], { date: new Date() });
//     }
//     archive.finalize();
  
// });


const mysql = require('mysql');
var mysqlcon = mysql.createPool(mysqlConfig);
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

var directorySize = function(path, callback, size) {
    if (size === undefined) {
        size = 0;
    }

    fs.stat(path, function(err, stat) {
        if (err) {
          callback(err);
          return;
        }

        size += stat.size;

        if (!stat.isDirectory()) {
          callback(null, size);
          return;
        }

        fs.readdir(path, function(err, paths) {
          if (err) {
            callback(err);
            return;
          }

          async.map(paths.map(function(p) { return path + '/' + p }), directorySize, function(err, sizes) {
            size += sizes.reduce(function(a, b) { return a + b }, 0);
            callback(err, size);
          })
        })
    })
}

var bytesToSize = function(bytes) {
   var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
   if (bytes == 0) return '0 Byte';
   var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
   return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
};

var zipFolderWithProgress = function(webSocket, srcFolder, zipFilePath, totalSize, callback) {
    var output = fs.createWriteStream(zipFilePath);
    var zipArchive = archiver('zip');
    var prettyTotalSize = bytesToSize(totalSize);

    output.on('close', function() {
        console.log('Total '+prettyTotalSize);
        callback();
    });
    // zipArchive.on('entry', function() {
    //     console.log('Total around ' + estimateSize + ' bytes');
    // });
    zipArchive.on('progress', function() {
        let prettyCurrentSize = bytesToSize(zipArchive.pointer());
        var percent = 100 - ((totalSize - zipArchive.pointer()) / totalSize) * 100;
        // console.log('At ' + prettyCurrentSize + '/' + prettyTotalSize);
        // console.log('At ' + parseInt(percent));
        webSocket.send(JSON.stringify({'err':'2','msg':' ' + prettyCurrentSize + '/' + prettyTotalSize + '('+parseInt(percent)+'%)'}));
    });
    zipArchive.pipe(output);

    // zipArchive.bulk([
    //     { cwd: srcFolder, src: ['**/*'], expand: true }
    // ]);

    zipArchive.directory(srcFolder, false);

    zipArchive.finalize(function(err, bytes) {
        if(err) {
            callback(err);
        }
    });
}

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
                        message: 'Record user(' + user + ') login'
                    });
                    // console.log('successfully insert '+result.insertId+' row in `site_statistics` table');
                    // console.log('INSERT INTO site_statistics ( event,type,user_id,owner_id,timestamp,created_at,updated_at)');
                    // console.log('VALUES ('+event+', '+eventType+', '+user+', '+'null'+', '+'NOW()'+', '+'NOW()'+', '+'NOW());');
                    connection.release();
                });
        });
    }
    if(type=='Study')
    {
        let event = 'Study Download';
        let eventType = 'Site::StudyDownloadEvent';
        mysqlcon.getConnection((err,connection)=>{
            if(err) throw err;
            var query = connection.query("INSERT INTO site_statistics ( event,type,user_id,owner_id,timestamp,created_at,updated_at) \
                VALUES (?,?,?,null,NOW(),NOW(),NOW())",
                [event,eventType,user],
                function(err,result){
                    if(err) throw err;
                    logger.info({
                        level: 'info',
                        message: 'Record user(' + user + ') download a study'
                    });
                    // console.log('successfully insert '+result.insertId+' row in `site_statistics` table');
                    // console.log('INSERT INTO site_statistics ( event,type,user_id,owner_id,timestamp,created_at,updated_at)');
                    // console.log('VALUES ('+event+', '+eventType+', '+user+', '+'null'+', '+'NOW()'+', '+'NOW()'+', '+'NOW());');
                    connection.release();
                });
        });
    }
    if(type=='Experiment')
    {
        let event = 'Experiment Download';
        let eventType = 'Site::ExperimentDownloadEvent';
        mysqlcon.getConnection((err,connection)=>{
            if(err) throw err;
            var query = connection.query("INSERT INTO site_statistics ( event,type,user_id,owner_id,timestamp,created_at,updated_at) \
                VALUES (?,?,?,null,NOW(),NOW(),NOW())",
                [event,eventType,user],
                function(err,result){
                    if(err) throw err;
                    logger.info({
                        level: 'info',
                        message: 'Record user(' + user + ') download an experiment'
                    });
                    // console.log('successfully insert '+result.insertId+' row in `site_statistics` table');
                    // console.log('INSERT INTO site_statistics ( event,type,user_id,owner_id,timestamp,created_at,updated_at)');
                    // console.log('VALUES ('+event+', '+eventType+', '+user+', '+'null'+', '+'NOW()'+', '+'NOW()'+', '+'NOW());');
                    connection.release();
                });
        });
    }
    if(type=='Series')
    {
        let event = 'Series Download';
        let eventType = 'Site::SeriesDownloadEvent';
        mysqlcon.getConnection((err,connection)=>{
            if(err) throw err;
            var query = connection.query("INSERT INTO site_statistics ( event,type,user_id,owner_id,timestamp,created_at,updated_at) \
                VALUES (?,?,?,null,NOW(),NOW(),NOW())",
                [event,eventType,user],
                function(err,result){
                    if(err) throw err;
                    logger.info({
                        level: 'info',
                        message: 'Record user(' + user + ') download a series'
                    });
                    // console.log('successfully insert '+result.insertId+' row in `site_statistics` table');
                    // console.log('INSERT INTO site_statistics ( event,type,user_id,owner_id,timestamp,created_at,updated_at)');
                    // console.log('VALUES ('+event+', '+eventType+', '+user+', '+'null'+', '+'NOW()'+', '+'NOW()'+', '+'NOW());');
                    connection.release();
                });
        });
    }
}



router.get('/api/v1/projects_overview',isAuth,(req,res,next)=>{   //isAuth

    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') GET `/api/v1/projects_overview`'
    });
    /*
        Testing params
    */
    //var LoginUserId = 4;
    // console.log(req.session);
    var LoginUserId = req.session.user_id[0];
    // console.log(LoginUserId);
    /*
        Query projects
    */

    var results=[];
    if(req.session.group_id.includes(7)){
        mysqlcon.getConnection((err,connection)=>{
            if(err) throw err;
            //FOR mariadb 10.2.8
            var query = connection.query("SELECT nci_projects_created_at, nci_projects_id, \
                                          nci_projects_name, nci_projects_pi_id, Pi_First_name, \
                                          Pi_Last_name, number_of_experiments, number_of_studies, \
                                          projects_status, number_of_images, GROUP_CONCAT(short_name) AS short_name, \
                                          GROUP_CONCAT(protocol_category_id) AS protocol_category_id \
                                          FROM (SELECT t5.*, nci_protocol_categories.short_name \
                                          FROM(SELECT t4.*, nci_protocols.protocol_category_id \
                                          FROM(SELECT t3.*,COUNT(imaging_experiments.title) AS number_of_experiments, \
                                          SUM(IFNULL(imaging_experiments.number_of_studies,0)) AS number_of_studies, \
                                          SUM(IFNULL(imaging_experiments.number_of_images,0)) AS number_of_images \
                                          FROM(SELECT t2.*, site_users.last_name AS Pi_Last_name, \
                                          site_users.first_name AS Pi_First_name \
                                          FROM(SELECT nci_projects.id AS nci_projects_id, \
                                          nci_projects.name AS nci_projects_name, nci_projects.pi_id AS nci_projects_pi_id, \
                                          status AS projects_status, created_at AS nci_projects_created_at \
                                          FROM nci_projects) as t2 \
                                          LEFT JOIN site_users ON t2.nci_projects_pi_id=site_users.id) as t3 \
                                          LEFT JOIN imaging_experiments ON t3.nci_projects_id =imaging_experiments.project_id GROUP BY t3.nci_projects_id) as t4 \
                                          LEFT JOIN nci_protocols ON t4.nci_projects_id=nci_protocols.project_id) as t5 \
                                          LEFT JOIN nci_protocol_categories ON t5.protocol_category_id=nci_protocol_categories.id) AS t6 GROUP BY nci_projects_id;");
            //FOR MySQL
            //var query = connection.query("SELECT nci_projects_created_at,nci_projects_id, nci_projects_name, nci_projects_pi_id, Pi_First_name, Pi_Last_name, number_of_experiments, number_of_studies, projects_status, number_of_images, JSON_ARRAYAGG(short_name) AS short_name FROM (SELECT t5.*, nci_protocol_categories.short_name FROM(SELECT t4.*, nci_protocols.protocol_category_id FROM(SELECT t3.*,COUNT(imaging_experiments.title) AS number_of_experiments, SUM(IFNULL(imaging_experiments.number_of_studies,0)) AS number_of_studies, SUM(IFNULL(imaging_experiments.number_of_images,0)) AS number_of_images FROM(SELECT t2.*, site_users.last_name AS Pi_Last_name, site_users.first_name AS Pi_First_name FROM(SELECT nci_projects.id AS nci_projects_id,nci_projects.name AS nci_projects_name,nci_projects.pi_id AS nci_projects_pi_id,status AS projects_status, created_at AS nci_projects_created_at  FROM nci_projects) as t2 LEFT JOIN site_users ON t2.nci_projects_pi_id=site_users.id) as t3 LEFT JOIN imaging_experiments ON t3.nci_projects_id =imaging_experiments.project_id GROUP BY t3.nci_projects_id) as t4 LEFT JOIN nci_protocols ON t4.nci_projects_id=nci_protocols.project_id) as t5 LEFT JOIN nci_protocol_categories ON t5.protocol_category_id=nci_protocol_categories.id) AS t6 GROUP BY nci_projects_id;");//SELECT nci_projects_id, nci_projects_name, nci_projects_pi_id, Pi_First_name, Pi_Last_name, number_of_studies, number_of_images, JSON_ARRAYAGG(short_name) AS short_name FROM (SELECT t5.*, nci_protocol_categories.short_name FROM(SELECT t4.*, nci_protocols.protocol_category_id FROM(SELECT t3.*, SUM(IFNULL(imaging_experiments.number_of_studies,0)) AS number_of_studies, SUM(IFNULL(imaging_experiments.number_of_images,0)) AS number_of_images FROM(SELECT t2.*, site_users.last_name AS Pi_Last_name, site_users.first_name AS Pi_First_name FROM(SELECT nci_projects.id AS nci_projects_id,nci_projects.name AS nci_projects_name,nci_projects.pi_id AS nci_projects_pi_id FROM nci_projects) as t2 LEFT JOIN site_users ON t2.nci_projects_pi_id=site_users.id) as t3 LEFT JOIN imaging_experiments ON t3.nci_projects_id =imaging_experiments.project_id GROUP BY t3.nci_projects_id) as t4 LEFT JOIN nci_protocols ON t4.nci_projects_id=nci_protocols.project_id) as t5 LEFT JOIN nci_protocol_categories ON t5.protocol_category_id=nci_protocol_categories.id) AS t6 GROUP BY nci_projects_id;");            
            query.on('result',(row)=>{
                    results.push(row);
            });
            query.on('end',()=>{
                    connection.release();
                    return res.json(results);
            });
        });
    }else{
        mysqlcon.getConnection((err,connection)=>{
            if(err) throw err;
            //FOR mariadb 10.2.8
            var query = connection.query("SELECT nci_projects_created_at,Login_user, projects_status ,nci_projects_id, nci_projects_name, nci_projects_pi_id, Pi_First_name, Pi_Last_name,number_of_experiments, number_of_studies, number_of_images, GROUP_CONCAT(short_name) AS short_name FROM (SELECT t5.*, nci_protocol_categories.short_name FROM(SELECT t4.*, nci_protocols.protocol_category_id FROM(SELECT t3.*, COUNT(imaging_experiments.title) AS number_of_experiments, SUM(IFNULL(imaging_experiments.number_of_studies,0)) AS number_of_studies, SUM(IFNULL(imaging_experiments.number_of_images,0)) AS number_of_images FROM(SELECT t2.*, site_users.last_name AS Pi_Last_name, site_users.first_name AS Pi_First_name FROM(SELECT status AS projects_status, t1.project_users_user_id AS Login_user, nci_projects.id AS nci_projects_id,nci_projects.name AS nci_projects_name,nci_projects.pi_id AS nci_projects_pi_id,nci_projects.created_at AS nci_projects_created_at FROM (SELECT id AS project_users_id,project_id AS project_users_project_id,user_id AS project_users_user_id,permissions AS project_users_permissions FROM nci_project_users WHERE user_id = "+LoginUserId+") as t1 LEFT JOIN nci_projects ON t1.project_users_project_id=nci_projects.id WHERE status= 'A') as t2 LEFT JOIN site_users ON t2.nci_projects_pi_id=site_users.id) as t3 LEFT JOIN imaging_experiments ON t3.nci_projects_id =imaging_experiments.project_id GROUP BY t3.nci_projects_id) as t4 LEFT JOIN nci_protocols ON t4.nci_projects_id=nci_protocols.project_id) as t5 LEFT JOIN nci_protocol_categories ON t5.protocol_category_id=nci_protocol_categories.id) AS t6 GROUP BY nci_projects_id;");
            //FOR MySQL
            //var query = connection.query("SELECT nci_projects_created_at,Login_user, projects_status ,nci_projects_id, nci_projects_name, nci_projects_pi_id, Pi_First_name, Pi_Last_name, number_of_studies, number_of_experiments,number_of_images, JSON_ARRAYAGG(short_name) AS short_name FROM (SELECT t5.*, nci_protocol_categories.short_name FROM(SELECT t4.*, nci_protocols.protocol_category_id FROM(SELECT t3.*, COUNT(imaging_experiments.title) AS number_of_experiments, SUM(IFNULL(imaging_experiments.number_of_studies,0)) AS number_of_studies, SUM(IFNULL(imaging_experiments.number_of_images,0)) AS number_of_images FROM(SELECT t2.*, site_users.last_name AS Pi_Last_name, site_users.first_name AS Pi_First_name FROM(SELECT status AS projects_status, t1.project_users_user_id AS Login_user, nci_projects.id AS nci_projects_id,nci_projects.name AS nci_projects_name,nci_projects.pi_id AS nci_projects_pi_id, nci_projects.created_at AS nci_projects_created_at FROM (SELECT id AS project_users_id,project_id AS project_users_project_id,user_id AS project_users_user_id,permissions AS project_users_permissions FROM nci_project_users WHERE user_id = "+LoginUserId+") as t1 LEFT JOIN nci_projects ON t1.project_users_project_id=nci_projects.id WHERE status= 'A') as t2 LEFT JOIN site_users ON t2.nci_projects_pi_id=site_users.id) as t3 LEFT JOIN imaging_experiments ON t3.nci_projects_id =imaging_experiments.project_id GROUP BY t3.nci_projects_id) as t4 LEFT JOIN nci_protocols ON t4.nci_projects_id=nci_protocols.project_id) as t5 LEFT JOIN nci_protocol_categories ON t5.protocol_category_id=nci_protocol_categories.id) AS t6 GROUP BY nci_projects_id;");
            query.on('result',(row)=>{
                    results.push(row);
            });
            query.on('end',()=>{
                    connection.release();
                    return res.json(results);
            });
        });
    }
});

router.get('/api/v1/project/:project_id',isAuth,(req,res,next)=>{   //isAuth
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') GET `/api/v1/project/' + req.params.project_id + '`'
    });
    /*
        Testing params
    */
    var selected_project = req.params.project_id;
    /*
        Query project
    */
    /*
        validation for random project query is need for user who does not have access to that project
    */
    var results=[];
    mysqlcon.getConnection((err,connection)=>{
        if(err) throw err;
        //FOR mariadb10.2.8
        var query = connection.query("SELECT last_name,first_name, nci_project_pi_id,nci_project_id, nci_project_name, authors, requester, collaborator, collab_grant_num, SRAC_number, SRAC_file, status, proposal, est_costs, fund_project_id, disease_id, organ_id, process_id, mouse_id, probe_id, GROUP_CONCAT(nci_protocols_number_of_objects) AS number_of_objects, GROUP_CONCAT(nci_protocols_studies_per_object) AS studies_per_object, GROUP_CONCAT(nci_protocols_hours_per_study) AS hours_per_study, GROUP_CONCAT(name) AS name, GROUP_CONCAT(short_name) AS short_name, GROUP_CONCAT(nci_protocols_id) AS protocols_id, GROUP_CONCAT(protocol_category_id) AS protocol_category_id FROM(SELECT t3.*, nci_protocol_categories.name, nci_protocol_categories.short_name FROM(SELECT site_users.last_name, site_users.first_name, t2.* FROM(SELECT t1.*, nci_protocols.id AS nci_protocols_id, nci_protocols.protocol_category_id AS protocol_category_id, nci_protocols.project_id AS nci_protocols_project_id, nci_protocols.number_of_objects AS nci_protocols_number_of_objects, nci_protocols.studies_per_object AS nci_protocols_studies_per_object, nci_protocols.hours_per_study AS nci_protocols_hours_per_study From (SELECT id AS nci_project_id,name AS nci_project_name,pi_id AS nci_project_pi_id,authors,requester,collaborator,collab_grant_num,SRAC_number,SRAC_file,status,proposal,est_costs,fund_project_id, disease_id, organ_id, process_id, mouse_id, probe_id FROM nci_projects WHERE id = "+selected_project+") as t1 LEFT JOIN nci_protocols ON t1.nci_project_id=nci_protocols.project_id) as t2 LEFT JOIN site_users ON t2.nci_project_pi_id = site_users.id) AS t3 LEFT JOIN nci_protocol_categories ON t3.protocol_category_id=nci_protocol_categories.id) AS t4 GROUP BY nci_project_id;");
        //FOR MySQL
        //var query = connection.query("SELECT last_name,first_name, nci_project_pi_id,nci_project_id, nci_project_name, authors, requester, collaborator, collab_grant_num, SRAC_number, SRAC_file, status, proposal, est_costs, fund_project_id, disease_id, organ_id, process_id, mouse_id, probe_id, JSON_ARRAYAGG(nci_protocols_number_of_objects) AS number_of_objects, JSON_ARRAYAGG(nci_protocols_studies_per_object) AS studies_per_object, JSON_ARRAYAGG(nci_protocols_hours_per_study) AS hours_per_study, JSON_ARRAYAGG(name) AS name, JSON_ARRAYAGG(short_name) AS short_name, JSON_ARRAYAGG(nci_protocols_id) AS protocols_id, JSON_ARRAYAGG(protocol_category_id) AS protocol_category_id FROM(SELECT t3.*, nci_protocol_categories.name, nci_protocol_categories.short_name FROM(SELECT site_users.last_name, site_users.first_name, t2.* FROM(SELECT t1.*, nci_protocols.id AS nci_protocols_id, nci_protocols.protocol_category_id AS protocol_category_id, nci_protocols.project_id AS nci_protocols_project_id, nci_protocols.number_of_objects AS nci_protocols_number_of_objects, nci_protocols.studies_per_object AS nci_protocols_studies_per_object, nci_protocols.hours_per_study AS nci_protocols_hours_per_study From (SELECT id AS nci_project_id,name AS nci_project_name,pi_id AS nci_project_pi_id,authors,requester,collaborator,collab_grant_num,SRAC_number,SRAC_file,status,proposal,est_costs,fund_project_id, disease_id, organ_id, process_id, mouse_id, probe_id FROM nci_projects WHERE id = "+selected_project+") as t1 LEFT JOIN nci_protocols ON t1.nci_project_id=nci_protocols.project_id) as t2 LEFT JOIN site_users ON t2.nci_project_pi_id = site_users.id) AS t3 LEFT JOIN nci_protocol_categories ON t3.protocol_category_id=nci_protocol_categories.id) AS t4 GROUP BY nci_project_id;");
                query.on('result',(row)=>{
                results.push(row);
        });
        query.on('end',()=>{
                connection.release();
                return res.json(results);
        });
    });
});
router.get('/api/v1/project_users/:project_id',isAuth,(req,res,next)=>{
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') GET `/api/v1/project_users/' + req.params.project_id + '`'
    });
    var selected_project_id = req.params.project_id;
    var results=[];
    mysqlcon.getConnection((err,connection)=>{
        if(err) throw err;
        var query = connection.query("SELECT project_id,user_id,last_name,first_name,permissions FROM(SELECT * FROM nci_project_users WHERE project_id="+selected_project_id+") AS t1 LEFT JOIN site_users ON t1.user_id= site_users.id;");        
        query.on('result',(row)=>{
                results.push(row);
        });
        query.on('end',()=>{
                connection.release();
                return res.json(results);
        });
    });
});
router.post('/api/v1/project_add',isAdmin,(req,res,next)=>{  //isAdmin
    /*
        Testing params
    */
    //console.log('hello');
    //console.log(req.files.SRAC_file)
    
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') POST `/api/v1/project_add`'
    });
    req.body.name = req.body.name;
    req.body.pi_id = req.body.pi_id;
    req.body.status = req.body.status;
    req.body.proposal = req.body.proposal;
    req.body.requester = req.body.requester;
    //req.body.user_id = [22,4];
    //req.body.permissions = ["R","RW"];
    req.body.protocol_category_id = JSON.parse(req.body.protocol_category_id);
    req.body.users_and_permissions = JSON.parse(req.body.users_and_permissions);
    req.body.project_protocols_names = JSON.parse(req.body.project_protocols_names);

    // console.log(req.body)
    // console.log(req.files)
    req.checkBody('name','Project name cannot be empty').notEmpty();
    req.checkBody('name','Project name should be a string<varchar(127)>').isString();
    req.checkBody('pi_id','Pi id cannot be empty').notEmpty();
    req.checkBody('pi_id','Pi id should be an integer<int(11)>').isInt();
    req.checkBody('status','Status cannot be empty').notEmpty();
    req.checkBody('status','Status should be a string<varchar(1)>').isLength({ max: 1 });
    // req.checkBody('proposal','Proposal cannot be empty').notEmpty();
    // req.checkBody('proposal','Proposal should be a string<text>').isString();
    // req.checkBody('requester','Project name cannot be empty').notEmpty();
    // req.checkBody('requester','Project name should be a string<varchar(255)>').isString();
    req.checkBody('protocol_category_id','protocol category id cannot be empty').notEmpty();
    req.checkBody('protocol_category_id','protocol category id should be an array with integer').isArrayOfInt();

    var errors = req.validationErrors();

    if(errors){
        return res.json({'err':1,errors});
    }
    else{
        for(let a=0;a<req.body.protocol_category_id.length;a++){
            req.body.protocol_category_id[a] = parseInt(req.body.protocol_category_id[a]);
        }
        req.body.protocol_category_id = req.body.protocol_category_id||[2,1];


        let name = req.body.name;
        let pi_id = req.body.pi_id;
        let authors = req.body.authors||'';
        let collaborator = req.body.collaborator||'';
        let collab_grant_num = req.body.collab_grant_num||'';
        let fund_project_id = req.body.fund_project_id||null;
        let SRAC_number = req.body.SRAC_number||'';
        let SRAC_file = '';
        if(req.files){
            SRAC_file = req.files.SRAC_file.name;
        }

        let status = req.body.status;
        let proposal = req.body.proposal||'-';
        let est_costs = req.body.est_costs||0;
        let disease_id = req.body.disease_id||null;
        let organ_id = req.body.organ_id||null;
        let process_id = req.body.process_id||null;
        let mouse_id = req.body.mouse_id||null;
        let probe_id = req.body.probe_id||null;
        let suggested_funding = req.body.suggested_funding||null;
        let requester = req.body.requester||'-';
        let miportal_id = req.body.miportal_id||null;
        let studies_per_object = req.body.studies_per_object||0;
        let number_of_objects = req.body.number_of_objects||0;
        let users_and_permissions = req.body.users_and_permissions||null;
        let permissions = [];
        let user_id = [];
        let uniqueUser_id;
        for(let a=0;a<users_and_permissions.length;a++){
            if(users_and_permissions[a].match(/\d+/)[0]==uniqueUser_id){
                 permissions[user_id.indexOf(uniqueUser_id)] = 'RW'
            }
            else{
                uniqueUser_id=users_and_permissions[a].match(/\d+/)[0]
                permissions.push(users_and_permissions[a].match(/\w/)[0]);
                user_id.push(users_and_permissions[a].match(/\d+/)[0]);
            }
            
        }
        //let permissions = req.query.permissions||'R';   //need to modify
        let project_protocols_names = req.body.project_protocols_names||null;
        let protocol_category_id = req.body.protocol_category_id;

        async.waterfall([
            function(callback) {
                //
                //    Add project for particular users
                //
                mysqlcon.getConnection((err,connection)=>{
                    if(err) throw err;
                    var query = connection.query("INSERT INTO nci_projects ( name, pi_id, \
                        authors, collaborator, collab_grant_num, fund_project_id, SRAC_number, \
                        SRAC_file, status, proposal, est_costs, disease_id, organ_id, process_id, \
                        number_of_objects, studies_per_object, mouse_id, probe_id, suggested_funding, \
                        requester, created_at, updated_at, miportal_id) \
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW(),?)",
                        [name,pi_id,authors,collaborator,collab_grant_num,fund_project_id,SRAC_number,SRAC_file,
                        status,proposal,est_costs,disease_id,organ_id,process_id,number_of_objects,studies_per_object,
                        mouse_id,probe_id,suggested_funding,requester,miportal_id],
                        function(err,result){
                            if(err) throw err;

                            logger.info({
                                level: 'info',
                                message: req.session.FirstName + ' ' + req.session.LastName
                                + '(' + req.session.user_id[0] + ') successfully insert '+result.insertId+' row in `nci_projects` table'
                            });
                            // console.log('successfully insert '+result.insertId+' row in `nci_projects` table');
                            // console.log('INSERT INTO nci_projects ( name, pi_id, authors, collaborator, collab_grant_num, fund_project_id, SRAC_number, SRAC_file, status, proposal, est_costs, disease_id, organ_id, process_id, number_of_objects, studies_per_object, mouse_id, probe_id, suggested_funding, requester, created_at, updated_at, miportal_id)');
                            // console.log('VALUES ('+name+', '+pi_id+', '+authors+', '+collaborator+', '+collab_grant_num+', '+fund_project_id+', '+SRAC_number+', '+SRAC_file+', '+status+', '+proposal+', '+est_costs+', '+disease_id+', '+organ_id+', '+process_id+', '+number_of_objects+', '+studies_per_object+', '+mouse_id+', '+probe_id+', '+suggested_funding+', '+requester+', NOW(), NOW(), '+miportal_id+');');
                            connection.release();
                            callback(null, result.insertId);
                        });
                });
            },
            function(arg1, callback) {

                mysqlcon.getConnection((err,connection)=>{
                    if(err) throw err;
                    //
                    //    Insert corresponding protocols
                    //
                    var project_protocols_namesArray=[];
                    for(let a=0;a<project_protocols_names.length;a++){
                        project_protocols_namesArray[a] = project_protocols_names[a]+'-'+arg1+' '+name
                    }
                    var protocol_queryArray=[];
                    var created = new Date();
                    for(let a=0;a<protocol_category_id.length;a++){
                            protocol_queryArray[a]=[arg1,project_protocols_namesArray[a],protocol_category_id[a],number_of_objects,studies_per_object,1,created,created];
                        }
                    var query = connection.query("INSERT INTO nci_protocols (project_id, protocol_name, \
                        protocol_category_id, number_of_objects, studies_per_object,hours_per_study,created_at, updated_at) VALUES \
                        ?",[protocol_queryArray],function(err,result){
                            if(err) throw err;
                            logger.info({
                                level: 'info',
                                message: req.session.FirstName + ' ' + req.session.LastName
                                + '(' + req.session.user_id[0] + ') successfully insert '+result.insertId+' row in `nci_protocols` table'
                            });
                            // console.log('successfully insert '+result.insertId+' row in `nci_protocols` table');
                            // console.log('INSERT INTO nci_protocols (project_id, protocol_name, protocol_category_id, number_of_objects, studies_per_object,hours_per_study,created_at, updated_at)');
                            // console.log('VALUES ('+arg1+', ['+project_protocols_names+'], ['+protocol_category_id+'], '+number_of_objects+', '+studies_per_object+', 1, NOW(), NOW() '+');');
                        });

                    //
                    //   Upload files 
                    //
                    if(req.files){
                        // console.log('uploading');
                        //FOR mariadb10.2.8
                        fs.mkdir(__dirname+'/tmpFile/'+arg1,0o755, function(err){
                        //fs.mkdir('/Users/miaot2/html_learning/SAIP/Backend/tmpFile/'+arg1,0o755, function(err){
                            if(err) {
                                logger.error({
                                    level: 'error',
                                    message: err
                                })
                                // console.log('what is wrong????');
                                throw err;
                            }
                            //FOR mariadb10.2.8
                            req.files.SRAC_file.mv(__dirname+'/tmpFile/'+arg1+'/'+SRAC_file, function(err) {
                            //req.files.SRAC_file.mv('/Users/miaot2/html_learning/SAIP/Backend/tmpFile/'+arg1+'/'+SRAC_file, function(err) {
                                if (err)
                                {   
                                    logger.error({
                                        level: 'error',
                                        message: err
                                    })
                                    return res.status(500).send(err);
                                }
                                var query = connection.query("INSERT INTO nci_project_document (project_id,doc_name) VALUES (?,?)",[arg1,SRAC_file],function(err,result){
                                    if(err) {
                                        throw err; 
                                    }
                                    logger.info({
                                        level: 'info',
                                        message: req.session.FirstName + ' ' + req.session.LastName
                                        + '(' + req.session.user_id[0] + ') successfully insert '+result.insertId+' row in `nci_project_document` table'
                                    });
                                    // console.log('successfully insert '+result.insertId+' row in `nci_project_document` table');
                                    // console.log('INSERT INTO nci_project_document (project_id,doc_name, created_at, updated_at');
                                    // console.log('VALUES ('+arg1+', '+SRAC_file+', NOW(), NOW());');
                                });
                            });
                        })
                        
                    }
                    //
                    //   Insert PI and corresponding users
                    //
                    var query = connection.query("INSERT INTO nci_project_users (project_id, user_id, \
                        permissions, created_at, updated_at) VALUES (?,?,?,NOW(),NOW())",[arg1,pi_id,'RW'],
                        function(err,result){
                            if(err) throw err;
                            logger.info({
                                level: 'info',
                                message: req.session.FirstName + ' ' + req.session.LastName
                                + '(' + req.session.user_id[0] + ') successfully insert '+result.insertId+' row in `nci_project_users` table'
                            });
                            // console.log('successfully insert '+result.insertId+' row in `nci_project_users` table');
                            // console.log('INSERT INTO nci_project_users (project_id, user_id, permissions, created_at, updated_at');
                            // console.log('VALUES ('+arg1+', ['+user_id+'], ['+permissions+'], NOW(), NOW());');
                        });
                    if(user_id.length){
                        var queryArray=[];
                        var created = new Date();
                        for(let a=0;a<user_id.length;a++){
                            queryArray[a]=[arg1,user_id[a],permissions[a],created,created];
                        }
                        // console.log(queryArray);
                        var query = connection.query("INSERT INTO nci_project_users (project_id, user_id, \
                        permissions, created_at, updated_at) VALUES ?",[queryArray],
                        function(err,result){
                            if(err) throw err;
                            logger.info({
                                level: 'info',
                                message: req.session.FirstName + ' ' + req.session.LastName
                                + '(' + req.session.user_id[0] + ') successfully insert '+result.insertId+' row in `nci_project_users` table'
                            });
                            // console.log('successfully insert '+result.insertId+' row in `nci_project_users` table');
                            // console.log('INSERT INTO nci_project_users (project_id, user_id, permissions, created_at, updated_at');
                            // console.log('VALUES ('+arg1+', ['+user_id+'], ['+permissions+'], NOW(), NOW());');
                            connection.release();
                            callback(null, 'Project id '+arg1+' is ['+permissions+'] for user(s) ['+ user_id+'], Project protocols are ['+project_protocols_names+'] with id ['+ protocol_category_id+']');
                        });
                    }
                    else{
                        connection.release();
                        callback(null, 'Project id '+arg1+' is for no one, Project protocols are ['+project_protocols_names+'] with id ['+ protocol_category_id+']');
                    }
                });
            }
        ], function (err, result) {
            return res.json({'err':0,result});
        });
        
    }
});
router.post('/api/v1/project_add_users',isAdmin,(req,res,next)=>{
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') POST `/api/v1/project_add_users`'
    });
    req.checkBody('project_id','Project id cannot be empty').notEmpty();
    req.checkBody('project_id','Project id should be an integer').isInt();
    req.body.users_and_permissions = JSON.parse(req.body.users_and_permissions);

    let project_id = req.body.project_id||null;
    let users_and_permissions = req.body.users_and_permissions||null;
    var errors = req.validationErrors();

    if(errors){
        return res.json({'err':1,errors});
    }
    else{
    
        let permissions = [];
        let user_id = [];
        let uniqueUser_id;
        for(let a=0;a<users_and_permissions.length;a++){
            if(users_and_permissions[a].match(/\d+/)[0]==uniqueUser_id){
                 permissions[user_id.indexOf(uniqueUser_id)] = 'RW'
            }
            else{
                uniqueUser_id=users_and_permissions[a].match(/\d+/)[0]
                permissions.push(users_and_permissions[a].match(/\w/)[0]);
                user_id.push(users_and_permissions[a].match(/\d+/)[0]);
            }
            
        }
        // console.log(project_id);
        // console.log(user_id);
        // console.log(permissions);
    
        if(user_id.length){
            async.waterfall([
                function(callback){
                    let results=[];
                    ///Get rid of same users in project
                    mysqlcon.getConnection((err,connection)=>{
                        if(err) throw err;
                        var query = connection.query("SELECT user_id FROM nci_project_users WHERE project_id= ?",[project_id]);
                        query.on('result',(row)=>{
                                    results.push(row['user_id']);
                        });
                        query.on('end',()=>{
                                // console.log(results);
                                connection.release();
                                callback(null,results);
                        });
                    });
                },function(arg,callback){
                        var queryArray=[];
                        var created = new Date();
                        for(let a=0;a<user_id.length;a++){
                            if(arg.includes(parseInt(user_id[a])))
                            {
                                console.log('already has user '+user_id[a]+' in project '+project_id);
                            }else{
                                queryArray.push([project_id,user_id[a],permissions[a],created,created]);
                            }
                        }
                        // console.log(queryArray);
                        if(queryArray.length){
                            let new_user_id=[];
                            let new_permissions=[];
                            for(let a=0;a<queryArray.length;a++){
                                new_user_id.push(queryArray[a][1])
                                new_permissions.push(queryArray[a][2])
                                // console.log(queryArray[a][1])
                            }
                            
                            mysqlcon.getConnection((err,connection)=>{
                                var query = connection.query("INSERT INTO nci_project_users (project_id, user_id, \
                                permissions, created_at, updated_at) VALUES ?",[queryArray],
                                function(err,result){
                                    if(err) throw err;
                                    logger.info({
                                        level: 'info',
                                        message: req.session.FirstName + ' ' + req.session.LastName
                                        + '(' + req.session.user_id[0] + ') successfully insert '+result.insertId+' row in `nci_project_users` table'
                                    });
                                    // console.log('successfully insert '+result.insertId+' row in `nci_project_users` table');
                                    // console.log('INSERT INTO nci_project_users (project_id, user_id, permissions, created_at, updated_at');
                                    // console.log('VALUES ('+project_id+', ['+new_user_id+'], ['+new_permissions+'], NOW(), NOW());');
                                    connection.release();
                                    callback(null,{'err':0, 'msg':'Project id '+project_id+' adds user(s) ['+ new_user_id+'] with permission(s) ['+new_permissions+']'});
                                });
                            });
                        }else{
                            callback(null,{'err':1, 'msg':'No new user added (already exit)'});
                        }
                        
                }],function(err,result){
                    return res.json(result);
                });
        }
    }
});
router.post('/api/v1/project_status',isAdmin,(req,res,next)=>{
    /*
        remove project from particular users
    */
    // console.log(req.body)
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') POST `/api/v1/project_status`'
    });
    req.checkBody('project_id','Project id cannot be empty').notEmpty();
    req.checkBody('project_id','Project id should be an integer<int(11)>').isInt();
    req.checkBody('project_status','project status cannot be empty').notEmpty();
    req.checkBody('project_status','project status should be a string<varchar(255)>').isString();
    var errors = req.validationErrors();
    if(errors){
        console.log(errors);
    }
    else{
        let project_id = parseInt(req.body.project_id);
        let project_status = req.body.project_status;
        let results=[];
        // console.log("UPDATE nci_projects SET status='"+project_status+"' WHERE id="+project_id+";");
        // console.log(typeof(project_status));
        // console.log(typeof(project_id));
        mysqlcon.getConnection((err,connection)=>{
            if(err) throw err;
            var query = connection.query("UPDATE nci_projects SET status=? WHERE id=?",[project_status,project_id]);
            query.on('result',(row)=>{
                results.push(row);
            });
            query.on('end',()=>{
                logger.info({
                    level: 'info',
                    message: req.session.FirstName + ' ' + req.session.LastName
                    + '(' + req.session.user_id[0] + ') successfully update status="'+project_status+'" WHERE id="'+project_id+'" in `nci_projects` table'
                });
                connection.release();
                return res.json(project_status);
            });
        }); 
        
        
    }
});
router.post('/api/v1/project_permissions',isAdmin,(req,res,next)=>{
    /*
        remove project from particular users
    */
    // console.log(req.body)
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') POST `/api/v1/project_permissions`'
    });
    req.checkBody('project_id','Project id cannot be empty').notEmpty();
    req.checkBody('project_id','Project id should be an integer<int(11)>').isInt();
    req.checkBody('user_id','Project id cannot be empty').notEmpty();
    req.checkBody('user_id','Project id should be an integer<int(11)>').isInt();
    var errors = req.validationErrors();
    if(errors){
        console.log(errors);
    }
    else{
        let project_id = parseInt(req.body.project_id);
        let user_id = parseInt(req.body.user_id);
        let permissions = req.body.permissions;
        let results=[];
        // console.log("UPDATE nci_project_users SET permissions='"+permissions+"',updated_at=NOW() WHERE project_id="+project_id+" AND user_id="+user_id+";");
        //console.log(typeof(permissions));
        //console.log(typeof(project_id));
        mysqlcon.getConnection((err,connection)=>{
            if(err) throw err;
            var query = connection.query("UPDATE nci_project_users SET permissions=?,updated_at=NOW() WHERE project_id=? AND user_id=?",[permissions,project_id,user_id]);
            query.on('result',(row)=>{
                results.push(row);
            });
            query.on('end',()=>{
                logger.info({
                    level: 'info',
                    message: req.session.FirstName + ' ' + req.session.LastName
                    + '(' + req.session.user_id[0] + ') successfully update permissions="'+permissions+'",updated_at=NOW() WHERE project_id="'+project_id+'" AND user_id="'+user_id+'" in `nci_project_users` table'
                });
                connection.release();
                return res.json(results);
            });
        }); 
             
    }
});
router.get('/api/v1/experiments/:project_id',isAuth,(req,res,next)=>{  //isAuth
    /*
        Query experiments
    */
    /*
        Testing params
    */

    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') GET `/api/v1/experiments/' +req.params.project_id+ '`'
    });

    var selected_project =  req.params.project_id;
    /*
        Validation is need to auth user who does not have access to particular project
    */
    var results=[];
    mysqlcon.getConnection((err,connection)=>{
        if(err) throw err;
        var query = connection.query("SELECT id, title, description,number_of_studies, number_of_series,number_of_images, mouse_id, probe_id, updated_at, last_name,first_name FROM(SELECT t1.*, site_users.last_name,site_users.first_name FROM (SELECT * FROM imaging_experiments WHERE project_id = "+selected_project+") as t1 LEFT JOIN site_users ON t1.pi_id=site_users.id) AS t2;");
        query.on('result',(row)=>{
                results.push(row);
        });
        query.on('end',()=>{
                connection.release();
                return res.json(results);
        });
    });
    

});
router.post('/api/v1/experiment_add',isAdmin,(req,res,next)=>{   //isAdmin
    /*
        Add experiment for particular users
    */
    /*
        Testing params
    */

    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') POST `/api/v1/experiment_add`'
    });

    //req.body.project_id = 201;
    //req.body.title = 'Testing';
    //req.body.pi_id = 4;
    //req.query.user_id = [22,4];
    //req.query.permissions = ["R","RW"];

    req.checkBody('project_id','Project id cannot be empty').notEmpty();
    req.checkBody('project_id','Project id should be an integer<int(11)>').isInt();
    req.checkBody('pi_id','Pi id cannot be empty').notEmpty();
    req.checkBody('pi_id','Pi id should be an integer<int(11)>').isInt();
    req.checkBody('title','title cannot be empty').notEmpty();
    req.checkBody('title','title should be a string<varchar(255)>').isString();
    var errors = req.validationErrors();
    if(errors){
        return res.json({'err':1,errors});
    }
    else{
        let project_id = req.body.project_id;
        let title = req.body.title;
        let pi_id = req.body.pi_id;
        // console.log(req.session.user_id)
        let loginUser_id = req.session.user_id[0];
        let start_date = req.body.start_date||null;
        let description = req.body.description||'';
        let number_of_studies = req.body.number_of_studies||0;
        let number_of_series = req.body.number_of_series||0;
        let number_of_images = req.body.number_of_images||0;
        let type = req.body.type||'Nci::Experiment';
        let mouse_id = req.body.mouse_id||null;
        let probe_id = req.body.probe_id||null;
        let miportal_id = req.body.miportal_id||null;


        async.parallel([
            function(callback) {
                /*
                    Add project for particular users
                */
                mysqlcon.getConnection((err,connection)=>{
                    if(err) throw err;
                    var query = connection.query("INSERT INTO imaging_experiments ( project_id, title, pi_id, \
                        start_date, description, number_of_studies, number_of_series, number_of_images, \
                        type, mouse_id, probe_id, created_at, updated_at, miportal_id) \
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW(),?)",
                        [project_id,title,loginUser_id,start_date,description,number_of_studies,number_of_series,number_of_images,
                        type,mouse_id,probe_id,miportal_id],
                        function(err,result){
                            if(err) throw err;
                            logger.info({
                                level: 'info',
                                message: req.session.FirstName + ' ' + req.session.LastName
                                + '(' + req.session.user_id[0] + ') successfully insert '+result.insertId+' row in `imaging_experiments` table'
                            });
                            // console.log('successfully insert '+result.insertId+' row in `imaging_experiments` table');
                            // console.log('INSERT INTO imaging_experiments ( project_id,title,pi_id,start_date,description,number_of_studies,number_of_series,number_of_images,type,mouse_id,probe_id,created_at,updated_at,miportal_id');
                            // console.log('VALUES ('+project_id+', '+title+', '+pi_id+', '+start_date+', '+description+', '+number_of_studies+', '+number_of_series+', '+number_of_images+', '+type+', '+mouse_id+', '+probe_id+', NOW(), NOW(), '+miportal_id+');');
                            connection.release();
                            callback(null, 'Row '+result.insertId+' is inserted in imaging_experiments table');
                        });
                });
            },
            function(callback) {
                mysqlcon.getConnection((err,connection)=>{
                    if(err) throw err;
                    
                    var query = connection.query("UPDATE nci_projects SET updated_at=NOW() WHERE id ="+project_id+";",
                    function(err,result){
                        if(err) throw err;
                        logger.info({
                            level: 'info',
                            message: req.session.FirstName + ' ' + req.session.LastName
                            + '(' + req.session.user_id[0] + ') successfully update '+project_id+' project in `nci_projects` table'
                        });
                        // console.log('successfully update '+result.insertId+' row in `nci_projects` table');
                        // console.log('UPDATE nci_projects SET updated_at=NOW() WHERE id ='+project_id+';');
                        connection.release();
                        callback(null, 'Project ' + project_id + ' is up to date');
                    });
                 
                });
            }
        ], function (err, result) {
            if(err) throw err;
            return res.json({'err': 0, result});
        });
        
    }
});
router.delete('/api/v1/experiment_remove/:experiment_id',isAdmin,(req,res,next)=>{
    /*
        remove experiment from particular users
    */
    logger.warn({
        level: 'warn',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') DELETE `/api/v1/experiment_remove/'+req.params.experiment_id+'`'
    });
    let experiment_id = req.params.experiment_id;
    let results=[];
    async.waterfall([
        function(callback){
            mysqlcon.getConnection((err,connection)=>{
                if(err) throw err;
                
                var query = connection.query("SELECT * FROM imaging_participants WHERE experiment_id =?;",[experiment_id]);
                query.on('result',(row)=>{
                        results.push(row);
                });
                query.on('end',()=>{
                        connection.release();
                        if(results.length){
                            return res.json({'err':1,'error':'You need to delink participants under this experiment first'})
                        }else{
                            callback(null,results)
                        }
                });
            });
        }
    ],function(err,result){
        // console.log('Let remove!!');
        mysqlcon.getConnection((err,connection)=>{
                if(err) throw err;
                
                var query = connection.query("DELETE FROM imaging_experiments WHERE id=?;",[experiment_id],function(err,result){
                        if(err) throw err;
                        connection.release();
                        logger.info({
                            level: 'info',
                            message: req.session.FirstName + ' ' + req.session.LastName
                            + '(' + req.session.user_id[0] + ') successfully DELETE '+experiment_id+' experiment from `imaging_experiments` table'
                        });
                        // console.log('successfully DELETE '+result.insertId+' row from `imaging_experiments` table');
                        return res.json({'err':0,'msg':'Successfully remove a experiment'})
                    })
            });
    })
});


router.get('/api/v1/users_overview',isAdmin,(req,res,next)=>{   //is admin
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

router.post('/api/v1/usersChangePermission',isAdmin,(req,res,next)=>{   //is admin

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

router.post('/api/v1/user_status',isAdmin,(req,res,next)=>{
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

router.put('/api/v1/user_edit', isAdmin, (req,res,next)=>{
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
router.get('/api/v1/mappingAll',isAdmin,(req,res,next)=>{   //isAdmin
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') GET `/api/v1/mappingAll`'
    });
    let allPatients_result=[]
    pg.connect(connectionString,(err,client,done)=>{
        if(err) throw err;
            var query = client.query("SELECT id,pat_name,pat_mrn FROM patients;");
            query.on('row',(row)=>{
                    allPatients_result.push(row);
            });
            query.on('end',()=>{
                    done();
                    return res.json(allPatients_result);
            });
           // client.end();
    });
})
Array.prototype.diff = function(a) {
    return this.filter(function(i) {return a.indexOf(i) < 0;});
};
router.get('/api/v1/mapping',isAdmin,(req,res,next)=>{  //isAdmin
    /*
        Mapping unmapped patients to experiments 
    */
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') GET `/api/v1/mapping`'
    });
    async.parallel([
        function(callback){
            var results_from_Miportal=[];
            mysqlcon.getConnection((err,connection)=>{
                if(err) throw err;
                var query = connection.query('SELECT DISTINCT patient_id FROM imaging_participants');
                
                query.on('result',(row)=>{
                        results_from_Miportal.push(row['patient_id']);
                });
                query.on('end',()=>{
                        connection.release();
                        callback(null,results_from_Miportal);
                });
            });
        },
        function(callback){
            var results_from_Scippy=[];
            pg.connect(connectionString,(err,client,done)=>{
                if(err) throw err;
                var query = client.query("SELECT id FROM patients");
                
                query.on('row',(row)=>{
                        results_from_Scippy.push(row['id']);
                });
                query.on('end',()=>{
                        done();
                        callback(null,results_from_Scippy);
                });
            });
        }
    ],function(err, results){
        if(err) throw err;
        var unmapped=[];
        var unmapped_result=[];
    //    console.log(results_from_Miportal);
        unmapped=results[1].diff(results[0]);
    //    console.log(unmapped);
        if(unmapped.length){
            pg.connect(connectionString,(err,client,done)=>{
                if(err) throw err;
                    var query = client.query("SELECT id,pat_name,pat_mrn FROM patients WHERE id in ("+unmapped+");");
                    query.on('row',(row)=>{
                            unmapped_result.push(row);
                    });
                    query.on('end',()=>{
                            done();
                            return res.json(unmapped_result);
                    });
            });
        }else{
            return res.json({'error':'No more new patients'});
        }
    })
});
router.post('/api/v1/mapping/linkToExp',isAdmin,(req,res,next)=>{   //isAdmin

    logger.warn({
        level: 'warn',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') POST `/api/v1/mapping/linkToExp`'
    });
   // console.log(req.body)
    req.body.experiment_id = req.body.experiment_id;
    req.body.linkedParticipants = JSON.parse(req.body.linkedParticipants);

    req.checkBody('experiment_id','experiment_id cannot be empty').notEmpty();
    req.checkBody('experiment_id','experiment_id should be an integer<int(11)>').isInt();
    req.checkBody('linkedParticipants','linkedParticipants cannot be empty').notEmpty();
    req.checkBody('linkedParticipants','linkedParticipants should be an integer<int(11)> Array').isArrayOfInt();

    let experiment_id = req.body.experiment_id;
    let linkedParticipants = req.body.linkedParticipants;
    var errors = req.validationErrors();

    if(errors){
        return res.json({'err':1,errors});
    }
    else{
        let series_count_result=[];
        let images_count_result=[];
        let studies_count_result=[]; 
        async.waterfall([
            function(callback){
                let results=[];
                ///Get rid of same patient in experiment
                mysqlcon.getConnection((err,connection)=>{
                    if(err) throw err;
                    var query = connection.query("SELECT patient_id FROM imaging_participants WHERE experiment_id= ?",[experiment_id]);
                    query.on('result',(row)=>{
                                results.push(row['patient_id']);
                    });
                    query.on('end',()=>{
                            connection.release();
                            // console.log(results)
                            callback(null,results);
                    });
                });
            },function(arg,callback){
                let created = new Date();
                let linkedParticipantsArray=[];
                let patientsNeedToBeLinkArray=[];

               // console.log(arg)
               // console.log(arg.includes(parseInt(linkedParticipants[0])))
                for(let a=0;a<linkedParticipants.length;a++){
                    let tmpArray=[];
                    
                    if(!arg.includes(parseInt(linkedParticipants[a]))){
                        patientsNeedToBeLinkArray.push(linkedParticipants[a])
                        tmpArray = [experiment_id,linkedParticipants[a],created,created];
                        linkedParticipantsArray.push(tmpArray);
                    }else{
                        console.log('already has patient '+linkedParticipants[a]+' in experiment '+experiment_id);
                    }
                }
                if(linkedParticipantsArray.length){
                    //insert to imaging_participants table
                    // console.log(patientsNeedToBeLinkArray);
                    
                    mysqlcon.getConnection((err,connection)=>{
                    if(err) throw err;
                        var query = connection.query("INSERT INTO imaging_participants ( experiment_id, \
                            patient_id, created_at, updated_at) VALUES ?",[linkedParticipantsArray],function(err,result){
                                if(err) throw err;
                                logger.warn({
                                    level: 'warn',
                                    message: req.session.FirstName + ' ' + req.session.LastName
                                    + '(' + req.session.user_id[0] + ') successfully insert '+result.insertId+' row in `imaging_participants` table`'
                                });
                                // console.log('successfully insert '+result.insertId+' row in `imaging_participants` table');
                                // console.log('INSERT INTO imaging_participants ( experiment_id, patient_id, created_at, updated_at) VALUES ('+experiment_id+',['+linkedParticipants+'],NOW(),NOW());');
                                connection.release();
                                callback(null,patientsNeedToBeLinkArray);
                            });
                    });
                    
                }else{
                    console.log('no new patient need to be added');
                    return res.json({'err':1,msg:'no need to add new entry'});
                }
            },function(arg2,callback){
                pg.connect(connectionString,(err,client,done)=>{
                    if(err) throw err;
                        var query = client.query("SELECT t1.pat_id AS pat_id, count(series.id) AS num_of_series, sum(num_images) AS num_of_images FROM (SELECT id AS studies_id,pat_id FROM studies WHERE pat_id in ("+arg2+")) AS t1 LEFT JOIN series ON studies_id=series.study_id GROUP BY t1.pat_id;");
                        query.on('row',(row)=>{
                                series_count_result.push(row['num_of_series']);
                                images_count_result.push(row['num_of_images']);
                        });
                        query.on('end',()=>{
                                done();
                                callback(null,arg2);
                        //        return res.json(unmapped_result);
                        });
                });
            },function(arg3,callback){
                pg.connect(connectionString,(err,client,done)=>{
                    if(err) throw err;
                        var query = client.query("SELECT pat_id, count(id) AS num_of_studies FROM studies WHERE pat_id in ("+arg3+") GROUP BY pat_id;");
                        query.on('row',(row)=>{
                                studies_count_result.push(row['num_of_studies']);
                        });
                        query.on('end',()=>{
                                done();
                                callback(null,arg3);
                        });
                });
            }
        ],function(err, results){
            let total_studies_count_result=0;
            let total_series_count_result=0;
            let total_images_count_result=0;

            for(let a=0;a<studies_count_result.length;a++){
                total_studies_count_result = total_studies_count_result+parseInt(studies_count_result[a]);
                total_series_count_result = total_series_count_result+parseInt(series_count_result[a]);
                total_images_count_result = total_images_count_result+parseInt(images_count_result[a]);
            }
            // console.log('LINK UPDATE');
            // console.log('total_studies_count_result:');
            // console.log(total_studies_count_result);
            // console.log('total_series_count_result:');
            // console.log(total_series_count_result);
            // console.log('total_images_count_result:');
            // console.log(total_images_count_result);
            mysqlcon.getConnection((err,connection)=>{
            if(err) throw err;
                var query = connection.query("UPDATE imaging_experiments SET number_of_studies=number_of_studies+?,number_of_series=number_of_series+?,number_of_images=number_of_images+? WHERE id=?",
                    [total_studies_count_result,total_series_count_result,total_images_count_result,experiment_id]);
                query.on('result',(row)=>{
                        //results.push(row);
                });
                query.on('end',()=>{
                        connection.release();
                        //return res.json(results);
                        logger.warn({
                            level: 'warn',
                            message: req.session.FirstName + ' ' + req.session.LastName
                            + '(' + req.session.user_id[0] + ') successfully UPDATE imaging_experiments SET number_of_studies=number_of_studies+'+total_studies_count_result+',number_of_series=number_of_series+'+total_series_count_result+',number_of_images=number_of_images+'+total_images_count_result+' WHERE id='+experiment_id
                        });
                        // console.log('Successfully UPDATE the experiment')
                        // console.log('UPDATE imaging_experiments SET number_of_studies=number_of_studies+'+total_studies_count_result+',number_of_series=number_of_series+'+total_series_count_result+',number_of_images=number_of_images+'+total_images_count_result+' WHERE id='+experiment_id)
                        return res.json({'err':0,msg:'Add new entry'});
                });
            }); 
        })
    }
    

});
router.post('/api/v1/mapping/delinkFromExp',isAdmin,(req,res,next)=>{ 
    logger.warn({
        level: 'warn',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') POST `/api/v1/mapping/delinkFromExp`'
    });
    req.body.experiment_id = req.body.experiment_id;
    req.body.delinkedParticipants = JSON.parse(req.body.delinkedParticipants);

    req.checkBody('experiment_id','experiment_id cannot be empty').notEmpty();
    req.checkBody('experiment_id','experiment_id should be an integer<int(11)>').isInt();
    req.checkBody('delinkedParticipants','linkedParticipants cannot be empty').notEmpty();
    req.checkBody('delinkedParticipants','linkedParticipants should be an integer<int(11)> Array').isArrayOfInt();

    let experiment_id = req.body.experiment_id;
    let delinkedParticipants = req.body.delinkedParticipants;
    var errors = req.validationErrors();

    if(errors){
        return res.json({'err':1,errors});
    }
    else{
        let series_count_result=[];
        let images_count_result=[];
        let studies_count_result=[];
        for(let a=0;a<delinkedParticipants.length;a++){
            delinkedParticipants[a]=parseInt(delinkedParticipants[a]);
        }
        async.waterfall([
            function(callback){
                mysqlcon.getConnection((err,connection)=>{
                    if(err) throw err;
                    var query = connection.query("DELETE FROM imaging_participants WHERE experiment_id=? AND patient_id in(?);",[experiment_id,delinkedParticipants],function(err,result){
                        if(err) throw err;
                        logger.warn({
                            level: 'warn',
                            message: req.session.FirstName + ' ' + req.session.LastName
                            + '(' + req.session.user_id[0] + ') successfully DELETE FROM imaging_participants WHERE experiment_id='+experiment_id+' AND patient_id in (['+delinkedParticipants+']);'
                        });
                        // console.log('successfully DELETE '+result.insertId+' row from `imaging_participants` table');
                        // console.log('DELETE FROM imaging_participants WHERE experiment_id='+experiment_id+' AND patient_id in (['+delinkedParticipants+']);');
                        connection.release();
                        callback(null,{'err':0,'msg':'DELETE exited entry'});
                    });
                });
            },
            function(arg,callback){
                pg.connect(connectionString,(err,client,done)=>{
                    if(err) throw err;
                    var query = client.query("SELECT t1.pat_id AS pat_id, count(series.id) AS num_of_series, sum(num_images) AS num_of_images FROM (SELECT id AS studies_id,pat_id FROM studies WHERE pat_id in ("+delinkedParticipants+")) AS t1 LEFT JOIN series ON studies_id=series.study_id GROUP BY t1.pat_id;");
                    query.on('row',(row)=>{
                            series_count_result.push(row['num_of_series']);
                            images_count_result.push(row['num_of_images']);
                    });
                    query.on('end',()=>{
                            done();
                            callback(null,arg);
                    //        return res.json(unmapped_result);
                    });
                });
            },function(arg1,callback){
                pg.connect(connectionString,(err,client,done)=>{
                    if(err) throw err;
                    var query = client.query("SELECT pat_id, count(id) AS num_of_studies FROM studies WHERE pat_id in ("+delinkedParticipants+") GROUP BY pat_id;");
                    query.on('row',(row)=>{
                            studies_count_result.push(row['num_of_studies']);
                    });
                    query.on('end',()=>{
                            done();
                            callback(null,arg1);
                    });
                });
            }
            ],function(err,results){
                let total_studies_count_result=0;
                let total_series_count_result=0;
                let total_images_count_result=0;

                for(let a=0;a<studies_count_result.length;a++){
                    total_studies_count_result = total_studies_count_result+parseInt(studies_count_result[a]);
                    total_series_count_result = total_series_count_result+parseInt(series_count_result[a]);
                    total_images_count_result = total_images_count_result+parseInt(images_count_result[a]);
                }
                // console.log('DELINK UPDATE');
                // console.log('total_studies_count_result:');
                // console.log(total_studies_count_result);
                // console.log('total_series_count_result:');
                // console.log(total_series_count_result);
                // console.log('total_images_count_result:');
                // console.log(total_images_count_result);
                mysqlcon.getConnection((err,connection)=>{
                if(err) throw err;
                    var query = connection.query("UPDATE imaging_experiments SET number_of_studies=number_of_studies-?,number_of_series=number_of_series-?,number_of_images=number_of_images-? WHERE id=?",
                        [total_studies_count_result,total_series_count_result,total_images_count_result,experiment_id]);
                    query.on('result',(row)=>{
                            //results.push(row);
                    });
                    query.on('end',()=>{
                        connection.release();
                        //return res.json(results);
                        logger.warn({
                            level: 'warn',
                            message: req.session.FirstName + ' ' + req.session.LastName
                            + '(' + req.session.user_id[0] + ') successfully UPDATE imaging_experiments SET number_of_studies=number_of_studies-'+total_studies_count_result+',number_of_series=number_of_series-'+total_series_count_result+',number_of_images=number_of_images-'+total_images_count_result+' WHERE id='+experiment_id
                        });
                        // console.log('Successfully UPDATE the experiment')
                        // console.log('UPDATE imaging_experiments SET number_of_studies=number_of_studies-'+total_studies_count_result+',number_of_series=number_of_series-'+total_series_count_result+',number_of_images=number_of_images-'+total_images_count_result+' WHERE id='+experiment_id)
                        return res.json(results);
                    });
                });
            });
        
    }
})
router.get('/api/v1/imaging_participants/:experiment_id',isAuth,(req,res,next)=>{   //isAuth
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') GET `/api/v1/imaging_participants/'+req.params.experiment_id+'`'
    });
    async.waterfall([
        function(callback) {
            mysqlcon.getConnection((err,connection)=>{
                var results_from_Miportal = [];
                if(err) throw err;
                var query = connection.query("SELECT * FROM imaging_participants WHERE experiment_id = "+req.params.experiment_id);
                    query.on('result',(row)=>{
                        results_from_Miportal.push(row['patient_id']);
                    });
                    query.on('end',()=>{
                            connection.release();
          // console.log('yeah')
                            callback(null,results_from_Miportal);
                    });
            });
        },
        function(arg1, callback) {
            // console.log(arg1)
            if (arg1.length)
            {
                var results_from_Scippy=[];
                pg.connect(connectionString,(err,client,done)=>{
                    if(err) throw err;
                        var query = client.query("SELECT t1_id AS pat_id, t1_pat_name AS pat_name, t1_pat_mrn AS pat_mrn, t1_pat_path As pat_path, t2_id AS study_id, t2_studyid AS studyid, t2_mod_time AS study_mod_time, t2_study_description AS study_description, t2_study_path AS study_path, JSON_AGG (t3_series_description) AS series_description, JSON_AGG (t3_series_number) AS series_number, JSON_AGG (t3_modality) AS modality, JSON_AGG (t3_num_images) AS num_images, JSON_AGG (t3_series_path) AS series_path, JSON_AGG(t3_series_uid) AS series_uid FROM(SELECT t2.*,series_description AS t3_series_description,series_number AS t3_series_number, modality AS t3_modality,num_images AS t3_num_images,series_path AS t3_series_path,series_uid AS t3_series_uid FROM (SELECT t1.*,id AS t2_id, studyid AS t2_studyid,mod_time AS t2_mod_time, study_description AS t2_study_description, study_path AS t2_study_path FROM (SELECT id AS t1_id, pat_name AS t1_pat_name, pat_mrn  AS t1_pat_mrn, pat_path AS t1_pat_path FROM patients WHERE id in ("+arg1+")) AS t1 LEFT JOIN studies ON t1.t1_id = studies.pat_id) AS t2 LEFT JOIN series on t2.t2_id=series.study_id) AS t3 GROUP BY t2_id, t2_studyid, t2_mod_time, t2_study_description, t2_study_path, t1_id, t1_pat_name, t1_pat_mrn, t1_pat_path;");                        
                        query.on('row',(row)=>{
                                results_from_Scippy.push(row);
                        });
                        query.on('end',()=>{
                                done();
                                callback(null,results_from_Scippy);
                        });
                });
            }else{
                var no_patient_exist={'error':'no patient exist'}
                callback(null,no_patient_exist);
            }
        }
    ],function(err, results){
        return res.json(results);
    })
});
router.get('/api/v1/experiment_doc/:experiment_id',isAuth,(req,res,next)=>{   //isAuth
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') GET `/api/v1/experiment_doc/'+req.params.experiment_id+'`'
    });
    var selected_exp = req.params.experiment_id;
    var doc_Partition = doc_root+selected_exp;
    var files = [];
    // console.log(doc_Partition);
    // async.waterfall([
    //     function(callback) {
    if (!fs.existsSync(doc_Partition)){
        fs.mkdir(doc_Partition,0o755, function(err){
            fs.readdirSync(doc_Partition).forEach(file=>{
                let stat = fs.statSync(doc_Partition+'/'+file)

                if(file!=='.DS_Store'){
                    obj = {'name':file,
                           'path':doc_Partition+'/'+file,
                           'created':stat.mtime,
                           'size':stat.size
                          }
                    files.push(obj)
                }
            });
        })
    }else{
        fs.readdirSync(doc_Partition).forEach(file=>{
            let stat = fs.statSync(doc_Partition+'/'+file)

            if(file!=='.DS_Store'){
                obj = {'name':file,
                       'path':doc_Partition+'/'+file,
                       'created':stat.mtime,
                       'size':stat.size
                      }
                files.push(obj)
            }
        });
    }
    return res.json(files);
    //        callback(null,files);
    //     }],function(err, results){
    //         return res.json(files);
    // });
});
router.post('/api/v1/experiment_doc/upload',isAuth,(req,res,next)=>{   //isAuth

    logger.warn({
        level: 'warn',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') POST `/api/v1/experiment_doc/upload`'
    });
    req.checkBody('experiment_id','Experiment id cannot be empty').notEmpty();
    req.checkBody('experiment_id','Experiment id should be an integer').isString();

    var errors = req.validationErrors();

    if(errors){
        return res.json({'err':1,errors});
    }
    else{
        let experiment_id = req.body.experiment_id;
        if(req.files){
            let SRAC_file = req.files.SRAC_file.name;
            console.log('uploading');
            //FOR mariadb10.2.8
            if (!fs.existsSync(doc_root+experiment_id)){
            fs.mkdir(doc_root+experiment_id,0o755, function(err){
            //if (!fs.existsSync(doc_root+experiment_id)){
            //    fs.mkdir(doc_root+experiment_id,0o755, function(err){
                    if(err) {
                        throw err;
                    }
                    //FOR mariadb10.2.8
                    req.files.SRAC_file.mv(doc_root+experiment_id+'/'+SRAC_file, function(err) {
                    //req.files.SRAC_file.mv(doc_root+experiment_id+'/'+SRAC_file, function(err) {
                        if (err)
                        {   
                            logger.error({
                                level: 'error',
                                message: req.session.FirstName + ' ' + req.session.LastName
                                + '(' + req.session.user_id[0] + ') fail to Upload a experiment with a file document' + err
                            });
                            return res.status(500).send(err);
                        }
                        
                        if(err) throw err;
                        
                        else{
                            logger.warn({
                                level: 'warn',
                                message: req.session.FirstName + ' ' + req.session.LastName
                                + '(' + req.session.user_id[0] + ') successfully Upload a experiment with a file document'
                            });
                            return res.json({'err':0,'msg':'Upload a experiment with a file document'});
                        }
                        
                    });
                })
            }
            else{
                //FOR mariadb10.2.8
                req.files.SRAC_file.mv(doc_root+experiment_id+'/'+SRAC_file, function(err) {
                //req.files.SRAC_file.mv(doc_root+experiment_id+'/'+SRAC_file, function(err) {
                    if (err)
                    {   
                        logger.error({
                            level: 'error',
                            message: req.session.FirstName + ' ' + req.session.LastName
                            + '(' + req.session.user_id[0] + ') fail to Upload a experiment with a file document' + err
                        });
                        return res.status(500).send(err);
                    }
                    else{
                        logger.warn({
                            level: 'warn',
                            message: req.session.FirstName + ' ' + req.session.LastName
                            + '(' + req.session.user_id[0] + ') successfully Upload a experiment with a file document'
                        });
                        return res.json({'err':0,'msg':'Upload a file document'});
                    } 
                });
            }
        }
    }
});
// router.get('/api/v1/protocol_groups',isAdmin,(req,res,next)=>{  //isAdmin
//     /*
//         Query experiments
//     */
//     /*
//         Testing params
//     */

//     var selected_project =  req.params.project_id;
//     /*
//         Validation is need to auth user who does not have access to particular project
//     */
//     var results=[];
//     mysqlcon.getConnection((err,connection)=>{
//         if(err) throw err;
//         var query = connection.query("SELECT * FROM nci_protocol_groups;");
//         query.on('result',(row)=>{
//                 results.push(row);
//         });
//         query.on('end',()=>{
//                 connection.release();
//                 return res.json(results);
//         });
//     });
// });

router.get('/api/v1/protocol_groups',isAdmin,(req,res,next)=>{  //isAdmin
    /*
        Query experiments
    */
    /*
        Testing params
    */
    /*
        Validation is need to auth user who does not have access to particular project
    */
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') GET `/api/v1/protocol_groups`'
    });
    var results=[];
    mysqlcon.getConnection((err,connection)=>{
        if(err) throw err;
        var query = connection.query("SELECT * FROM nci_protocol_groups;");
        query.on('result',(row)=>{
                results.push(row);
        });
        query.on('end',()=>{
                connection.release();
                return res.json(results);
        });
    });
});
router.get('/api/v1/protocol/:protocol_group_id',isAdmin,(req,res,next)=>{  //isAdmin
    /*
        Query experiments
    */
    /*
        Testing params
    */
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') GET `/api/v1/protocol/'+ req.params.protocol_group_id +'`'
    });
    var selected_protocol_group =  req.params.protocol_group_id;
    /*
        Validation is need to auth user who does not have access to particular project
    */
    var results=[];
    mysqlcon.getConnection((err,connection)=>{
        if(err) throw err;
        var query = connection.query("SELECT * FROM nci_protocol_categories WHERE protocol_group_id = "+selected_protocol_group);
        query.on('result',(row)=>{
                results.push(row);
        });
        query.on('end',()=>{
                connection.release();
                return res.json(results);
        });
    });
});
router.get('/api/v1/protocols_overview',isAdmin,(req,res,next)=>{  //isAdmin
    /*
        Query experiments
    */
    /*
        Testing params
    */
    /*
        Validation is need to auth user who does not have access to particular project
    */
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') GET `/api/v1/protocols_overview`'
    });
    var results=[];
    mysqlcon.getConnection((err,connection)=>{
        if(err) throw err;
        var query = connection.query("SELECT * FROM nci_protocol_categories ");
        query.on('result',(row)=>{
                results.push(row);
        });
        query.on('end',()=>{
                connection.release();
                return res.json(results);
        });
    });
});
router.get('/api/v1/project_protocol/:protocol_category_id',isAdmin,(req,res,next)=>{  //isAdmin
    /*
        Query experiments
    */
    /*
        Testing params
    */
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') GET `/api/v1/project_protocol/'+ req.params.protocol_category_id +'`'
    });
    var protocol_category_id =  req.params.protocol_category_id;
    /*
        Validation is need to auth user who does not have access to particular project
    */
    var results=[];
    mysqlcon.getConnection((err,connection)=>{
        if(err) throw err;
        var query = connection.query("SELECT t1.*,nci_projects.pi_id FROM (SELECT project_id, protocol_name, protocol_category_id FROM nci_protocols WHERE protocol_category_id = ?) AS t1 LEFT JOIN nci_projects ON t1.project_id=nci_projects.id",protocol_category_id);
        query.on('result',(row)=>{
                results.push(row);
        });
        query.on('end',()=>{
                connection.release();
                return res.json(results);
        });
    });
});

router.get('/api/v1/probes_overview',isAuth,(req,res,next)=>{  //isAuth
    /*
        Query experiments
    */
    /*
        Testing params
    */
    /*
        Validation is need to auth user who does not have access to particular project
    */
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') GET `/api/v1/probes_overview`'
    });
    var results=[];
    mysqlcon.getConnection((err,connection)=>{
        if(err) throw err;
        var query = connection.query("SELECT * FROM imaging_probes;");
        query.on('result',(row)=>{
                results.push(row);
        });
        query.on('end',()=>{
                connection.release();
                return res.json(results);
        });
    });
});
router.get('/api/v1/statistics_overview',isAdmin,(req,res,next)=>{  //isAdmin
    /*
        Query experiments
    */
    /*
        Testing params
    */
    /*
        Validation is need to auth user who does not have access to particular project
    */
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') GET `/api/v1/statistics_overview`'
    });

    let MonthAgo = new Date();
    MonthAgo.setDate(MonthAgo.getDate()-180);
    let MonthAgoYear=MonthAgo.getFullYear();
    let MonthAgoMonth=MonthAgo.getMonth()+1;
    let MonthAgoDate=MonthAgo.getDate();
    // let MonthAgoStatement=MonthAgoYear+'-'+MonthAgoMonth+'-'+MonthAgoDate;

    let MonthAgoStatement = '2018-01-01';
    var results=[];
    // console.log(MonthAgoStatement);
    mysqlcon.getConnection((err,connection)=>{
        if(err) throw err;
        var query = connection.query("SELECT t1.id,t1.event,t1.type,t1.user_id,t1.timestamp,site_users.last_name,site_users.first_name FROM (SELECT * FROM site_statistics) AS t1 LEFT JOIN site_users ON t1.user_id=site_users.id WHERE timestamp>='"+MonthAgoStatement+"';");
        query.on('result',(row)=>{
            results.push(row);
        });
        query.on('end',()=>{
            connection.release();
            return res.json(results);
        });
    });
    
});


router.get('/api/v1/study_download/:pat_path/:study_path/:pat_name/:study_description/:series_path/:series_description/:modality',isAuth,(req,res,next)=>{  //isAuth
    /*
        Query experiments
    */
    /*
        Testing params
    */
    /*
        Validation is need to auth user who does not have access to particular project
    */
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') GET `/api/v1/study_download` study: '+ req.params.study_description
    });
    var series_pathArr=req.params.series_path.split(",");
    var series_descriptionArr=req.params.series_description.split(",");
    var modalityArr=req.params.modality.split(",");

    async.waterfall([
        function(callback){
            if (!fs.existsSync(__dirname+"/"+req.params.pat_name)){
                fs.mkdir(__dirname+"/"+req.params.pat_name,0o755, function(err){

                    ncp(archive_root+req.params.pat_path+'/'+req.params.study_path, __dirname+'/'+req.params.pat_name , function (err) {
                        if (err) {
                            logger.error({
                                level: 'error',
                                message: req.session.FirstName + ' ' + req.session.LastName
                                + '(' + req.session.user_id[0] + ') unsuccessfully copy files from scippy image archive ' + err
                            });
                            return console.error(err);
                        }
                        // console.log(archive_root+req.params.pat_path+'/'+req.params.study_path+ 'copies done!!!');
                        callback(null,__dirname+'/'+req.params.pat_name);

                    });

                })
            }else{

                ncp(archive_root+req.params.pat_path+'/'+req.params.study_path, __dirname+'/'+req.params.pat_name , function (err) {
                    if (err) {
                        logger.error({
                            level: 'error',
                            message: req.session.FirstName + ' ' + req.session.LastName
                            + '(' + req.session.user_id[0] + ') unsuccessfully copy files from scippy image archive ' + err
                        });
                        return console.error(err);
                    }
                    // console.log(archive_root+req.params.pat_path+'/'+req.params.study_path+ ' copies done!!!');
                    callback(null,__dirname+'/'+req.params.pat_name);

                });

            }
        },function(arg,callback){
            let total=0;
            // fs.stat(__dirname+'/'+req.params.pat_name, function(err, stats) {
            //     console.log(stats)
            // });
            console.log(fs.statSync(__dirname+'/'+req.params.pat_name))
            var estimateSize = fs.statSync(__dirname+'/'+req.params.pat_name).size
            console.log('estimateSize of '+__dirname+'/'+req.params.pat_name+' is around: ' + estimateSize)
            function changeSeriesFolderName(currentPath) {
                let files = fs.readdirSync(currentPath);
                //console.log(files)
                for (let i=0;i<files.length;i++) {
                    // console.log(currentPath);
                    // console.log(files[i]);
                    if(files[i]!=='.DS_Store'&&files[i]!=='DICOMDIR'){
                        let curFile = path.join(currentPath, files[i]);
                        if (fs.statSync(curFile).isDirectory()) {
                            // console.log('-----------------subfolder(series) name is-----------------')
                            // console.log(curFile);
                            let series_path_str = curFile.substring(curFile.lastIndexOf('/')+1);
                            // console.log(series_descriptionArr[series_pathArr.indexOf(series_path_str)]);
                            // console.log(modalityArr[series_pathArr.indexOf(series_path_str)]);
                            // console.log(series_descriptionArr[series_pathArr.indexOf(series_path_str)]+' '+modalityArr[series_pathArr.indexOf(series_path_str)]);
                            fs.moveSync(curFile,curFile + ' '+ series_descriptionArr[series_pathArr.indexOf(series_path_str)]+' '+modalityArr[series_pathArr.indexOf(series_path_str)], function (err) {
                                if (err) throw err;
                            });
                            total+=1;
                            // console.log(files.length)
                            // console.log(total)
                            // if (total === files.length){
                            //     callback(null,total);
                            // }
                            curFile = curFile + ' '+ series_descriptionArr[series_pathArr.indexOf(series_path_str)]+' '+modalityArr[series_pathArr.indexOf(series_path_str)];
                        }
                    }
                }
            }
            changeSeriesFolderName(__dirname+'/'+req.params.pat_name);
            callback(null,estimateSize);
        },function(arg,callback){
            let total=0;
            function walkDir(currentPath) {
                let files = fs.readdirSync(currentPath);
                //console.log(files)
                for (let i=0;i<files.length;i++) {
                    // console.log(currentPath);
                    // console.log(files[i]);
                    if(files[i]!=='.DS_Store'&&files[i]!=='DICOMDIR'){
                        let curFile = path.join(currentPath, files[i]);      
                            if (fs.statSync(curFile).isFile()&&path.extname(curFile)!=='.jpg') {   
                                total+=1;
                                fs.rename(curFile, curFile+'.dcm', function (err) {
                                    if (err) throw err;
                                });
                            } else if (fs.statSync(curFile).isDirectory()) {
                                walkDir(curFile);
                            }
                    }
                }
            };
            walkDir(__dirname+'/'+req.params.pat_name);
            callback(null,arg);
        },function(arg,callback){
            zipFolder(__dirname+"/"+req.params.pat_name, __dirname+"/"+req.params.pat_name+".zip", arg, function(err) {
                if(err) {
                    console.log(err);
                } else {
                    console.log('EXCELLENT, zip done');
                    // rimraf(__dirname+"/"+req.params.pat_name, function () { console.log('rm -rf '+__dirname+"/"+req.params.pat_name); });
                    callback(null,__dirname+'/'+req.params.pat_name);
                }
            });
        }
        ],function(err,results){
            
            res.download(__dirname+"/"+req.params.pat_name+'.zip',function(err){
                if(err) throw err;
                // fs.unlink(__dirname+"/"+req.params.pat_name+'.zip');
                eventTracking('Study',req.session.user_id[0]);
            });
                
        });
/*
    console.log(req.params.study_description);
    var archive = archiver('zip',{
      zlib: { level: 1 } // Sets the compression level.
    });

    var output = fs.createWriteStream(__dirname+"/"+req.params.pat_name+' '+req.params.study_description+'.zip');

    output.on('close', function() {
        console.log(archive.pointer() + ' total bytes');
        console.log('archiver has been finalized and the output file descriptor has closed.');
        res.header("Access-Control-Expose-Headers", "Content-Disposition");
        res.download(__dirname+"/"+req.params.pat_name+' '+req.params.study_description+'.zip',__dirname+"/"+req.params.pat_name+' '+req.params.study_description+'.zip',function(err){
                                //CHECK FOR ERROR
                                fs.unlink(__dirname+"/"+req.params.pat_name+' '+req.params.study_description+'.zip');
                                eventTracking('Study',req.session.user_id[0]);
                            });   
    });

    archive.on('error', function(err) {
        throw err;
    });

    archive.pipe(output);


    archive.directory(archive_root+req.params.pat_path+'/'+req.params.study_path, req.params.pat_name+' '+req.params.study_description , { date: new Date() });

    archive.finalize();
*/
});
router.get('/api/v1/series_download/:pat_path/:study_path/:series_path/:series_description/:modality',isAuth,(req,res,next)=>{  //isAuth
    /*
        Query experiments
    */
    /*
        Testing params
    */
    /*
        Validation is need to auth user who does not have access to particular project
    */

    var workSpace = __dirname +'/'+req.session.UserPrincipalName;
  async.waterfall([
        function(callback){
            if (!fs.existsSync(workSpace+"/"+req.params.series_description+ ' ' +req.params.modality)){
                fs.mkdir(workSpace+"/"+req.params.series_description+ ' ' +req.params.modality,0o755, function(err){

                        ncp(archive_root+req.params.pat_path+'/'+req.params.study_path+'/'+req.params.series_path, workSpace+'/'+req.params.series_description+ ' ' +req.params.modality , function (err) {
                            if (err) {
                                return console.error(err);
                            }
                            console.log(archive_root+req.params.pat_path+'/'+req.params.study_path+'/'+req.params.series_path+ 'copies done!!!');

                            callback(null,workSpace+'/'+req.params.series_description+ ' ' +req.params.modality);

                        });

                })
            }else{

                ncp(archive_root+req.params.pat_path+'/'+req.params.study_path+'/'+req.params.series_path, workSpace+'/'+req.params.series_description+ ' ' +req.params.modality , function (err) {
                    if (err) {
                        return console.error(err);
                    }
                    console.log(archive_root+req.params.pat_path+'/'+req.params.study_path+'/'+req.params.series_path+ ' copies done!!!');

                    callback(null,workSpace+'/'+req.params.series_description+ ' ' +req.params.modality);

                });

            }
        },function(arg,callback){
            let total=0;
            function walkDir(currentPath) {
                let files = fs.readdirSync(currentPath);
                //console.log(files)
                for (let i=0;i<files.length;i++) {
                    // console.log(currentPath);
                    // console.log(files[i]);
                    if(files[i]!=='.DS_Store'&&files[i]!=='DICOMDIR'){
                        let curFile = path.join(currentPath, files[i]);      
                            if (fs.statSync(curFile).isFile()&&path.extname(curFile)!=='.jpg') {   
                                total+=1;
                                fs.rename(curFile, curFile+'.dcm', function (err) {
                                    if (err) throw err;
                                });
                            } else if (fs.statSync(curFile).isDirectory()) {
                                walkDir(curFile);
                            }
                    }
                }
            };
            walkDir(workSpace+'/'+req.params.series_description+ ' ' +req.params.modality);
            callback(null,total);
        },function(arg,callback){
            zipFolder(workSpace+"/"+req.params.series_description+ ' ' +req.params.modality, workSpace+"/"+req.params.series_description+ ' ' +req.params.modality+".zip", function(err) {
                if(err) {
                    console.log(err);
                } else {
                    console.log('EXCELLENT, zip done');
                    rimraf(workSpace+"/"+req.params.series_description+ ' ' +req.params.modality, function () { console.log('rm -rf '+workSpace+"/"+req.params.series_description+ ' ' +req.params.modality); });
                    callback(null,workSpace+'/'+req.params.series_description+ ' ' +req.params.modality);
                }
            });
        }
        ],function(err,results){
            
            res.download(workSpace+"/"+req.params.series_description+ ' ' +req.params.modality+'.zip',function(err){
                if(err) throw err;
                fs.unlink(workSpace+"/"+req.params.series_description+ ' ' +req.params.modality+'.zip');
                eventTracking('Series',req.session.user_id[0]);
            });
                
        });

});

router.get('/api/v1/experiment_download/:experiment_id/:experiments_name',(req,res,next)=>{  //isAuth
    /*
        Query experiments
    */
    /*
        Testing params
    */
    /*
        Validation is need to auth user who does not have access to particular project
    */
    let experiment_id=req.params.experiment_id
    let results=[];
    let allPatientsPath_result=[];
    // console.log('in download')
    // console.log(mysqlcon)
    async.waterfall([
        function(callback){
            mysqlcon.getConnection((err,connection)=>{
                if(err) throw err;
                var query = connection.query("SELECT * FROM imaging_participants WHERE experiment_id=?;",experiment_id);
                query.on('result',(row)=>{
                //    console.log(row)
                    results.push(row['patient_id']);
                });
                query.on('end',()=>{
                    connection.release();
                    //console.log(results)
                    callback(null,results)
                //    return res.json(results);
                });
            });
        },function(arg,callback){
            pg.connect(connectionString,(err,client,done)=>{
                if(err) throw err;
                // console.log(arg)
                    var query = client.query("SELECT t2.*,id AS series_id,series_path,series_description,modality \
                                            FROM (SELECT  id AS study_id, t1.*, study_description,study_path FROM \
                                            (SELECT id AS pat_id,pat_path,pat_name FROM patients WHERE id in ("+arg+")) AS t1 LEFT JOIN \
                                            studies ON t1.pat_id = studies.pat_id) AS t2 LEFT JOIN series ON t2.study_id=series.study_id;");
                    query.on('row',(row)=>{
                            let eachIndex=[]
                            eachIndex.push(row['pat_name']);
                            eachIndex.push(row['pat_path']);
                            eachIndex.push(row['study_description']);
                            eachIndex.push(row['study_path']);
                            eachIndex.push(row['series_description']);
                            eachIndex.push(row['series_path']);
                            eachIndex.push(row['modality']);
                            allPatientsPath_result.push(eachIndex);
                    });
                    query.on('end',()=>{
                            done();
                            callback(null,allPatientsPath_result)
                    //        return res.json(allPatientsPath_result);
                    });
                   // client.end();
            });
        }
        ],function(err,results){
            // console.log(results)
          async.waterfall([
                function(callback){
                    if (!fs.existsSync(__dirname+"/"+req.params.experiments_name)){
                        fs.mkdir(__dirname+"/"+req.params.experiments_name,0o755, function(err){
                            // console.log('start cp')

                            let ifAllCopied=[];
                      for(let a=0;a<results.length;a++){
                                if (fs.existsSync(archive_root+results[a][1])){
                                    console.log(results[a][1])
                                    ncp(archive_root+results[a][1], __dirname+'/'+req.params.experiments_name+'/'+results[a][0]+' '+results[a][1], function (err) {
                                        if (err) {
                                            ifAllCopied.push(a)
                                            return console.error(err);
                                        }
                                        ifAllCopied.push(a)
                                        // console.log(archive_root+results[a][1]+ 'copies done!');
                                        // console.log(results.length-1);
                                        // console.log(a);
                                        if(ifAllCopied.length==results.length){
                                            callback(null,results);
                                        }
                            });
                                }
                                // console.log(results.length-1);
                                // console.log(a);
                            }
                        })
                    }else{
                        let ifAllCopied=[];
                        console.log('-------------------in else------------------')
                        for(let a=0;a<results.length;a++){
                            ncp(archive_root+results[a][1], __dirname+'/'+req.params.experiments_name+'/'+results[a][0]+' '+results[a][1], function (err) {
                                if (err) {
                                    ifAllCopied.push(a)
                                //  rimraf(__dirname+"/"+req.params.experiments_name, function () { console.log('rm -rf '+__dirname+"/"+req.params.experiments_name); });
                            console.error(err);
                                }
                                // console.log(archive_root+results[a][1]+ ' copies done!');
                              if(ifAllCopied.length==results.length){
                                    callback(null,results);
                                }
                        });
                        }
                    }
                },function(arg,callback){
                    console.log('-----------------in change folders name-----------------')
                    // console.log(arg);
                    let pat_nameDisplay=[];
                    let pat_pathDisplay=[];
                    let study_nameDisplay=[];
                    let study_pathDisplay=[];
                    let series_nameDisplay=[];
                    let series_pathDisplay=[];
                    let modalityDisplay=[];
                    for(let a=0;a<arg.length;a++)
                    {
                        pat_nameDisplay.push(arg[a][0])
                        pat_pathDisplay.push(arg[a][1])
                        study_nameDisplay.push(arg[a][2])
                        study_pathDisplay.push(arg[a][3])
                        series_nameDisplay.push(arg[a][4])
                        series_pathDisplay.push(arg[a][5])
                        modalityDisplay.push(arg[a][6])
                    }
                    let total=0;
                    function changeFoldersName(currentPath) {
                        let files = fs.readdirSync(currentPath);
                        //console.log(files)
                        let level;
                        for (let i=0;i<files.length;i++) {
                            // console.log(currentPath);
                            // console.log(files[i]);
                            if(files[i]!=='.DS_Store'&&files[i]!=='DICOMDIR'){
                                let curFile = path.join(currentPath, files[i]);
                                if (fs.statSync(curFile).isDirectory()) {
                                    // console.log('-----------------subfolder(patient,study,series) name is-----------------')
                                    // console.log(curFile)
                                    level = curFile.split('/').length-__dirname.split('/').length-1;
                                    // console.log(level)
                                    if(level == 1){
                                        changeFoldersName(curFile);
                                    }
                                    if(level == 2){
                                        let study_path_str = curFile.substring(curFile.lastIndexOf('/')+1);
                                        // console.log(study_path_str)
                                        // console.log(study_nameDisplay[study_pathDisplay.indexOf(study_path_str)])
                                        fs.moveSync(curFile,curFile + ' '+ study_nameDisplay[study_pathDisplay.indexOf(study_path_str)], function (err) {
                                            if (err) throw err;
                                            
                                        });
                                        newFile = curFile + ' '+ study_nameDisplay[study_pathDisplay.indexOf(study_path_str)];
                                            // console.log('new file')
                                            // console.log(newFile);
                                            changeFoldersName(newFile);
                                    }
                                    if(level == 3){
                                        let series_path_str = curFile.substring(curFile.lastIndexOf('/')+1);
                                        // console.log(series_path_str)
                                        // console.log(series_nameDisplay[series_pathDisplay.indexOf(series_path_str)])
                                        // console.log(modalityDisplay[series_pathDisplay.indexOf(series_path_str)])
                                        fs.moveSync(curFile,curFile + ' '+ series_nameDisplay[series_pathDisplay.indexOf(series_path_str)]
                                            + ' ' +modalityDisplay[series_pathDisplay.indexOf(series_path_str)], function (err) {
                                            if (err) throw err;
                                        });
                                    }
                                    
                                    // let series_path_str = curFile.substring(curFile.lastIndexOf('/')+1);
                                    // console.log(series_descriptionArr[series_pathArr.indexOf(series_path_str)]);
                                    // console.log(modalityArr[series_pathArr.indexOf(series_path_str)]);
                                    // console.log(series_descriptionArr[series_pathArr.indexOf(series_path_str)]+' '+modalityArr[series_pathArr.indexOf(series_path_str)]);
                                    // fs.moveSync(curFile,curFile + ' '+ series_descriptionArr[series_pathArr.indexOf(series_path_str)]+' '+modalityArr[series_pathArr.indexOf(series_path_str)], function (err) {
                                    //     if (err) throw err;
                                    // });
                                    // total+=1;
                                    // // console.log(files.length)
                                    // // console.log(total)
                                    // // if (total === files.length){
                                    // //     callback(null,total);
                                    // // }
                                    // curFile = curFile + ' '+ series_descriptionArr[series_pathArr.indexOf(series_path_str)]+' '+modalityArr[series_pathArr.indexOf(series_path_str)];
                                }
                            }
                        }
                    }
                    changeFoldersName(__dirname+'/'+req.params.experiments_name);
                    callback(null,total);
                },function(arg,callback){
                    let total=0;
                    function walkDir(currentPath) {
                        let files = fs.readdirSync(currentPath);
                        //console.log(files)
                        for (let i=0;i<files.length;i++) {
                            // console.log(currentPath);
                            // console.log(files[i]);
                            if(files[i]!=='.DS_Store'&&files[i]!=='DICOMDIR'){
                                let curFile = path.join(currentPath, files[i]);      
                                    if (fs.statSync(curFile).isFile()&&path.extname(curFile)!=='.jpg') {   
                                        total+=1;
                                        fs.rename(curFile, curFile+'.dcm', function (err) {
                                            if (err) throw err;
                                        });
                                    } else if (fs.statSync(curFile).isDirectory()) {
                                        walkDir(curFile);
                                    }
                            }
                        }
                    };
                    walkDir(__dirname+'/'+req.params.experiments_name);
                    callback(null,total);
                },function(arg,callback){
                  console.log('start zip');
                    zipFolder(__dirname+"/"+req.params.experiments_name, __dirname+"/"+req.params.experiments_name+".zip", function(err) {
                        if(err) {
                    rimraf(__dirname+"/"+req.params.experiments_name, function () { console.log('rm -rf '+__dirname+"/"+req.params.experiments_name); });
                           console.log(err);
                        } else {
                            console.log('EXCELLENT, zip done');
                     rimraf(__dirname+"/"+req.params.experiments_name, function () { console.log('rm -rf '+__dirname+"/"+req.params.experiments_name); });
                            callback(null,__dirname+'/'+req.params.experiments_name);
                        }
                    });
                }
                ],function(err,results){
                    
                    res.download(__dirname+"/"+req.params.experiments_name+'.zip',function(err){
                        if(err) throw err;
        //  rimraf(__dirname+"/"+req.params.experiments_name, function () { console.log('rm -rf '+__dirname+"/"+req.params.experiments_name); });
                        fs.unlink(__dirname+"/"+req.params.experiments_name+'.zip');
                        eventTracking('Experiment',req.session.user_id[0]);
                    });
                        
                });
/*            console.log(results);
            
            var archive = archiver('zip',{
              zlib: { level: 1 } // Sets the compression level.
            });

            var output = fs.createWriteStream(__dirname+"/"+req.params.experiments_name+'.zip');

            output.on('close', function() {
                fs.unlink(__dirname+"/"+req.params.experiments_name+'.zip');
    console.log(archive.pointer() + ' total bytes');
                console.log('archiver has been finalized and the output file descriptor has closed.');
                res.header("Access-Control-Expose-Headers", "Content-Disposition");
                res.download(__dirname+"/"+req.params.experiments_name+'.zip',__dirname+"/"+req.params.experiments_name+'.zip',function(err){
                                        //CHECK FOR ERROR
          if(err){
            console.log(err)
            fs.unlink(__dirname+"/"+req.params.experiments_name+'.zip');
          }
                                        fs.unlink(__dirname+"/"+req.params.experiments_name+'.zip');
                                        eventTracking('Experiment',req.session.user_id[0]);
                                    });
   
            });

            archive.on('error', function(err) {
                fs.unlink(__dirname+"/"+req.params.experiments_name+'.zip');
    console.log(err)
    throw err;
            });

            archive.pipe(output);

            for(let a=0;a<results.length;a++){
                console.log(archive_root+results[a][1]);
    archive.directory(archive_root+results[a][1], req.params.experiments_name+'/'+results[a][0]+' '+results[a][1], { date: new Date() });
            }
            
            archive.finalize();
*/
        })
    
});

router.get('/api/v1/document_download/:doc_pro_id',isAuth,(req,res,next)=>{  //isAuth
    /*
        Query experiments
    */
    /*
        Testing params
    */
    /*
        Validation is need to auth user who does not have access to particular project
    */
    let doc_pro_id=req.params.doc_pro_id;
    let path_results=[];
    let name_results=[];
    let allPatientsPath_result=[];

    async.waterfall([
        function(callback){
            mysqlcon.getConnection((err,connection)=>{
                if(err) throw err;
                var query = connection.query("SELECT * FROM nci_project_document WHERE project_id=?;",doc_pro_id);
                query.on('result',(row)=>{
                //    console.log(row)
                    path_results.push(row['path']);
                    name_results.push(row['doc_name']);
                });
                query.on('end',()=>{
                    connection.release();
                    //console.log(results)
                    callback(null,path_results)
                //    return res.json(results);
                });
            });
        }
        ],function(err,results){
            if(name_results.length){
                for(let a=0;a<name_results.length;a++){
                    var file = path_results[a]+'/'+doc_pro_id+'/'+name_results[a];
                    res.download(file); 
                }
            }else{
                return res.json({'err':'no files found'})
            }
            
              
        })
    
});
router.post('/api/v1/upload',isAdmin,(req,res,next)=>{  //isAdmin
        req.checkBody('project_id','Project id cannot be empty').notEmpty();
        req.checkBody('project_id','Project id should be an integer').isString();

        var errors = req.validationErrors();

    if(errors){
        return res.json({'err':1,errors});
    }
    else{
        let project_id = req.body.project_id;
        if(req.files){
            let SRAC_file = req.files.SRAC_file.name;
            console.log('uploading');
            //FOR mariadb10.2.8
            if (!fs.existsSync(__dirname+'/tmpFile/'+project_id)){
            fs.mkdir(__dirname+'/tmpFile/'+project_id,0o755, function(err){
            //if (!fs.existsSync('/Users/miaot2/html_learning/SAIP/Backend/tmpFile/'+project_id)){
            //    fs.mkdir('/Users/miaot2/html_learning/SAIP/Backend/tmpFile/'+project_id,0o755, function(err){
                    if(err) {
                        throw err;
                    }
                    //FOR mariadb10.2.8
                    req.files.SRAC_file.mv(__dirname+'/tmpFile/'+project_id+'/'+SRAC_file, function(err) {
                    //req.files.SRAC_file.mv('/Users/miaot2/html_learning/SAIP/Backend/tmpFile/'+project_id+'/'+SRAC_file, function(err) {
                        if (err)
                        {   
                            return res.status(500).send(err);
                        }
                        
                        if(err) throw err;
                        async.parallel([
                            function(callback){
                                mysqlcon.getConnection((err,connection)=>{
                                var query = connection.query("INSERT INTO nci_project_document (project_id,doc_name) VALUES (?,?)",[project_id,SRAC_file],function(err,result){
                                    if(err) {
                                       throw err; 
                                    }
                                    console.log('successfully insert '+result.insertId+' row in `nci_project_document` table');
                                    console.log('INSERT INTO nci_project_document (project_id,doc_name, created_at, updated_at');
                                    console.log('VALUES ('+project_id+', '+SRAC_file+', NOW(), NOW());');
                                    connection.release();
                                    callback(null, 'successfully insert '+result.insertId+' row in `nci_project_document` table');
                                });
                                })
                            },
                            function(callback){
                                mysqlcon.getConnection((err,connection)=>{
                                    var query = connection.query("UPDATE nci_projects SET SRAC_file=CONCAT_WS(',',SRAC_file,?) WHERE id=?;",[SRAC_file,project_id],function(err,result){
                                        if(err) {
                                           throw err; 
                                        }
                                        console.log('successfully insert '+result.insertId+' row in `nci_projects` table');
                                        console.log('UPDATE nci_projects SET SRAC_file=CONCAT_WS(',',SRAC_file,'+SRAC_file+') WHERE id='+project_id+';');
                                        callback(null, 'successfully insert '+result.insertId+' row in `nci_projects` table');
                                        connection.release();
                                    });
                                });
                            }
                            ],function(err,result){
                                return res.json({'err':0,'msg':'Upload a project with a file document'});
                        })
                        
                    });
                })
            }
            else{
                //FOR mariadb10.2.8
                req.files.SRAC_file.mv(__dirname+'/tmpFile/'+project_id+'/'+SRAC_file, function(err) {
                //req.files.SRAC_file.mv('/Users/miaot2/html_learning/SAIP/Backend/tmpFile/'+project_id+'/'+SRAC_file, function(err) {
                        if (err)
                        {   
                            console.log('wrong????');
                            return res.status(500).send(err);
                        }
                        mysqlcon.getConnection((err,connection)=>{
                            if(err) throw err;
                            var query = connection.query("INSERT INTO nci_project_document (project_id,doc_name,created_at,updated_at) VALUES (?,?,NOW(),NOW())",[project_id,SRAC_file],function(err,result){
                                if(err) {
                                    console.log('wrong?');
                                   throw err; 
                                }
                                console.log('successfully insert '+result.insertId+' row in `nci_project_document` table');
                                console.log('INSERT INTO nci_project_document (project_id,doc_name, created_at, updated_at)');
                                console.log('VALUES ('+project_id+', '+SRAC_file+', NOW(), NOW());');
                                connection.release();
                                return res.json({'err':0,'msg':'Upload a file document'});
                            });
                        });
                    });
            }
        }
    }
});
router.post('/api/v1/whitelist',isAdmin,(req,res,next)=>{  //isAdmin
    

    req.checkBody('userID','User id cannot be empty').notEmpty();
    req.checkBody('userID','User id should be a string<varchar(127)>').isString();
    req.checkBody('first_name','First name cannot be empty').notEmpty();
    req.checkBody('first_name','First name should be a string<varchar(127)>').isString();
    req.checkBody('last_name','Last name cannot be empty').notEmpty();
    req.checkBody('last_name','Last name should be a string<varchar(127)>').isString();
    req.checkBody('status','Status cannot be empty').notEmpty();
    req.checkBody('status','Status should be a string<varchar(127)>').isString();
    req.checkBody('group','Group cannot be empty').notEmpty();
    req.checkBody('group','Group should be an integer larger than 6 and less than 9').isInt({ min: 7, max: 8 });

    var errors = req.validationErrors();

    if(errors){
        return res.json({'err':1,errors});
    }
    else{
        let userID = req.body.userID;
        let first_name = req.body.first_name;
        let last_name = req.body.last_name;
        let is_pi = req.body.is_pi||null;
        let position = req.body.position||null;
        let status = req.body.status;
        let phone_office = req.body.phone_office||null;
        let email = req.body.email||null;
        let user_results=[];
        let group=parseInt(req.body.group);
        async.waterfall([
            function(callback){
                 mysqlcon.getConnection((err,connection)=>{
                    var query = connection.query("SELECT last_name,first_name,position,is_pi,status,email,phone_office,userID,created_at,updated_at FROM site_users WHERE userID = '"+userID+"';");
                    query.on('result',(row)=>{
                        user_results.push(row);
                    });
                    query.on('end',()=>{
                        connection.release();
                        callback(null,user_results)
                    });
                 });
            },function(arg,callback){
                if(!arg.length){
                    mysqlcon.getConnection((err,connection)=>{
                        if(err) throw err;
                        var query = connection.query("INSERT INTO site_users (last_name,first_name,position,is_pi,status,email,phone_office,userID,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,NOW(), NOW())",
                            [last_name,first_name,position,is_pi,status,email,phone_office,userID],function(err,result){
                            if(err) {
                               throw err; 
                            }

                            console.log('successfully insert '+result.insertId+' row in `site_users` table');
                            console.log('INSERT INTO site_users (last_name,first_name,position,is_pi,status,email,phone_office,userID,created_at,updated_at)');
                            console.log('VALUES ('+last_name+', '+first_name+', '+position+', '+is_pi+', '+status+', '+email+', '+phone_office+', '+userID+', NOW(), NOW());');
                            if(group){
                                var query = connection.query('INSERT INTO site_group_memberships (person_id,group_id,created_at,updated_at) VALUES(?,?,NOW(), NOW())',[result.insertId,group]);
                                query.on('result',(row)=>{
                                    user_results.push(row);
                                });
                                query.on('end',()=>{
                                    connection.release();
                                    console.log('successfully insert '+result.insertId+' row in `site_group_memberships` table');
                                    console.log('INSERT INTO site_group_memberships (person_id,group_id,created_at,updated_at) VALUES(?,?,NOW(), NOW())');
                                    console.log('VALUES ('+result.insertId+', '+group+', NOW(), NOW());');
                                });
                            }else{
                                console.log('No group for this new user');
                                connection.release();
                            }
                            
                            let msg = last_name+' '+first_name+' is added in the whitelist';
                            callback(null,{'err':0,'msg':msg})
                        });
                    });
                }else{
                    let msg = 'Same user id ' +userID+ ' is already in the whitelist for user '+first_name+' '+last_name;
                    callback(null,{'err':1,'errors':msg,'result':user_results})
                }
                
            }
            ],function(err,result){
                return res.json(result)
            })
        
    }
});
router.post('/api/v1/probes_add',isAdmin,(req,res,next)=>{  //isAdmin
    req.checkBody('name','name cannot be empty').notEmpty();
    req.checkBody('name','name should be a string<varchar(127)>').isString();
    req.checkBody('description','description cannot be empty').notEmpty();
    req.checkBody('description','description should be a string<varchar(127)>').isString();

    var errors = req.validationErrors();

    if(errors){
        return res.json({'err':1,errors});
    }
    else{
        let name = req.body.name;
        let description = req.body.description;
        mysqlcon.getConnection((err,connection)=>{
            if(err) throw err;
            var query = connection.query("INSERT INTO imaging_probes (name,description,created_at,updated_at) VALUES (?,?,NOW(), NOW())",
                [name,description],function(err,result){
                    if(err) {
                       throw err; 
                    }

                    console.log('successfully insert '+result.insertId+' row in `imaging_probes` table');
                    console.log('INSERT INTO imaging_probes (name,description,created_at,updated_at)');
                    console.log('VALUES ('+name+', '+description+', NOW(), NOW());');

                    connection.release();
                    let msg = name+' '+description+' is added in the imaging_probes';
                   
                    return res.json({'err':0,'msg':msg})
                });
        });
    }
});

router.ws('/api/v1/experiment_download/:experiment_id/:experiments_name', function(ws, req) {
    if(req.session.status!=='Authenticated')
    {
        // console.log('true?');

        ws.send(JSON.stringify({'err':'1','msg':'Please login first or contact admin user to whitelist you'}));
        // console.log(JSON.stringify({'err':'1','msg':'Please login first or contact admin user to whitelist you'}));
        ws.close();
        // ws.send('Please login first or contact admin user to whitelist you2');
    }else{
                logger.info({
                        level: 'info',
                        message: req.session.FirstName + ' ' + req.session.LastName
                        + '(' + req.session.user_id[0] + ') WebSocket `/api/v1/experiment_download` experiment: '+ req.params.experiments_name
                });
        let experiment_id=req.params.experiment_id
        let results=[];
        let allPatientsPath_result=[];
        var workSpace = __dirname+'/'+req.session.UserPrincipalName;
        // console.log('in download')
        // console.log(mysqlcon)
        async.waterfall([
            function(callback){
                            logger.info({
                                level: 'info',
                                message: req.session.FirstName + ' ' + req.session.LastName
                                + '(' + req.session.user_id[0] + ') WebSocket `/api/v1/experiment_download` experiment: '+ req.params.experiments_name
                                +'\n[PRE-STEP 1]: get all patients id'
                            });
              mysqlcon.getConnection((err,connection)=>{
                if(err) throw err;
                var query = connection.query("SELECT * FROM imaging_participants WHERE experiment_id=?;",experiment_id);
                query.on('result',(row)=>{
                //    console.log(row)
                    results.push(row['patient_id']);
                });
                query.on('end',()=>{
                    connection.release();
                    //console.log(results)
                    callback(null,results)
                //    return res.json(results);
                });
              });
            },function(arg,callback){
                            logger.info({
                                level: 'info',
                                message: req.session.FirstName + ' ' + req.session.LastName
                                + '(' + req.session.user_id[0] + ') WebSocket `/api/v1/experiment_download` experiment: '+ req.params.experiments_name
                                +'\n[PRE-STEP 2]: get all patients related information'
                            });
              pg.connect(connectionString,(err,client,done)=>{
                if(err) throw err;
                // console.log(arg)
                var query = client.query("SELECT t2.*,id AS series_id,series_path,series_description,modality \
                                        FROM (SELECT  id AS study_id, t1.*, study_description,study_path FROM \
                                        (SELECT id AS pat_id,pat_path,pat_name FROM patients WHERE id in ("+arg+")) AS t1 LEFT JOIN \
                                        studies ON t1.pat_id = studies.pat_id) AS t2 LEFT JOIN series ON t2.study_id=series.study_id;");
                query.on('row',(row)=>{
                  let eachIndex=[]
                  eachIndex.push(row['pat_name']);
                  eachIndex.push(row['pat_path']);
                  eachIndex.push(row['study_description']);
                  eachIndex.push(row['study_path']);
                  eachIndex.push(row['series_description']);
                  eachIndex.push(row['series_path']);
                  eachIndex.push(row['modality']);
                  allPatientsPath_result.push(eachIndex);
                });
                query.on('end',()=>{
                  done();
                  callback(null,allPatientsPath_result)
                //        return res.json(allPatientsPath_result);
                });
               // client.end();
              });
            }
            ],function(err,results){
                // console.log(results)
                // let cleanUp = false;
                                logger.info({
                                    level: 'info',
                                    message: req.session.FirstName + ' ' + req.session.LastName
                                    + '(' + req.session.user_id[0] + ') WebSocket `/api/v1/experiment_download` experiment: '+ req.params.experiments_name
                                    +'\n[STEP 1]: copy files from scippy image archive'
                                });
                async.waterfall([
                  function(callback){
                    if (!fs.existsSync(workSpace)){
                      fs.mkdir(workSpace,0o755,function(){
                        if (!fs.existsSync(workSpace+"/"+req.params.experiments_name)){
                          // console.log('-------------------in if------------------')
                          fs.mkdir(workSpace+"/"+req.params.experiments_name,0o755, function(err){
                            // console.log('start cp')

                            let ifAllCopied=[];
                            let notExistFolder = 0;
                            for(let a=0;a<results.length;a++){
                              if (fs.existsSync(archive_root+results[a][1])){
                                // console.log(results[a][1])
                                ncp(archive_root+results[a][1], workSpace+'/'+req.params.experiments_name+'/'+results[a][0]+' '+results[a][1], function (err) {
                                  ifAllCopied.push(a)
                                  if (err) {
                                    // ifAllCopied.push(a)
                                    if(err[0].code === 'ENOSPC'){
                                      ws.send(JSON.stringify({'err':'4', 'msg':'Experiment is too large'}));
                                      ws.close();
                                                                            logger.error({
                                                                                level: 'error',
                                                                                message: req.session.FirstName + ' ' + req.session.LastName
                                                                                + '(' + req.session.user_id[0] + ') unsuccessfully copy files from scippy image archive ' 
                                                                                + 'experiment: '+ req.params.experiments_name+' \n' + err
                                                                            });
                                      throw err;
                                    }
                                  }
                                  // else{
                                  //     ifAllCopied.push(a);
                                  // }
                                  
                                  // console.log(archive_root+results[a][1]+ 'copies done!');
                                  // console.log(results.length-1);
                                  // console.log(a);
                                  if((ifAllCopied.length+notExistFolder)==results.length){

                                    callback(null,results);
                                  }
                                });
                              }else{
                                                                logger.warn({
                                                                    level: 'warn',
                                                                    message: req.session.FirstName + ' ' + req.session.LastName
                                                                    + '(' + req.session.user_id[0] + ') unsuccessfully copy files from scippy image archive ' 
                                                                    + ' \n' + archive_root+results[a][1] + 'is not exist'
                                                                });
                                /*There is a chance that folder in scippy_image does not exist*/
                                notExistFolder++;
                              }
                            }
                          })
                        }else{
                          let ifAllCopied=[];
                          let notExistFolder = 0;
                          // console.log('-------------------in else------------------')
                          for(let a=0;a<results.length;a++){
                            if (fs.existsSync(archive_root+results[a][1])){
                              ncp(archive_root+results[a][1], workSpace+'/'+req.params.experiments_name+'/'+results[a][0]+' '+results[a][1], function (err) {
                                ifAllCopied.push(a)
                                if (err) {
                                    // ifAllCopied.push(a)
                                //  rimraf(workSpace+"/"+req.params.experiments_name, function () { console.log('rm -rf '+workSpace+"/"+req.params.experiments_name); });
                                  if(err[0].code === 'ENOSPC'){
                                    rimraf(workSpace+"/"+req.params.experiments_name, function () { console.log('rm -rf '+workSpace+"/"+req.params.experiments_name);
                                      ws.send(JSON.stringify({'err':'4', 'msg':'Experiment is too large'}));
                                      ws.close();
                                                                            logger.error({
                                                                                level: 'error',
                                                                                message: req.session.FirstName + ' ' + req.session.LastName
                                                                                + '(' + req.session.user_id[0] + ') unsuccessfully copy files from scippy image archive ' 
                                                                                + 'experiment: '+ req.params.experiments_name+' \n' + err
                                                                            });
                                      throw err
                                    });
                                  }
                                }
                                // else{
                                //     ifAllCopied.push(a);
                                // }
                                // console.log(archive_root+results[a][1]+ ' copies done!');
                                if((ifAllCopied.length+notExistFolder)==results.length){
                                  callback(null,results);
                                }
                              });
                            }else{
                                                            logger.warn({
                                                                level: 'warn',
                                                                message: req.session.FirstName + ' ' + req.session.LastName
                                                                + '(' + req.session.user_id[0] + ') unsuccessfully copy files from scippy image archive ' 
                                                                + ' \n' + archive_root+results[a][1] + 'is not exist'
                                                            });
                              /*There is a chance that folder in scippy_image does not exist*/
                              notExistFolder++;
                            }
                          }
                        }  
                      })
                        
                    }else{
                      if (!fs.existsSync(workSpace+"/"+req.params.experiments_name)){
                       // console.log('-------------------in if within else------------------')
                        fs.mkdir(workSpace+"/"+req.params.experiments_name,0o755, function(err){
                          // console.log('start cp')

                          let ifAllCopied=[];
                          let notExistFolder = 0;
                          for(let a=0;a<results.length;a++){
                            if (fs.existsSync(archive_root+results[a][1])){
                              // console.log(results[a][1])
                              ncp(archive_root+results[a][1], workSpace+'/'+req.params.experiments_name+'/'+results[a][0]+' '+results[a][1], function (err) {
                                ifAllCopied.push(a)
                                if (err) {
                                    
                                  if(err[0].code === 'ENOSPC'){
                                    ws.send(JSON.stringify({'err':'4', 'msg':'Experiment is too large'}));
                                    ws.close();
                                                                        logger.error({
                                                                            level: 'error',
                                                                            message: req.session.FirstName + ' ' + req.session.LastName
                                                                            + '(' + req.session.user_id[0] + ') unsuccessfully copy files from scippy image archive ' 
                                                                            + 'experiment: '+ req.params.experiments_name+' \n' + err
                                                                        });
                                    throw err;
                                  }
                                }
                                // console.log(archive_root+results[a][1]+ 'copies done!');
                                // console.log(results.length-1);
                                // console.log(a);
                                if((ifAllCopied.length+notExistFolder)==results.length){
                                  callback(null,results);
                                }
                              });
                            }else{
                                                            logger.warn({
                                                                level: 'warn',
                                                                message: req.session.FirstName + ' ' + req.session.LastName
                                                                + '(' + req.session.user_id[0] + ') unsuccessfully copy files from scippy image archive ' 
                                                                + ' \n' + archive_root+results[a][1] + 'is not exist'
                                                            });
                              /*There is a chance that folder in scippy_image does not exist*/
                              notExistFolder++;
                            }
                          }
                        })
                      }else{
                        let ifAllCopied=[];
                        let notExistFolder = 0;
                        // console.log('-------------------in else------------------')
                        for(let a=0;a<results.length;a++){
                          if (fs.existsSync(archive_root+results[a][1])){
                            ncp(archive_root+results[a][1], workSpace+'/'+req.params.experiments_name+'/'+results[a][0]+' '+results[a][1], function (err) {
                              ifAllCopied.push(a)
                              if (err) {
                                  // ifAllCopied.push(a)
                              //  rimraf(workSpace+"/"+req.params.experiments_name, function () { console.log('rm -rf '+workSpace+"/"+req.params.experiments_name); });
                                if(err[0].code === 'ENOSPC'){
                                  rimraf(workSpace+"/"+req.params.experiments_name, function () { console.log('rm -rf '+workSpace+"/"+req.params.experiments_name);
                                    ws.send(JSON.stringify({'err':'4', 'msg':'Experiment is too large'}));
                                    ws.close();
                                                                        logger.error({
                                                                            level: 'error',
                                                                            message: req.session.FirstName + ' ' + req.session.LastName
                                                                            + '(' + req.session.user_id[0] + ') unsuccessfully copy files from scippy image archive ' 
                                                                            + 'experiment: '+ req.params.experiments_name+' \n' + err
                                                                        });
                                    throw err
                                  });
                                }
                              }
                              // else{
                              //     ifAllCopied.push(a);
                              // }
                              // console.log(archive_root+results[a][1]+ ' copies done!');
                              if((ifAllCopied.length+notExistFolder)==results.length){
                                callback(null,results);
                              }
                            });
                          }else{
                                                        logger.warn({
                                                            level: 'warn',
                                                            message: req.session.FirstName + ' ' + req.session.LastName
                                                            + '(' + req.session.user_id[0] + ') unsuccessfully copy files from scippy image archive ' 
                                                            + ' \n' + archive_root+results[a][1] + 'is not exist'
                                                        });
                            /*There is a chance that folder in scippy_image does not exist*/
                            notExistFolder++;
                          }
                        }
                      }  
                    }
                  },function(arg,callback){
                                        logger.info({
                                            level: 'info',
                                            message: req.session.FirstName + ' ' + req.session.LastName
                                            + '(' + req.session.user_id[0] + ') WebSocket `/api/v1/experiment_download` experiment: '+ req.params.experiments_name
                                            +'\n[STEP 2]: change experiment/patients/studies/series folder name'
                                        });
                    // console.log('-----------------in change folders name-----------------')
                    // console.log(arg);
                    let pat_nameDisplay=[];
                    let pat_pathDisplay=[];
                    let study_nameDisplay=[];
                    let study_pathDisplay=[];
                    let series_nameDisplay=[];
                    let series_pathDisplay=[];
                    let modalityDisplay=[];
                    for(let a=0;a<arg.length;a++)
                    {
                      pat_nameDisplay.push(arg[a][0])
                      pat_pathDisplay.push(arg[a][1])
                      study_nameDisplay.push(arg[a][2])
                      study_pathDisplay.push(arg[a][3])
                      series_nameDisplay.push(arg[a][4])
                      series_pathDisplay.push(arg[a][5])
                      modalityDisplay.push(arg[a][6])
                    }
                    let total=0;
                    function changeFoldersName(currentPath) {
                      let files = fs.readdirSync(currentPath);
                      //console.log(files)
                      let level;
                      for (let i=0;i<files.length;i++) {
                        // console.log(currentPath);
                        // console.log(files[i]);
                        if(files[i]!=='.DS_Store'&&files[i]!=='DICOMDIR'){
                          let curFile = path.join(currentPath, files[i]);
                          if (fs.statSync(curFile).isDirectory()) {
                            // console.log('-----------------subfolder(patient,study,series) name is-----------------')
                            // console.log(curFile)
                            level = curFile.split('/').length-workSpace.split('/').length-1;
                            // console.log(level)
                            if(level == 1){
                              changeFoldersName(curFile);
                            }
                            if(level == 2){
                              let study_path_str = curFile.substring(curFile.lastIndexOf('/')+1);
                              // console.log(study_path_str)
                              // console.log(study_nameDisplay[study_pathDisplay.indexOf(study_path_str)])
                              fs.moveSync(curFile,curFile + ' '+ study_nameDisplay[study_pathDisplay.indexOf(study_path_str)], function (err) {
                                if (err) {
                                                                    logger.error({
                                                                        level: 'error',
                                                                        message: req.session.FirstName + ' ' + req.session.LastName
                                                                        + '(' + req.session.user_id[0] + ') unsuccessfully change series folder name from: '
                                                                        + curFile + ' to: ' + curFile + ' '+ study_nameDisplay[study_pathDisplay.indexOf(study_path_str)]
                                                                        + '\n' + err
                                                                    });
                                                                    throw err;
                                                                }
                                  
                              });
                              newFile = curFile + ' '+ study_nameDisplay[study_pathDisplay.indexOf(study_path_str)];
                                  // console.log('new file')
                                  // console.log(newFile);
                              changeFoldersName(newFile);
                            }
                            if(level == 3){
                              let series_path_str = curFile.substring(curFile.lastIndexOf('/')+1);
                              // console.log(series_path_str)
                              // console.log(series_nameDisplay[series_pathDisplay.indexOf(series_path_str)])
                              // console.log(modalityDisplay[series_pathDisplay.indexOf(series_path_str)])
                              fs.moveSync(curFile,curFile + ' '+ series_nameDisplay[series_pathDisplay.indexOf(series_path_str)]
                                + ' ' +modalityDisplay[series_pathDisplay.indexOf(series_path_str)], function (err) {
                                if (err) {
                                                                    logger.error({
                                                                        level: 'error',
                                                                        message: req.session.FirstName + ' ' + req.session.LastName
                                                                        + '(' + req.session.user_id[0] + ') unsuccessfully change series folder name from: '
                                                                        + curFile + ' to: ' + curFile + ' '+ series_nameDisplay[series_pathDisplay.indexOf(series_path_str)]
                                                                        + ' ' +modalityDisplay[series_pathDisplay.indexOf(series_path_str)]
                                                                        + '\n' + err
                                                                    });
                                                                    throw err;
                                                                }
                              });
                            }
                            
                            // let series_path_str = curFile.substring(curFile.lastIndexOf('/')+1);
                            // console.log(series_descriptionArr[series_pathArr.indexOf(series_path_str)]);
                            // console.log(modalityArr[series_pathArr.indexOf(series_path_str)]);
                            // console.log(series_descriptionArr[series_pathArr.indexOf(series_path_str)]+' '+modalityArr[series_pathArr.indexOf(series_path_str)]);
                            // fs.moveSync(curFile,curFile + ' '+ series_descriptionArr[series_pathArr.indexOf(series_path_str)]+' '+modalityArr[series_pathArr.indexOf(series_path_str)], function (err) {
                            //     if (err) throw err;
                            // });
                            // total+=1;
                            // // console.log(files.length)
                            // // console.log(total)
                            // // if (total === files.length){
                            // //     callback(null,total);
                            // // }
                            // curFile = curFile + ' '+ series_descriptionArr[series_pathArr.indexOf(series_path_str)]+' '+modalityArr[series_pathArr.indexOf(series_path_str)];
                          }
                        }
                      }
                    }
                    changeFoldersName(workSpace+'/'+req.params.experiments_name);
                    logger.info({
                                            level: 'info',
                                            message: req.session.FirstName + ' ' + req.session.LastName
                                            + '(' + req.session.user_id[0] + ') successfully change all folders name'
                                        });
                                        callback(null,total);
                  },function(arg,callback){
                                        logger.info({
                                            level: 'info',
                                            message: req.session.FirstName + ' ' + req.session.LastName
                                            + '(' + req.session.user_id[0] + ') WebSocket `/api/v1/experiment_download` experiment: '+ req.params.experiments_name
                                            +'\n[STEP 3]: add .dcm extension'
                                        });
                    let total=0;
                    function walkDir(currentPath) {
                      let files = fs.readdirSync(currentPath);
                      //console.log(files)
                      for (let i=0;i<files.length;i++) {
                        // console.log(currentPath);
                        // console.log(files[i]);
                        if(files[i]!=='.DS_Store'&&files[i]!=='DICOMDIR'){
                          let curFile = path.join(currentPath, files[i]);      
                          if (fs.statSync(curFile).isFile()&&path.extname(curFile)!=='.jpg') {   
                            total+=1;
                            fs.rename(curFile, curFile+'.dcm', function (err) {
                                if (err) throw err;
                            });
                          } else if (fs.statSync(curFile).isDirectory()) {
                            walkDir(curFile);
                          }
                        }
                      }
                    };
                    walkDir(workSpace+'/'+req.params.experiments_name);
                                        logger.info({
                                            level: 'info',
                                            message: req.session.FirstName + ' ' + req.session.LastName
                                            + '(' + req.session.user_id[0] + ') successfully add all .dcm extension'
                                        });
                    callback(null,total);
                  }],function(err,results){
                    // console.log('start zip');
                                        logger.info({
                                            level: 'info',
                                            message: req.session.FirstName + ' ' + req.session.LastName
                                            + '(' + req.session.user_id[0] + ') WebSocket `/api/v1/experiment_download` experiment: '+ req.params.experiments_name
                                            +'\n[STEP 4]: zip experiment folder'
                                        });
                    directorySize(workSpace+"/"+req.params.experiments_name,
                      function(err, size){
                        zipFolderWithProgress(ws, workSpace+"/"+req.params.experiments_name, workSpace+"/"+req.params.experiments_name+".zip", size/2, function(err) {
                          if(err) {
                            rimraf(workSpace+"/"+req.params.experiments_name, function () { console.log('rm -rf '+workSpace+"/"+req.params.experiments_name); });
                            // console.log(err);
                                                        logger.error({
                                                            level: 'error',
                                                            message: req.session.FirstName + ' ' + req.session.LastName
                                                            + '(' + req.session.user_id[0] + ') unsuccessfully zip experiment folder to '
                                                            + workSpace+"/"+req.params.experiments_name+".zip"
                                                            + '\n' + err
                                                        });
                          } else {
                            // console.log('EXCELLENT, zip done');
                                                        logger.info({
                                                            level: 'info',
                                                            message: req.session.FirstName + ' ' + req.session.LastName
                                                            + '(' + req.session.user_id[0] + ') successfully zip experiment folder to '
                                                            + workSpace+"/"+req.params.experiments_name+".zip"
                                                        });
                            ws.send(JSON.stringify({'err':'3','filePath':workSpace+"/"+req.params.experiments_name+".zip"}));
                            rimraf(workSpace+"/"+req.params.experiments_name, function () { console.log('rm -rf '+workSpace+"/"+req.params.experiments_name); });
                            // eventTracking('Experiment',req.session.user_id[0]);
                            ws.close();
                          }
                        })
                        // console.log(size)
                      }
                    )
                });
        })
    }
});
router.ws('/api/v1/study_download/:pat_path/:study_path/:pat_name/:study_description', function(ws, req) {
    

    if(req.session.status!=='Authenticated')
    {
        // console.log('true?');

        ws.send(JSON.stringify({'err':'1','msg':'Please login first or contact admin user to whitelist you'}));
        // console.log(JSON.stringify({'err':'1','msg':'Please login first or contact admin user to whitelist you'}));
        ws.close();
        // ws.send('Please login first or contact admin user to whitelist you2');
    }else{

        logger.info({
            level: 'info',
            message: req.session.FirstName + ' ' + req.session.LastName
            + '(' + req.session.user_id[0] + ') WebSocket `/api/v1/study_download` study: '+ req.params.study_description
        });
        var workSpace = __dirname+'/'+req.session.UserPrincipalName;
        var series_pathArr= req.query.series_path.split(",");
        var series_descriptionArr= req.query.series_description.split(",");
        var modalityArr= req.query.modality.split(",");

        // console.log(series_pathArr);
        async.waterfall([
            function(callback){
                logger.info({
                    level: 'info',
                    message: req.session.FirstName + ' ' + req.session.LastName
                    + '(' + req.session.user_id[0] + ') WebSocket `/api/v1/study_download` study: '+ req.params.study_description
                    +'\n[STEP 1]: copy files from scippy image archive'
                });
                if (!fs.existsSync(workSpace)){
                    fs.mkdir(workSpace,0o755,function(){
                        if (!fs.existsSync(workSpace+"/"+req.params.pat_name)){
                            fs.mkdir(workSpace+"/"+req.params.pat_name,0o755, function(err){

                                ncp(archive_root+req.params.pat_path+'/'+req.params.study_path, workSpace+'/'+req.params.pat_name , function (err) {
                                    if (err) {
                                        logger.error({
                                            level: 'error',
                                            message: req.session.FirstName + ' ' + req.session.LastName
                                            + '(' + req.session.user_id[0] + ') unsuccessfully copy files from scippy image archive ' 
                                            + archive_root+req.params.pat_path+'/'+req.params.study_path +' \n' + err
                                        });
                                        return console.error(err);
                                    }
                                    // console.log(archive_root+req.params.pat_path+'/'+req.params.study_path+ 'copies done!!!');
                                    logger.info({
                                        level: 'info',
                                        message: req.session.FirstName + ' ' + req.session.LastName
                                        + '(' + req.session.user_id[0] + ') successfully copy files from scippy image archive '
                                    });

                                    callback(null,workSpace+'/'+req.params.pat_name);

                                });

                            })
                        }else{

                            ncp(archive_root+req.params.pat_path+'/'+req.params.study_path, workSpace+'/'+req.params.pat_name , function (err) {
                                if (err) {
                                    logger.error({
                                        level: 'error',
                                        message: req.session.FirstName + ' ' + req.session.LastName
                                        + '(' + req.session.user_id[0] + ') unsuccessfully copy files from scippy image archive ' 
                                        + archive_root+req.params.pat_path+'/'+req.params.study_path +' \n' + err
                                    });
                                    return console.error(err);
                                }
                                // console.log(archive_root+req.params.pat_path+'/'+req.params.study_path+ ' copies done!!!');
                                logger.info({
                                    level: 'info',
                                    message: req.session.FirstName + ' ' + req.session.LastName
                                    + '(' + req.session.user_id[0] + ') successfully copy files from scippy image archive '
                                    + archive_root+req.params.pat_path+'/'+req.params.study_path
                                });
                                callback(null,workSpace+'/'+req.params.pat_name);

                            });

                        }
                    });
                }else{
                    if (!fs.existsSync(workSpace+"/"+req.params.pat_name)){
                        fs.mkdir(workSpace+"/"+req.params.pat_name,0o755, function(err){

                                ncp(archive_root+req.params.pat_path+'/'+req.params.study_path, workSpace+'/'+req.params.pat_name , function (err) {
                                    if (err) {
                                        logger.error({
                                            level: 'error',
                                            message: req.session.FirstName + ' ' + req.session.LastName
                                            + '(' + req.session.user_id[0] + ') unsuccessfully copy files from scippy image archive ' 
                                            + archive_root+req.params.pat_path+'/'+req.params.study_path +' \n' + err
                                        });
                                        return console.error(err);
                                    }
                                    // console.log(archive_root+req.params.pat_path+'/'+req.params.study_path+ 'copies done!!!');
                                    logger.info({
                                        level: 'info',
                                        message: req.session.FirstName + ' ' + req.session.LastName
                                        + '(' + req.session.user_id[0] + ') successfully copy files from scippy image archive '
                                        + archive_root+req.params.pat_path+'/'+req.params.study_path
                                    });
                                    callback(null,workSpace+'/'+req.params.pat_name);

                                });

                        })
                    }else{

                        ncp(archive_root+req.params.pat_path+'/'+req.params.study_path, workSpace+'/'+req.params.pat_name , function (err) {
                            if (err) {
                                logger.error({
                                    level: 'error',
                                    message: req.session.FirstName + ' ' + req.session.LastName
                                    + '(' + req.session.user_id[0] + ') unsuccessfully copy files from scippy image archive ' 
                                    + archive_root+req.params.pat_path+'/'+req.params.study_path +' \n' + err
                                });
                                return console.error(err);
                            }
                            logger.info({
                                level: 'info',
                                message: req.session.FirstName + ' ' + req.session.LastName
                                + '(' + req.session.user_id[0] + ') successfully copy files from scippy image archive '
                                + archive_root+req.params.pat_path+'/'+req.params.study_path
                            });
                            // console.log(archive_root+req.params.pat_path+'/'+req.params.study_path+ ' copies done!!!');
                            callback(null,workSpace+'/'+req.params.pat_name);

                        });

                    }
                }
            },function(arg,callback){
                logger.info({
                    level: 'info',
                    message: req.session.FirstName + ' ' + req.session.LastName
                    + '(' + req.session.user_id[0] + ') WebSocket `/api/v1/study_download` study: '+ req.params.study_description
                    +'\n[STEP 2]: change series folder name'
                });
                let total=0;
                // fs.stat(workSpace+'/'+req.params.pat_name, function(err, stats) {
                //     console.log(stats)
                // });
                // console.log(fs.statSync(workSpace+'/'+req.params.pat_name))
                var estimateSize = fs.statSync(workSpace+'/'+req.params.pat_name).size
                // console.log('estimateSize of '+workSpace+'/'+req.params.pat_name+' is around: ' + estimateSize)
                function changeSeriesFolderName(currentPath) {
                    let files = fs.readdirSync(currentPath);
                    //console.log(files)
                    for (let i=0;i<files.length;i++) {
                        // console.log(currentPath);
                        // console.log(files[i]);
                        if(files[i]!=='.DS_Store'&&files[i]!=='DICOMDIR'){
                            let curFile = path.join(currentPath, files[i]);
                            if (fs.statSync(curFile).isDirectory()) {
                                // console.log('-----------------subfolder(series) name is-----------------')
                                // console.log(curFile);
                                let series_path_str = curFile.substring(curFile.lastIndexOf('/')+1);
                                // console.log(series_descriptionArr[series_pathArr.indexOf(series_path_str)]);
                                // console.log(modalityArr[series_pathArr.indexOf(series_path_str)]);
                                // console.log(series_descriptionArr[series_pathArr.indexOf(series_path_str)]+' '+modalityArr[series_pathArr.indexOf(series_path_str)]);
                                fs.moveSync(curFile,curFile + ' '+ series_descriptionArr[series_pathArr.indexOf(series_path_str)]+' '+modalityArr[series_pathArr.indexOf(series_path_str)], function (err) {
                                    if (err) {
                                        logger.error({
                                            level: 'error',
                                            message: req.session.FirstName + ' ' + req.session.LastName
                                            + '(' + req.session.user_id[0] + ') unsuccessfully change series folder name from: '
                                            + curFile + ' to: ' + curFile + ' '+ series_descriptionArr[series_pathArr.indexOf(series_path_str)]+' '+modalityArr[series_pathArr.indexOf(series_path_str)]
                                            + '\n' + err
                                        });
                                        throw err
                                    };

                                });
                                total+=1;
                                // console.log(files.length)
                                // console.log(total)
                                // if (total === files.length){
                                //     callback(null,total);
                                // }
                                curFile = curFile + ' '+ series_descriptionArr[series_pathArr.indexOf(series_path_str)]+' '+modalityArr[series_pathArr.indexOf(series_path_str)];
                            }
                        }
                    }
                }
                changeSeriesFolderName(workSpace+'/'+req.params.pat_name);
                logger.info({
                    level: 'info',
                    message: req.session.FirstName + ' ' + req.session.LastName
                    + '(' + req.session.user_id[0] + ') successfully change all series folder name'
                });
                callback(null,estimateSize);
            },function(arg,callback){
                logger.info({
                    level: 'info',
                    message: req.session.FirstName + ' ' + req.session.LastName
                    + '(' + req.session.user_id[0] + ') WebSocket `/api/v1/study_download` study: '+ req.params.study_description
                    +'\n[STEP 3]: add .dcm extension'
                });
                let total=0;
                function walkDir(currentPath) {
                    let files = fs.readdirSync(currentPath);
                    //console.log(files)
                    for (let i=0;i<files.length;i++) {
                        // console.log(currentPath);
                        // console.log(files[i]);
                        if(files[i]!=='.DS_Store'&&files[i]!=='DICOMDIR'){
                            let curFile = path.join(currentPath, files[i]);      
                                if (fs.statSync(curFile).isFile()&&path.extname(curFile)!=='.jpg') {   
                                    total+=1;
                                    fs.rename(curFile, curFile+'.dcm', function (err) {
                                        if (err) throw err;
                                    });
                                } else if (fs.statSync(curFile).isDirectory()) {
                                    walkDir(curFile);
                                }
                        }
                    }
                };
                walkDir(workSpace+'/'+req.params.pat_name);
                logger.info({
                    level: 'info',
                    message: req.session.FirstName + ' ' + req.session.LastName
                    + '(' + req.session.user_id[0] + ') successfully add all .dcm extension'
                });
                callback(null,arg);
            }],function(arg,callback){
                logger.info({
                    level: 'info',
                    message: req.session.FirstName + ' ' + req.session.LastName
                    + '(' + req.session.user_id[0] + ') WebSocket `/api/v1/study_download` study: '+ req.params.study_description
                    +'\n[STEP 4]: zip study folder'
                });
                directorySize(workSpace+"/"+req.params.pat_name,
                    function(err, size){
                        zipFolderWithProgress(ws,workSpace+"/"+req.params.pat_name, workSpace+"/"+req.params.pat_name+".zip", size/2, function(err) {
                            if(err) {
                                rimraf(workSpace+"/"+req.params.pat_name, function () { 
                                    console.log('rm -rf '+workSpace+"/"+req.params.pat_name); 
                                });
                                logger.error({
                                    level: 'error',
                                    message: req.session.FirstName + ' ' + req.session.LastName
                                    + '(' + req.session.user_id[0] + ') unsuccessfully zip study folder to '
                                    + workSpace+"/"+req.params.pat_name+".zip"
                                    + '\n' + err
                                });
                                // console.log(err);
                            } else {
                                // console.log('EXCELLENT, zip done');
                                logger.info({
                                    level: 'info',
                                    message: req.session.FirstName + ' ' + req.session.LastName
                                    + '(' + req.session.user_id[0] + ') successfully zip study folder to '
                                    + workSpace+"/"+req.params.pat_name+".zip"
                                });
                                ws.send(JSON.stringify({'err':'3','filePath':workSpace+"/"+req.params.pat_name+".zip"}));
                                rimraf(workSpace+"/"+req.params.pat_name, function () { console.log('rm -rf '+workSpace+"/"+req.params.pat_name); });
                                // callback(null,workSpace+'/'+req.params.pat_name);
                                ws.close();
                            }
                        })
                    }
                )
            });
    }
});

router.ws('/api/v1/series_download/:pat_path/:study_path/:series_path/:series_description/:modality',(ws,req)=>{  //isAuth
    /*
        Query experiments
    */
    /*
        Testing params
    */
    /*
        Validation is need to auth user who does not have access to particular project
    */
    if(req.session.status!=='Authenticated')
    {
        ws.send(JSON.stringify({'err':'1','msg':'Please login first or contact admin user to whitelist you'}));
        // console.log(JSON.stringify({'err':'1','msg':'Please login first or contact admin user to whitelist you'}));
        ws.close();
        // ws.send('Please login first or contact admin user to whitelist you2');
    }else{
        logger.info({
            level: 'info',
            message: req.session.FirstName + ' ' + req.session.LastName
            + '(' + req.session.user_id[0] + ') WebSocket `/api/v1/series_download` series: '+ req.params.series_description
        });
        var workSpace = __dirname +'/'+req.session.UserPrincipalName;
        async.waterfall([
            function(callback){
                logger.info({
                    level: 'info',
                    message: req.session.FirstName + ' ' + req.session.LastName
                    + '(' + req.session.user_id[0] + ') WebSocket `/api/v1/series_download` series: '+ req.params.series_description
                    +'\n[STEP 1]: copy files from scippy image archive'
                });
                if (!fs.existsSync(workSpace)){
                    fs.mkdir(workSpace,0o755,function(){
                        if (!fs.existsSync(workSpace+"/"+req.params.series_description+ ' ' +req.params.modality)){
                            fs.mkdir(workSpace+"/"+req.params.series_description+ ' ' +req.params.modality,0o755, function(err){

                                    ncp(archive_root+req.params.pat_path+'/'+req.params.study_path+'/'+req.params.series_path, workSpace+'/'+req.params.series_description+ ' ' +req.params.modality , function (err) {
                                        if (err) {
                                            logger.error({
                                                level: 'error',
                                                message: req.session.FirstName + ' ' + req.session.LastName
                                                + '(' + req.session.user_id[0] + ') unsuccessfully copy files from scippy image archive ' 
                                                + archive_root+req.params.pat_path+'/'+req.params.study_path +'/'+req.params.series_path 
                                                + ' \n' + err
                                            });
                                            return console.error(err);
                                        }
                                        logger.info({
                                            level: 'info',
                                            message: req.session.FirstName + ' ' + req.session.LastName
                                            + '(' + req.session.user_id[0] + ') successfully copy files from scippy image archive '
                                        });
                                        // console.log(archive_root+req.params.pat_path+'/'+req.params.study_path+'/'+req.params.series_path+ 'copies done!!!');

                                        callback(null,workSpace+'/'+req.params.series_description+ ' ' +req.params.modality);

                                    });

                            })
                        }else{

                            ncp(archive_root+req.params.pat_path+'/'+req.params.study_path+'/'+req.params.series_path, workSpace+'/'+req.params.series_description+ ' ' +req.params.modality , function (err) {
                                if (err) {
                                    logger.error({
                                        level: 'error',
                                        message: req.session.FirstName + ' ' + req.session.LastName
                                        + '(' + req.session.user_id[0] + ') unsuccessfully copy files from scippy image archive ' 
                                        + archive_root+req.params.pat_path+'/'+req.params.study_path +'/'+req.params.series_path 
                                        + ' \n' + err
                                    });
                                    return console.error(err);
                                }
                                logger.info({
                                    level: 'info',
                                    message: req.session.FirstName + ' ' + req.session.LastName
                                    + '(' + req.session.user_id[0] + ') successfully copy files from scippy image archive '
                                    + archive_root+req.params.pat_path+'/'+req.params.study_path +'/'+req.params.series_path 
                                });
                                // console.log(archive_root+req.params.pat_path+'/'+req.params.study_path+'/'+req.params.series_path+ ' copies done!!!');

                                callback(null,workSpace+'/'+req.params.series_description+ ' ' +req.params.modality);

                            });

                        }
                    });
                }else{
                    if (!fs.existsSync(workSpace+"/"+req.params.series_description+ ' ' +req.params.modality)){
                            fs.mkdir(workSpace+"/"+req.params.series_description+ ' ' +req.params.modality,0o755, function(err){

                                    ncp(archive_root+req.params.pat_path+'/'+req.params.study_path+'/'+req.params.series_path, workSpace+'/'+req.params.series_description+ ' ' +req.params.modality , function (err) {
                                        if (err) {
                                            logger.error({
                                                level: 'error',
                                                message: req.session.FirstName + ' ' + req.session.LastName
                                                + '(' + req.session.user_id[0] + ') unsuccessfully copy files from scippy image archive ' 
                                                + archive_root+req.params.pat_path+'/'+req.params.study_path +'/'+req.params.series_path 
                                                + ' \n' + err
                                            });
                                            return console.error(err);
                                        }
                                        // console.log(archive_root+req.params.pat_path+'/'+req.params.study_path+'/'+req.params.series_path+ 'copies done!!!');
                                        logger.info({
                                            level: 'info',
                                            message: req.session.FirstName + ' ' + req.session.LastName
                                            + '(' + req.session.user_id[0] + ') successfully copy files from scippy image archive '
                                            + archive_root+req.params.pat_path+'/'+req.params.study_path +'/'+req.params.series_path 
                                        });
                                        callback(null,workSpace+'/'+req.params.series_description+ ' ' +req.params.modality);

                                    });

                            })
                        }else{

                            ncp(archive_root+req.params.pat_path+'/'+req.params.study_path+'/'+req.params.series_path, workSpace+'/'+req.params.series_description+ ' ' +req.params.modality , function (err) {
                                if (err) {
                                    logger.error({
                                        level: 'error',
                                        message: req.session.FirstName + ' ' + req.session.LastName
                                        + '(' + req.session.user_id[0] + ') unsuccessfully copy files from scippy image archive ' 
                                        + archive_root+req.params.pat_path+'/'+req.params.study_path +'/'+req.params.series_path 
                                        + ' \n' + err
                                    });
                                    return console.error(err);
                                }
                                // console.log(archive_root+req.params.pat_path+'/'+req.params.study_path+'/'+req.params.series_path+ ' copies done!!!');
                                logger.info({
                                    level: 'info',
                                    message: req.session.FirstName + ' ' + req.session.LastName
                                    + '(' + req.session.user_id[0] + ') successfully copy files from scippy image archive '
                                    + archive_root+req.params.pat_path+'/'+req.params.study_path +'/'+req.params.series_path 
                                });
                                callback(null,workSpace+'/'+req.params.series_description+ ' ' +req.params.modality);

                            })

                        }
                }
            },function(arg,callback){
                logger.info({
                    level: 'info',
                    message: req.session.FirstName + ' ' + req.session.LastName
                    + '(' + req.session.user_id[0] + ') WebSocket `/api/v1/series_download` series: '+ req.params.series_description
                    +'\n[STEP 2]: add .dcm extension'
                });
                let total=0;
                function walkDir(currentPath) {
                    let files = fs.readdirSync(currentPath);
                    //console.log(files)
                    for (let i=0;i<files.length;i++) {
                        // console.log(currentPath);
                        // console.log(files[i]);
                        if(files[i]!=='.DS_Store'&&files[i]!=='DICOMDIR'){
                            let curFile = path.join(currentPath, files[i]);      
                                if (fs.statSync(curFile).isFile()&&path.extname(curFile)!=='.jpg') {   
                                    total+=1;
                                    fs.rename(curFile, curFile+'.dcm', function (err) {
                                        if (err) throw err;
                                    });
                                } else if (fs.statSync(curFile).isDirectory()) {
                                    walkDir(curFile);
                                }
                        }
                    }
                };
                walkDir(workSpace+'/'+req.params.series_description+ ' ' +req.params.modality);
                logger.info({
                    level: 'info',
                    message: req.session.FirstName + ' ' + req.session.LastName
                    + '(' + req.session.user_id[0] + ') successfully add all .dcm extension'
                });
                callback(null,total);
            }],function(arg,callback){
                logger.info({
                    level: 'info',
                    message: req.session.FirstName + ' ' + req.session.LastName
                    + '(' + req.session.user_id[0] + ') WebSocket `/api/v1/series_download` series: '+ req.params.series_description
                    +'\n[STEP 3]: zip study folder'
                });
                directorySize(workSpace+"/"+req.params.series_description+ ' ' +req.params.modality,
                    function(err, size){
                        zipFolderWithProgress(ws,workSpace+"/"+req.params.series_description+ ' ' +req.params.modality, workSpace+"/"+req.params.series_description+ ' ' +req.params.modality+".zip", size/2, function(err) {
                            if(err) {
                                rimraf(workSpace+"/"+req.params.series_description+ ' ' +req.params.modality, function () { console.log('rm -rf '+workSpace+"/"+req.params.series_description+ ' ' +req.params.modality); });
                                // console.log(err);
                                logger.error({
                                    level: 'error',
                                    message: req.session.FirstName + ' ' + req.session.LastName
                                    + '(' + req.session.user_id[0] + ') unsuccessfully zip series folder to '
                                    + workSpace+"/"+req.params.series_description+ ' ' +req.params.modality+".zip"
                                    + '\n' + err
                                });
                            } else {
                                logger.info({
                                    level: 'info',
                                    message: req.session.FirstName + ' ' + req.session.LastName
                                    + '(' + req.session.user_id[0] + ') successfully zip series folder to '
                                    + workSpace+"/"+req.params.series_description+ ' ' +req.params.modality+".zip"
                                });
                                // console.log('EXCELLENT, zip done');
                                ws.send(JSON.stringify({'err':'3','filePath':workSpace+"/"+req.params.series_description+ ' ' +req.params.modality+".zip"}));
                                rimraf(workSpace+"/"+req.params.series_description+ ' ' +req.params.modality, function () { console.log('rm -rf '+workSpace+"/"+req.params.series_description+ ' ' +req.params.modality); });
                                // callback(null,workSpace+'/'+req.params.pat_name);
                                ws.close();
                            }
                        })
                    }
                )
            });
    }
});

router.get('/api/v1/downloadZip',isAuth,(req,res,next)=>{  //isAdmin
    // console.log('downloadZip');
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') GET `/api/v1/downloadZip` path: '+ req.query.absolutePath
    });
    let downloadAbsolutePath = req.query.absolutePath;
    res.download(downloadAbsolutePath,function(err){
        if(err) throw err;
        logger.info({
            level: 'info',
            message: req.session.FirstName + ' ' + req.session.LastName
            + '(' + req.session.user_id[0] + ') successfully download zip file path: '+ req.query.absolutePath
        });
     // rimraf(__dirname+"/"+req.params.experiments_name, function () { console.log('rm -rf '+__dirname+"/"+req.params.experiments_name); });
        fs.unlink(downloadAbsolutePath);
        eventTracking('Experiment',req.session.user_id[0]);
    });
});

router.get('/api/v1/accessRequests_overview',isAdmin,(req,res,next)=>{   //is admin
    /*
        Query access requests
    */
    var results=[];
    mysqlcon.getConnection((err,connection)=>{
        if(err) throw err;
        //FOR mariadb10.2.8
        var query = connection.query("SELECT * FROM request_users;");
        query.on('result',(row)=>{
                results.push(row);
        });
        query.on('end',()=>{
            connection.release();
            return res.json(results);
        });
    });
});

router.post('/api/v1/accessRequests',isAdmin,(req,res,next)=>{   //is admin
    /*
        Query review requests
    */

    req.checkBody('id','id cannot be empty').notEmpty();
    req.checkBody('id','id should be an integer<int(11)>').isInt();
    req.checkBody('decision','decision cannot be empty').notEmpty();
    req.checkBody('decision','decision should be an integer<int(11)>').isInt();

    var errors = req.validationErrors();

    if(errors){
        return res.json({'err':1,errors});
    }
    else{
        let decision = req.body.decision;
        let id = req.body.id;
        var results=[];
        mysqlcon.getConnection((err,connection)=>{
            if(err) throw err;
            if(decision == 1){
                //FOR mariadb10.2.8
                var query = connection.query("UPDATE request_users SET status='approval' WHERE id=?;",[id]);
                query.on('result',(row)=>{
                        results.push(row);
                });
                query.on('end',()=>{
                    console.log('Approval');
                    connection.release();
                    return res.json({code:1,request:'Approval'});
                });
            }else{
                var query = connection.query("UPDATE request_users SET status='denied' WHERE id=?;",[id]);
                query.on('result',(row)=>{
                        results.push(row);
                });
                query.on('end',()=>{
                    console.log('Denied')
                    connection.release();
                    return res.json({code:0,msg:'Denied'});
                });
            }
            
        });
    }
});
module.exports = router;
