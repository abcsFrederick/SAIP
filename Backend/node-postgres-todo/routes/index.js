var express = require('express');
var app = express();
var router = express.Router();
var cors = require('cors');

var fs = require('fs');
var path = require('path');
var zipFolder = require('zip-folder');

var archiver = require('archiver');

var ncp = require('ncp').ncp;
var async = require('async');
/*
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
*/
router.use( cors({credentials:true,origin:['http://fr-s-ivg-ssr-d1:8080',
                                           'http://ivg-boxx:8082',
                                           'http://localhost:8888',
                                           'http://frsivg-mip01p:8888',
                                           'https://frsivg-mip01p.ncifcrf.gov/']}));  //for cross domin with cookie credientials

//router.all('*', cors());
/* GET home page. */
router.get('/api/v1/scippy/', function(req, res) {
  res.render('index', { title: 'Express' });
});


const pg = require('pg');
const connectionString = process.env.DATABASE_URL || 'postgres://scippy_readonly:cardio372@fr-s-ivg-mip-s:5432/scippy';
//const connectionString = process.env.DATABASE_URL || 'postgres://miaot2:luying0325@localhost:5432/miaot2';
//const connectionString = process.env.DATABASE_URL || 'postgres://miaot2:luying0325@ivg-boxx:5432/miaot2';
var session = require('express-session');
var identityKey = 'skey';
var FileStore = require("session-file-store")(session);

router.use(session({
  name:identityKey,
  secret:'tymiao',
  store:new FileStore(),
  saveUninitialized:false,
  resave:false,
  cookie:{
    maxAge:2*60*60*1000
  }
}));

var isAuth = function(req,res,next){
//    console.log('in isAuth');
    console.log(req.session.status);
    if(req.session.status=='Authenticated')
    {
 //       console.log('true?');
        return next();
    }
    //res.redirect('/')
    res.redirect('https://authtest.nih.gov/siteminderagent/SmMakeCookie.ccc?NIHSMSESSION=QUERY&PERSIST=0&TARGET=-SM-HTTPS%3a%2f%2fncif--f5%2encifcrf%2egov%2fSignIn%2fNihLoginIntegration%2eaxd%3freturnUrl%3dhttp-%3a-%2f-%2flocalhost%3a8888')
}

function stringFilter(str){
    return str.replace(/[^A-Za-z0-9]/g, '');
}
router.get('/api/v1/scippy/date=:from.:to/patient=:name',isAuth,(req,res,next)=>{
//        console.log('in query');
        const results = [];
     //   console.log(req.session);
        //console.log("SELECT * FROM patients WHERE mod_time >= '"+req.params.from+"' and mod_time <= '"+req.params.to+"' and pat_name LIKE '%"+req.params.name+"%'");
        pg.connect(connectionString,(err,client,done)=>{
               if(err){
                        done();
                        console.log(err);
                        return res.status(500),json({success:false,data:err});
                }
                if(req.params.name == 'none'){
                    var dateFrom = stringFilter(req.params.from);
                    var dateTo = stringFilter(req.params.to);
                //	var query = client.query("SELECT patients.pat_name AS patient, patients.id AS patient_id, studies.pat_id AS pat_id, studies.id AS study_id, studies.study_description AS study_description, patients.pat_path AS patient_path, studies.study_path AS study_path FROM patients LEFT JOIN studies ON patients.id = studies.pat_id WHERE patients.mod_time >= '"+dateFrom+"' and patients.mod_time <= '"+dateTo+"' \
                //									 and patients.pat_name LIKE '%%' ORDER BY patient_id");
                    var query = client.query("SELECT DISTINCT ON (t2.serie_id) * FROM(SELECT t1.study_description AS study_description, \
                        t1. patient AS patient, t1.patient_id AS patient_id, t1.study_id AS study_id, series.id AS serie_id, t1.patient_path AS patient_path, \
                        t1.study_path AS study_path, series.series_path AS serie_path, series.modality AS modality, series.series_description AS serie_description, \
                        series.series_uid AS serie_uid, series.mod_time AS series_mod_time, images.filename AS image_name From (SELECT patients.pat_name AS patient, patients.id AS patient_id, \
                        studies.pat_id AS pat_id, studies.id AS study_id, studies.study_description AS study_description, patients.pat_path AS patient_path, \
                        studies.study_path AS study_path FROM patients LEFT JOIN studies ON patients.id = studies.pat_id \
                        WHERE patients.mod_time >= '"+req.params.from+"' and patients.mod_time <= '"+req.params.to+"' and patients.pat_name LIKE '%%') AS t1 \
                        LEFT JOIN series ON t1.study_id = series.study_id LEFT JOIN images ON series.id = images.series_id ORDER BY patient_id) AS t2");
                }
                else{
                    queryParams = stringFilter(req.params.name);
                    console.log(queryParams);
                	var query = client.query("SELECT patients.pat_name AS patient, patients.id AS patient_id, studies.pat_id AS pat_id, studies.id AS study_id, studies.study_description AS study_description, patients.pat_path AS patient_path, studies.study_path AS study_path FROM patients LEFT JOIN studies ON patients.id = studies.pat_id WHERE patients.mod_time >= '"+req.params.from+"' and patients.mod_time <= '"+req.params.to+"' \
                									 and (LOWER(patients.pat_name) LIKE LOWER('%"+queryParams+"%') or LOWER(studies.study_description) LIKE LOWER('%"+queryParams+"%')) ORDER BY patient_id");
                }
                
                query.on('row',(row)=>{

                        results.push(row);
                });
                query.on('end',()=>{
                        done();
                        return res.json(results);
                });
        });
});


