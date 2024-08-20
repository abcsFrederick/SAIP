var path = require('path');
var express = require('express');
var config = require('config');
var fs = require('fs-extra');
var async = require('async');

const mysqlConfig = config.get('dbConfig.mysql');
const doc_root = config.get('filesystemConfig.doc_root');
var logger = require('../loggerConfig');

const { isAdmin, isAuth, mysqlcon } = require('../utils.js');

var experimentsRouter = express.Router();

experimentsRouter.put('/experiments/edit', isAdmin, (req, res, next) => { // isAdmin
    /*
        Testing params
    */
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') PUT `experiments/api/v1/experiment_edit`'
    });
    req.checkBody('experiment_id', 'Experiment id cannot be empty').notEmpty();
    req.checkBody('experiment_id', 'Experiment id should be an integer').isInt();
    req.checkBody('title', 'title cannot be empty').notEmpty();
    req.checkBody('title', 'title should be a string<varchar(255)>').isString();

    var errors = req.validationErrors();

    if (errors) {
        return res.json({'err': 1, errors});
    } else {
        let experiment_id = req.body.experiment_id;
        let title = req.body.title;
        let probe_id = req.body.probe_id;
        let description = req.body.description;
        mysqlcon.getConnection((err, connection) => {
            if (err) throw err;
            connection.query("UPDATE imaging_experiments SET title=?, probe_id=?, description=? WHERE id=?",
            [title, probe_id, description, experiment_id], function (error, results, fields) {
                if (error) {
                    return connection.rollback(function() {
                        throw error;
                    });
                }
                connection.commit(function(err) {
                    if (error) {
                        return connection.rollback(function() {
                            throw error;
                        });
                    }
                    connection.release();
                    logger.info({
                        level: 'info',
                        message: req.session.FirstName + ' ' + req.session.LastName
                        + '(' + req.session.user_id[0] + ') successfully UPDATE ' + experiment_id + ' project from `nci_projects` table'
                    });
                    return res.json({'err': 0, result: ['Successfully UPDATE an experiment']})
                });
            });
        });
    }
});

experimentsRouter.post('/experiment_add', isAdmin, (req, res, next) => {   //isAdmin
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

experimentsRouter.delete('/experiment_remove/:experiment_id', isAdmin, (req, res, next) => {
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

experimentsRouter.get('/experiment_doc/:experiment_id', isAuth, (req, res, next) => {   //isAuth
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') GET `/api/v1/experiment_doc/'+req.params.experiment_id+'`'
    });
    var selected_exp = req.params.experiment_id;
    var doc_Partition = doc_root+selected_exp;
    var files = [];
    if (!fs.existsSync(doc_Partition)) {
        fs.mkdir(doc_Partition, 0o755, function(err) {
            fs.readdirSync(doc_Partition).forEach(file => {
                let stat = fs.statSync(path.join(doc_Partition, file))
                if (file !== '.DS_Store') {
                    obj = { 
                        'name': file,
                        'path': path.join(doc_Partition, file),
                        'created': stat.mtime,
                        'size': stat.size
                    }
                    files.push(obj)
                }
            });
        });
    } else {
        fs.readdirSync(doc_Partition).forEach( file => {
            let stat = fs.statSync(path.join(doc_Partition, file))

            if (file !== '.DS_Store') {
                obj = {
                    'name': file,
                    'path': path.join(doc_Partition, file),
                    'created': stat.mtime,
                    'size': stat.size
                }
                files.push(obj);
            }
        });
    }
    return res.json(files);
});

experimentsRouter.post('/experiment_doc/upload', isAuth, (req, res, next) => {   //isAuth

    logger.warn({
        level: 'warn',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') POST `/api/v1/experiment_doc/upload`'
    });
    req.checkBody('experiment_id','Experiment id cannot be empty').notEmpty();
    req.checkBody('experiment_id','Experiment id should be an integer').isString();

    var errors = req.validationErrors();

    if (errors) {
        return res.json({'err': 1, errors});
    }
    else{
        let experiment_id = req.body.experiment_id;
        if (req.files) {
            let SRAC_file = req.files.SRAC_file.name;
            console.log('uploading');
            //FOR mariadb10.2.8
            if (!fs.existsSync(path.join(doc_root, experiment_id))) {
                fs.mkdir(path.join(doc_root, experiment_id), 0o755, function(err) {
                    if (err) {
                        throw err;
                    }
                    //FOR mariadb10.2.8
                    req.files.SRAC_file.mv(path.join(doc_root, experiment_id, SRAC_file), function(err) {
                    //req.files.SRAC_file.mv(doc_root+experiment_id+'/'+SRAC_file, function(err) {
                        if (err) {   
                            logger.error({
                                level: 'error',
                                message: req.session.FirstName + ' ' + req.session.LastName
                                + '(' + req.session.user_id[0] + ') fail to Upload a experiment with a file document' + err
                            });
                            return res.status(500).send(err);
                        }
                        
                        if(err) throw err;
                        
                        else {
                            logger.warn({
                                level: 'warn',
                                message: req.session.FirstName + ' ' + req.session.LastName
                                + '(' + req.session.user_id[0] + ') successfully Upload a experiment with a file document'
                            });
                            return res.json({'err':0,'msg':'Upload a experiment with a file document'});
                        }
                        
                    });
                })
            } else {
                //FOR mariadb10.2.8
                req.files.SRAC_file.mv(path.join(doc_root, experiment_id, SRAC_file), function(err) {
                    if (err) {   
                        logger.error({
                            level: 'error',
                            message: req.session.FirstName + ' ' + req.session.LastName
                            + '(' + req.session.user_id[0] + ') fail to Upload a experiment with a file document' + err
                        });
                        return res.status(500).send(err);
                    } else{
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

experimentsRouter.get('/experiments/:project_id', isAuth, (req, res, next) => {  //isAuth
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
        var query = connection.query(`SELECT id, title, description,number_of_studies, number_of_series,
            number_of_images, mouse_id, probe_id, updated_at, last_name,first_name 
            FROM(SELECT t1.*, site_users.last_name,site_users.first_name 
            FROM (SELECT * FROM imaging_experiments WHERE project_id = ${selected_project}) 
            as t1 LEFT JOIN site_users ON t1.pi_id=site_users.id) 
            as t2;`);
        query.on('result',(row)=>{
                results.push(row);
        });
        query.on('end',()=>{
                connection.release();
                return res.json(results);
        });
    });
    

});


module.exports = experimentsRouter;
