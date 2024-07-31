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

const doc_root = config.get('filesystemConfig.doc_root');
const archive_root = config.get('filesystemConfig.archive_root');
const intermediate_storage = config.get('filesystemConfig.intermediate_storage');

const mysqlConfig = config.get('dbConfig.mysql');
const postgresConfig = config.get('dbConfig.postgres');

router.use(fileUpload());
router.use(validator({
    customValidators: {
        isArrayOfInt: function (value) {
            return Array.isArray(value) && Number.isInteger(parseInt(value[0]));
        }}
}));
router.use(cors({credentials:true,origin:['http://fr-s-ivg-ssr-d1:8080',
                                           'http://ivg-boxx:8082',
                                           'http://localhost:8000',
                                           'http://localhost:9876',                     //for jasmine testing
                                           'http://localhost:8889',
                                           'http://frsivg-mip01p:8888',
                                           'https://frsivg-mip01p.ncifcrf.gov/']}));  //for cross domin with cookie credientials
/* GET home page. */
router.get('/api/v1/scippy/', function(req, res) {
  res.render('index', { title: 'Express' });
});


const pg = require('pg');

pg.types.setTypeParser(1114, function(stringValue) {
  return new Date(Date.parse(stringValue + "+0000"));
});

connectionString = process.env.DATABASE_URL || postgresConfig;
var session = require('express-session');
var identityKey = 'skey';
var FileStore = require("session-file-store")(session);

router.use(session({
    name: identityKey,
    secret: 'tymiao',
    store: new FileStore,
    saveUninitialized: false,
    resave: false,
    cookie: {
        maxAge: 2*60*60*1000,
        httpOnly: true,
        secure: true
    }
}));

var isAdmin = function(req, res, next) {
    if(req.session.group_id.includes(7)) {
        return next();
    } else {
        return res.json({'err': '1', 'msg': 'Contact Admin user to gain permission.'});
    }
}


var isAuth = function (req, res, next) {
    if (req.session.status === 'Authenticated') {
        return next();
    } else {
        return res.json({'err': '1', 'msg': 'Please login first or contact admin user to whitelist you.'});
    }
}

function stringFilter(str){
    return str.replace(/[^A-Za-z0-9]/g, '');
}

