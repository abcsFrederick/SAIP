var express = require('express');
var app = express();
var router = express.Router();
var cors = require('cors');

var fs = require('fs');
var path = require('path');
var zipFolder = require('zip-folder');
/*
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
*/
router.use( cors({credentials:true,origin:['http://fr-s-ivg-ssr-d1:8080','http://ivg-boxx:8082']}));  //for cross domin with cookie credientials

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
    maxAge:24*60*60*1000
  }
}));

var isAuth = function(req,res,next){
//    console.log('in isAuth');
    console.log(req.session.loginUser);
    if(req.session.loginUser)
    {
 //       console.log('true?');
        return next();
    }
    //res.redirect('/')
    res.redirect('http://fr-s-ivg-ssr-d1:8080')
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
             
                	var query = client.query("SELECT patients.pat_name AS patient, patients.id AS patient_id, studies.pat_id AS pat_id, studies.id AS study_id, studies.study_description AS study_description, patients.pat_path AS patient_path, studies.study_path AS study_path FROM patients LEFT JOIN studies ON patients.id = studies.pat_id WHERE patients.mod_time >= '"+req.params.from+"' and patients.mod_time <= '"+req.params.to+"' \
                									 and patients.pat_name LIKE '%%' ORDER BY patient_id");
                }
                else{
                	var query = client.query("SELECT patients.pat_name AS patient, patients.id AS patient_id, studies.pat_id AS pat_id, studies.id AS study_id, studies.study_description AS study_description, patients.pat_path AS patient_path, studies.study_path AS study_path FROM patients LEFT JOIN studies ON patients.id = studies.pat_id WHERE patients.mod_time >= '"+req.params.from+"' and patients.mod_time <= '"+req.params.to+"' \
                									 and patients.pat_name LIKE '%"+req.params.name+"%' ORDER BY patient_id");
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
router.get('/api/v1/scippy/downloadSeries/:patientPath/:studyPath/:seriePath',isAuth,(req,res,next)=>{


	var filePath = path.join(__dirname,'./empty');
	filePath = '/mnt/scippy_images/'+req.params.patientPath+'/'+req.params.studyPath+'/'+req.params.seriePath;
	console.log(filePath);

	zipFolder(filePath,__dirname+"/"+req.params.seriePath+'.zip',function(err){
		if(err){
			console.log("ops!"+err);
		}else{
			console.log("package done");
			var stats = fs.statSync(__dirname+"/"+req.params.seriePath+".zip");
			if(stats.isFile){
				res.set({
					'Content-Type':'application/zip',
					'Content-Disposition':'attachment; filename='+req.params.seriePath+'.zip',
					"Content-Transfer-Encoding": "binary",
					'Content-Length':stats.size
				});
				fs.createReadStream(__dirname+"/"+req.params.seriePath+".zip").pipe(res);
				fs.unlinkSync(__dirname+"/"+req.params.seriePath+".zip");
			}else
			{
				res.end(404)
			}
		}
	});
	
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
                                res.set({
                                        'Content-Type':'application/zip',
                                        'Content-Disposition':'attachment; filename='+req.params.studyPath+'.zip',
                                        "Content-Transfer-Encoding": "binary",
                                        'Content-Length':stats.size
                                });
                                fs.createReadStream(__dirname+"/"+req.params.studyPath+".zip").pipe(res);
                                fs.unlinkSync(__dirname+"/"+req.params.studyPath+".zip");
                        }else
                        {
                                res.end(404)
                        }
                }
        });
        
});
module.exports = router;