router.get('/api/v1/scippy/study=:id',isAuth,(req,res,next)=>{
        const results = [];
        console.log(req.params);
        //console.log("SELECT * FROM patients WHERE mod_time >= '"+req.params.from+"' and mod_time <= '"+req.params.to+"' and pat_name LIKE '%"+req.params.name+"%'");
        pg.connect(connectionString,(err,client,done)=>{
               if(err){
                        done();
                        console.log(err);
                        return res.status(500),json({success:false,data:err});
                }

                var query = client.query("SELECT DISTINCT ON (serie_id) * FROM (SELECT studies.id AS study_id, series.study_id AS stu_id, series.modality AS modality, series.series_description AS serie_description, series.series_path AS serie_path, series.series_uid AS serie_uid, series.id AS serie_id, images.filename AS image_name FROM studies LEFT JOIN series ON studies.id = series.study_id LEFT JOIN images ON series.id = images.series_id  WHERE study_id = '"+req.params.id+"' ORDER BY study_id) AS referenceTable");
               
                query.on('row',(row)=>{

                        results.push(row);
                });
                query.on('end',()=>{
                        done();
                        return res.json(results);
                });
        });
});
router.get('/api/v1/scippy/downloadSeries/:patientPath/:studyPath/:seriePath/:patientName/:Modality',isAuth,(req,res,next)=>{

    var seriePathArr=req.params.seriePath.split(",");
    var modalityArr=req.params.Modality.split(",");


    var total=[];
    for(let a=0;a < seriePathArr.length;a++){
        let index=[];
        index.push(seriePathArr[a]);
        index.push(modalityArr[a]);
        total.push(index);
    };

	console.log(total);

    var archive = archiver('zip',{
          zlib: { level: 1 } // Sets the compression level.
        });

    var output = fs.createWriteStream(__dirname+"/"+req.params.patientName+' '+req.params.Modality+'.zip');

    output.on('close', function() {
        console.log(archive.pointer() + ' total bytes');
        console.log('archiver has been finalized and the output file descriptor has closed.');
        res.header("Access-Control-Expose-Headers", "Content-Disposition");
        res.download(__dirname+"/"+req.params.patientName+' '+req.params.Modality+'.zip',__dirname+"/"+req.params.patientName+'.zip',function(err){
                                //CHECK FOR ERROR
                                fs.unlink(__dirname+"/"+req.params.patientName+' '+req.params.Modality+'.zip');
                            });   
    });

    archive.on('error', function(err) {
        throw err;
    });

    archive.pipe(output);

    for(let a=0;a<total.length;a++){
        archive.directory('/mnt/scippy_images/'+req.params.patientPath+'/'+req.params.studyPath+'/'+total[a][0], req.params.patientName+' '+total[a][0] , { date: new Date() });
    }
    archive.finalize();

	/*zipFolder(filePath,__dirname+"/"+req.params.patientName+' '+req.params.Modality+'.zip',function(err){
		if(err){
			console.log("ops!"+err);
		}else{
			console.log("package done");
			var stats = fs.statSync(__dirname+"/"+req.params.patientName+' '+req.params.Modality+".zip");
			if(stats.isFile){
               res.download(__dirname+"/"+req.params.patientName+' '+req.params.Modality+".zip",req.params.patientName+' '+req.params.Modality+".zip")
			}else
			{
				res.end(404)
			}
		}
	});*/
	
});
router.get('/api/v1/scippy/downloadStudy/:patientPath/:studyPath',isAuth,(req,res,next)=>{


    var filePath = path.join(__dirname,'./empty');
    filePath = '/mnt/scippy_images/'+req.params.patientPath+'/'+req.params.studyPath;
    console.log(filePath);

    zipFolder(filePath,__dirname+"/"+req.params.studyPath+'.zip',function(err){
            if(err){
                console.log("ops!"+err);
            }else{
                console.log("package done");
                var stats = fs.statSync(__dirname+"/"+req.params.studyPath+".zip");
                if(stats.isFile){
                /*        res.set({
                                'Content-Type':'application/zip',
                                'Content-Disposition':'attachment; filename='+req.params.studyPath+'.zip',
                                "Content-Transfer-Encoding": "binary",
                                'Content-Length':stats.size
                        });
                        fs.createReadStream(__dirname+"/"+req.params.studyPath+".zip").pipe(res);
                //        fs.unlinkSync(__dirname+"/"+req.params.studyPath+".zip");
                */
                    res.download(__dirname+"/"+req.params.studyPath+".zip",req.params.studyPath+".zip")        
                }else
                {
                        res.end(404)
                }
            }
    });
        
});
router.get('/api/v1/scippy/downloadAllStudies/:patientPath/:studyPath/:patientName/:study_description',isAuth,(req,res,next)=>{
    var patientPathArr=req.params.patientPath.split(",");
    var studyPathArr=req.params.studyPath.split(",");
    var patientNameArr=req.params.patientName.split(",");
    console.log(studyPathArr);
    var itemsProcessed = 0;
    var total=[];
    for(let a=0;a < studyPathArr.length;a++){
        let index=[];
        index.push(patientPathArr[a]);
        index.push(studyPathArr[a]);
        index.push(patientNameArr[a]);
        total.push(index);
    };

    console.log(total);

    var archive = archiver('zip',{
          zlib: { level: 1 } // Sets the compression level.
        });

    var output = fs.createWriteStream(__dirname +"/"+ req.params.study_description+'.zip');

    output.on('close', function() {
        console.log(archive.pointer() + ' total bytes');
        console.log('archiver has been finalized and the output file descriptor has closed.');
    //    fs.createReadStream(__dirname+"/"+req.params.study_description+".zip").pipe(res);
    //    fs.unlinkSync(__dirname+"/"+req.params.study_description+".zip");
        res.header("Access-Control-Expose-Headers", "Content-Disposition");
        res.download(__dirname+"/"+req.params.study_description+".zip",req.params.study_description+".zip"
                            ,function(err){
                                //CHECK FOR ERROR
                                fs.unlink(__dirname+"/"+req.params.study_description+".zip");
                            });
    });
    archive.on('error', function(err) {
        throw err;
    });

    archive.pipe(output);

    for(let a=0;a<total.length;a++){
        console.log(total[a][0]+'/'+total[a][1]);
        archive.directory('/mnt/scippy_images/'+total[a][0]+'/'+total[a][1], req.params.study_description+'/'+total[a][2] , { date: new Date() });
    }

    archive.finalize();
  /*  async.each(total, function(file, callback) {

        // Perform operation on file here
        
    //    console.log('copy file ' + file);
        if( file==null ) {
          console.log('no that file');
          callback('File name too long');
        } else {
          // Do work to process file here
          ncp('/mnt/scippy_images/'+file[0]+'/'+file[1],
                __dirname+"/"+req.params.study_description, function (err) {
                    console.log('copy file ' + file[0] +'/'+file[1]);
                    console.log('File processed');
        });
          callback();
        }
    }, function(err) {
        // if any of the file processing produced an error, err would equal that error
        if( err ) {
          // One of the iterations produced an error.
          // All processing will now stop.
          console.log('A file failed to process');
        } else {
          console.log('All files have been processed successfully');
        }
    });
/*
    studyPathArr.forEach(function(value,index){
        console.log('done'+index);
      /*  ncp('/mnt/scippy_images/'+patientPathArr[index]+'/'+studyPathArr[index],
            __dirname+"/"+req.params.study_description, function (err) {
            /*if (err) {
                return console.error(err);
            }*/
    /*        console.log('done_'+index);
        });
    */
 //   },function(err){console.log('done_all');});
   /* for (let a=0;a<studyPathArr.length;a++)
    {   
        console.log(patientPathArr[a],studyPathArr[a]);

        ncp('/mnt/scippy_images/'+patientPathArr[a]+'/'+studyPathArr[a],
            __dirname+"/"+req.params.study_description, function (err) {
            console.log('done_'+a);
        });
        if(studyPathArr.length-1==a){
            callback();
        }
    }      
    console.log(__dirname+"/"+req.params.study_description);
    */
 //   filePath = '/mnt/scippy_images/'+req.params.patientPath+'/'+req.params.studyPath;


  //  console.log('done_all');
/*    zipFolder(__dirname+"/"+req.params.study_description,__dirname+"/"+req.params.study_description+'.zip',function(err){
            if(err){
                console.log("ops!"+err);
            }else{
                console.log("package done");
                var stats = fs.statSync(__dirname+"/"+req.params.study_description+".zip");
                if(stats.isFile){
                        res.set({
                                'Content-Type':'application/zip',
                                'Content-Disposition':'attachment; filename='+req.params.study_description+'.zip',
                                "Content-Transfer-Encoding": "binary",
                                'Content-Length':stats.size
                        });
                        fs.createReadStream(__dirname+"/"+req.params.study_description+".zip").pipe(res);
                        fs.unlinkSync(__dirname+"/"+req.params.study_description+".zip");
                        
                }else
                {
                        res.end(404)
                }
            }
    });
*/
    
    
});
module.exports = router;