const mysql = require('mysql');
var mysqlcon = mysql.createPool(mysqlConfig);

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
            });
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
    zipArchive.on('progress', function() {
        let prettyCurrentSize = bytesToSize(zipArchive.pointer());
        var percent = 100 - ((totalSize - zipArchive.pointer()) / totalSize) * 100;
        // check if webSocket is alive
        if (webSocket.readyState === 1) {
            webSocket.send(JSON.stringify({'err':'2','msg':' ' + prettyCurrentSize + '/' + prettyTotalSize + '('+parseInt(percent)+'%)'}));  
        } else {
            fs.unlink(zipFilePath);
            callback();
        }
    });
    zipArchive.pipe(output);

    zipArchive.directory(srcFolder, false);

    zipArchive.finalize(function(err, bytes) {
        if(err) {
            callback(err);
        }
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
}

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

  var workSpace = intermediate_storage + req.session.UserPrincipalName;
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

router.ws('/api/v1/experiment_download/:experiment_id/:experiments_name', function(ws, req) {
    if (req.session.status !== 'Authenticated') {
        ws.send(JSON.stringify({'err': '1','msg': 'Please login first or contact admin user to whitelist you'}));
        ws.close();
    } else {
        logger.info({
            level: 'info',
            message: req.session.FirstName + ' ' + req.session.LastName
                     + '(' + req.session.user_id[0] + ') WebSocket `/api/v1/experiment_download` experiment: '+ req.params.experiments_name
        });
        let experiment_id = req.params.experiment_id;
        let results = [];
        let allPatientsPath_result = [];
        var workSpace = intermediate_storage + req.session.UserPrincipalName;
        async.waterfall([
            function(callback) {
                logger.info({
                    level: 'info',
                    message: req.session.FirstName + ' ' + req.session.LastName
                             + '(' + req.session.user_id[0] + ') WebSocket `/api/v1/experiment_download` experiment: '+ req.params.experiments_name
                             +'\n[PRE-STEP 1]: get all patients id'
                });
                mysqlcon.getConnection((err, connection) => {
                    if(err) throw err;
                    var query = connection.query("SELECT * FROM imaging_participants WHERE experiment_id=?;", experiment_id);
                    query.on('result', (row) => {
                        results.push(row['patient_id']);
                    });
                    query.on('end', () => {
                        connection.release();
                        callback(null,results);
                    });
                });
            }, function(arg, callback) {
                logger.info({
                    level: 'info',
                    message: req.session.FirstName + ' ' + req.session.LastName
                             + '(' + req.session.user_id[0] + ') WebSocket `/api/v1/experiment_download` experiment: '+ req.params.experiments_name
                             +'\n[PRE-STEP 2]: get all patients related information'
                });
                pg.connect(connectionString, (err, client, done) => {
                    if(err) throw err;
                    var query = client.query("SELECT t2.*,id AS series_id,series_path,series_description,modality \
                                            FROM (SELECT  id AS study_id, t1.*, study_description,study_path FROM \
                                            (SELECT id AS pat_id,pat_path,pat_name FROM patients WHERE id in ("+arg+")) AS t1 LEFT JOIN \
                                            studies ON t1.pat_id = studies.pat_id) AS t2 LEFT JOIN series ON t2.study_id=series.study_id;");
                    query.on('row', (row) => {
                        let eachIndex = [];
                        eachIndex.push(row['pat_name']);
                        eachIndex.push(row['pat_path']);
                        eachIndex.push(row['study_description']);
                        eachIndex.push(row['study_path']);
                        eachIndex.push(row['series_description']);
                        eachIndex.push(row['series_path']);
                        eachIndex.push(row['modality']);
                        allPatientsPath_result.push(eachIndex);
                    });
                    query.on('end', () => {
                        done();
                        callback(null,allPatientsPath_result)
                    });
                });
            }],function(err, results) {
                logger.info({
                    level: 'info',
                    message: req.session.FirstName + ' ' + req.session.LastName
                             + '(' + req.session.user_id[0] + ') WebSocket `/api/v1/experiment_download` experiment: '+ req.params.experiments_name
                             +'\n[STEP 1]: copy files from scippy image archive'
                });
                async.waterfall([
                  function(callback){
                    if (!fs.existsSync(workSpace)){
                        fs.mkdir(workSpace, 0o755, function() {
                            if (!fs.existsSync(workSpace + "/" + req.params.experiments_name)) {
                                // console.log('-------------------in if------------------')
                                fs.mkdir(workSpace + "/" + req.params.experiments_name, 0o755, function(err) {
                                    let ifAllCopied = [];
                                    let notExistFolder = 0;
                                    for (let a = 0; a < results.length; a++) {
                                        if (fs.existsSync(archive_root+results[a][1])){
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
                                                if ((ifAllCopied.length + notExistFolder) == results.length) {
                                                    callback(null, results);
                                                }
                                            });
                                        } else {
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
                            } else {
                                let ifAllCopied = [];
                                let notExistFolder = 0;
                                // console.log('-------------------in else------------------')
                                for (let a = 0; a < results.length; a++) {
                                    if (fs.existsSync(archive_root+results[a][1])) {
                                        ncp(archive_root+results[a][1], workSpace+'/'+req.params.experiments_name+'/'+results[a][0]+' '+results[a][1], function (err) {
                                            ifAllCopied.push(a)
                                            if (err) {
                                                if (err[0].code === 'ENOSPC') {
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
                                            if ((ifAllCopied.length + notExistFolder) == results.length) {
                                                callback(null, results);
                                            }
                                        });
                                    } else {
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
                    } else {
                      if (!fs.existsSync(workSpace+"/"+req.params.experiments_name)){
                       // console.log('-------------------in if within else------------------')
                        fs.mkdir(workSpace+"/"+req.params.experiments_name,0o755, function(err){
                          // console.log('start cp')
                          let unique_patient_paths = [],
                              unique_patient_names = [];

                          for (let a = 0; a < results.length; a++) {
                            if (!unique_patient_paths.includes(results[a][1])) {
                                unique_patient_paths.push(results[a][1])
                                unique_patient_names.push(results[a][0])
                            }
                          }
                          let ifAllCopied=[];
                          let notExistFolder = 0;
                          for(let a=0;a<unique_patient_paths.length;a++){
                            if (fs.existsSync(archive_root+unique_patient_paths[a])){
                              // console.log(results[a][1])
                              let dst = workSpace+'/'+req.params.experiments_name+'/'+unique_patient_names[a]+' '+unique_patient_paths[a];
                              fs.emptyDirSync(dst);
                              fs.copy(archive_root+unique_patient_paths[a], dst, function (err) {
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
                                if((ifAllCopied.length+notExistFolder)==unique_patient_paths.length){
                                  callback(null,results);
                                }
                              });
                            }else{
                                logger.warn({
                                    level: 'warn',
                                    message: req.session.FirstName + ' ' + req.session.LastName
                                    + '(' + req.session.user_id[0] + ') unsuccessfully copy files from scippy image archive ' 
                                    + ' \n' + archive_root+unique_patient_paths[a] + 'is not exist'
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
                    let pat_nameDisplay = [];
                    let pat_pathDisplay = [];
                    let study_nameDisplay = [];
                    let study_pathDisplay = [];
                    let series_nameDisplay = [];
                    let series_pathDisplay = [];
                    let modalityDisplay = [];
                    for(let a = 0; a < arg.length; a++) {
                      pat_nameDisplay.push(arg[a][0]);
                      pat_pathDisplay.push(arg[a][1]);
                      // replace / to avoid folder hierarchy misunderstanding
                      study_nameDisplay.push(arg[a][2].replace('/', '_'));
                      study_pathDisplay.push(arg[a][3]);
                      series_nameDisplay.push(arg[a][4]);
                      series_pathDisplay.push(arg[a][5]);
                      modalityDisplay.push(arg[a][6]);
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
                            // Check if websocket is still alive
                            if (ws.readyState === 1) { 
                                ws.send(JSON.stringify({'err':'3','filePath':workSpace+"/"+req.params.experiments_name+".zip"}));
                            }
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
        var workSpace = intermediate_storage + req.session.UserPrincipalName;
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
                                // Check if websocket is still alive
                                if (ws.readyState === 1) { 
                                    ws.send(JSON.stringify({'err':'3','filePath':workSpace+"/"+req.params.pat_name+".zip"}));
                                }
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
        var workSpace = intermediate_storage + req.session.UserPrincipalName;
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
                                // Check if websocket is still alive
                                if (ws.readyState === 1) { 
                                    ws.send(JSON.stringify({'err':'3','filePath':workSpace+"/"+req.params.series_description+ ' ' +req.params.modality+".zip"}));
                                }
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
