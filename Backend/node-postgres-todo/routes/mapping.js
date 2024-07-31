var validator = require('express-validator');
var express = require('express');
var async = require('async');

const { isAdmin, isAuth, mysqlcon, pgconpool } = require('../utils.js');

var logger = require('../loggerConfig');

var mappingRouter = express.Router();


Array.prototype.diff = function(a) {
    return this.filter(function(i) {return a.indexOf(i) < 0;});
};

mappingRouter.get('/mappingAll', isAdmin, (req, res, next) => {   //isAdmin
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') GET `/api/v1/mappingAll`'
    });
    pgconpool.connect().then(client => {
        client.query('SELECT id,pat_name,pat_mrn FROM patients;').then(row => {
            client.release();
            return res.json(row.rows);
        })
        .catch(e => {
            client.release();
            console.error('query error', e.message, e.stack);
        })
    });
});

mappingRouter.get('/mapping', isAdmin, (req, res, next) => {  //isAdmin
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

            pgconpool.connect().then(client => {
                client.query('SELECT id FROM patients;').then(row => {
                    client.release();
                    results_from_Scippy = row.rows.map(a => a.id);
                    callback(null, results_from_Scippy);
                })
                .catch(e => {
                    client.release();
                    console.error('query error', e.message, e.stack);
                })
            });
        }
    ],function(err, results){
        if(err) throw err;
        var unmapped = [];
        unmapped = results[1].diff(results[0]);
        if (unmapped.length) {
            pgconpool.connect().then(client => {
                client.query('SELECT id,pat_name,pat_mrn FROM patients WHERE id = ANY ($1);', [unmapped]).then(row => {
                    client.release();
                    return res.json(row.rows);
                })
                .catch(e => {
                    client.release();
                    console.error('query error', e.message, e.stack);
                })
            });
        } else {
            return res.json({'error': 'No more new patients'});
        }
    })
});

mappingRouter.post('/mapping/linkToExp', isAdmin, (req, res, next) => {   //isAdmin

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

    if (errors) {
        return res.json({'err': 1, errors});
    } else {
        let series_count_result = [];
        let images_count_result = [];
        let studies_count_result = []; 
        async.waterfall([
            function(callback) {
                let results = [];
                ///Get rid of same patient in experiment
                mysqlcon.getConnection((err, connection) => {
                    if(err) throw err;
                    var query = connection.query("SELECT patient_id FROM imaging_participants WHERE experiment_id= ?",[experiment_id]);
                    query.on('result', (row) => {
                        results.push(row['patient_id']);
                    });
                    query.on('end', () => {
                        connection.release();
                        callback(null, results);
                    });
                });
            }, function(arg, callback) {
                let created = new Date();
                let linkedParticipantsArray = [];
                let patientsNeedToBeLinkArray = [];

               // console.log(arg)
               // console.log(arg.includes(parseInt(linkedParticipants[0])))
                for(let a = 0; a < linkedParticipants.length; a++) {
                    let tmpArray = [];
                    
                    if (!arg.includes(parseInt(linkedParticipants[a]))){
                        patientsNeedToBeLinkArray.push(linkedParticipants[a])
                        tmpArray = [experiment_id,linkedParticipants[a], created, created];
                        linkedParticipantsArray.push(tmpArray);
                    } else {
                        console.log('already has patient ' + linkedParticipants[a] + ' in experiment ' + experiment_id);
                    }
                }
                if (linkedParticipantsArray.length) {
                    //insert to imaging_participants table
                    // console.log(patientsNeedToBeLinkArray);
                    
                    mysqlcon.getConnection((err, connection) => {
                        if(err) throw err;
                        var query = connection.query("INSERT INTO imaging_participants ( experiment_id, \
                            patient_id, created_at, updated_at) VALUES ?", [linkedParticipantsArray], function(err, result) {
                                if(err) throw err;
                                logger.warn({
                                    level: 'warn',
                                    message: req.session.FirstName + ' ' + req.session.LastName
                                    + '(' + req.session.user_id[0] + ') successfully insert '+result.insertId+' row in `imaging_participants` table`'
                                });
                                // console.log('successfully insert '+result.insertId+' row in `imaging_participants` table');
                                // console.log('INSERT INTO imaging_participants ( experiment_id, patient_id, created_at, updated_at) VALUES ('+experiment_id+',['+linkedParticipants+'],NOW(),NOW());');
                                connection.release();
                                callback(null, patientsNeedToBeLinkArray);
                            });
                    });
                    
                }else{
                    console.log('no new patient need to be added');
                    return res.json({'err': 1, msg: 'no need to add new entry'});
                }
            }, function(arg2, callback) {
                pgconpool.connect().then(client => {
                    client.query("SELECT t1.pat_id AS pat_id, count(series.id) AS num_of_series, sum(num_images) AS num_of_images FROM (SELECT id AS studies_id,pat_id FROM studies WHERE pat_id = ANY ($1)) AS t1 LEFT JOIN series ON studies_id=series.study_id GROUP BY t1.pat_id;", [arg2]).then(row => {
                        client.release();
                        row.rows.forEach((row) => {
                            series_count_result.push(row['num_of_series']);
                            images_count_result.push(row['num_of_images']);
                        });
                        callback(null, arg2);
                    })
                    .catch(e => {
                        client.release();
                        console.error('query error', e.message, e.stack);
                    })
                });
            }, function(arg3, callback) {
                pgconpool.connect().then(client => {
                    client.query("SELECT pat_id, count(id) AS num_of_studies FROM studies WHERE pat_id = ANY ($1) GROUP BY pat_id;", [arg3]).then(row => {
                        client.release();
                        row.rows.forEach((row) => {
                            studies_count_result.push(row['num_of_studies']);
                        });
                        callback(null,arg3);
                    })
                    .catch(e => {
                        client.release();
                        console.error('query error', e.message, e.stack);
                    })
                });
            }
        ], function(err, results) {
            let total_studies_count_result = 0;
            let total_series_count_result = 0;
            let total_images_count_result = 0;

            for(let a = 0; a < studies_count_result.length; a++) {
                total_studies_count_result = total_studies_count_result + parseInt(studies_count_result[a]);
                total_series_count_result = total_series_count_result + parseInt(series_count_result[a]);
                total_images_count_result = total_images_count_result + parseInt(images_count_result[a]);
            }
            mysqlcon.getConnection((err, connection) => {
                if(err) throw err;
                var query = connection.query("UPDATE imaging_experiments SET number_of_studies=number_of_studies+?,number_of_series=number_of_series+?,number_of_images=number_of_images+? WHERE id=?",
                    [total_studies_count_result, total_series_count_result, total_images_count_result, experiment_id]);
                query.on('result', (row) => {
                        //results.push(row);
                });
                query.on('end', () => {
                        connection.release();
                        logger.warn({
                            level: 'warn',
                            message: req.session.FirstName + ' ' + req.session.LastName
                            + '(' + req.session.user_id[0] + ') successfully UPDATE imaging_experiments SET number_of_studies=number_of_studies+'+total_studies_count_result+',number_of_series=number_of_series+'+total_series_count_result+',number_of_images=number_of_images+'+total_images_count_result+' WHERE id='+experiment_id
                        });
                        // console.log('Successfully UPDATE the experiment')
                        // console.log('UPDATE imaging_experiments SET number_of_studies=number_of_studies+'+total_studies_count_result+',number_of_series=number_of_series+'+total_series_count_result+',number_of_images=number_of_images+'+total_images_count_result+' WHERE id='+experiment_id)
                        return res.json({'err': 0, msg: 'Add new entry'});
                });
            }); 
        })
    }
});

mappingRouter.post('/mapping/delinkFromExp', isAdmin, (req, res, next) => { 
    logger.warn({
        level: 'warn',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') POST `/api/v1/mapping/delinkFromExp`'
    });
    req.body.experiment_id = req.body.experiment_id;
    req.body.delinkedParticipants = JSON.parse(req.body.delinkedParticipants);

    req.checkBody('experiment_id', 'experiment_id cannot be empty').notEmpty();
    req.checkBody('experiment_id', 'experiment_id should be an integer<int(11)>').isInt();
    req.checkBody('delinkedParticipants', 'linkedParticipants cannot be empty').notEmpty();
    req.checkBody('delinkedParticipants', 'linkedParticipants should be an integer<int(11)> Array').isArrayOfInt();

    let experiment_id = req.body.experiment_id;
    let delinkedParticipants = req.body.delinkedParticipants;
    var errors = req.validationErrors();

    if (errors) {
        return res.json({'err': 1, errors});
    } else{
        let series_count_result = [];
        let images_count_result = [];
        let studies_count_result = [];
        for(let a = 0; a < delinkedParticipants.length; a++) {
            delinkedParticipants[a] = parseInt(delinkedParticipants[a]);
        }
        async.waterfall([
            function(callback) {
                mysqlcon.getConnection((err, connection) => {
                    if(err) throw err;
                    var query = connection.query("DELETE FROM imaging_participants WHERE experiment_id=? AND patient_id in(?);", [experiment_id, delinkedParticipants],function(err, result) {
                        if(err) throw err;
                        logger.warn({
                            level: 'warn',
                            message: req.session.FirstName + ' ' + req.session.LastName
                            + '(' + req.session.user_id[0] + ') successfully DELETE FROM imaging_participants WHERE experiment_id='+experiment_id+' AND patient_id in (['+delinkedParticipants+']);'
                        });
                        connection.release();
                        callback(null, {'err': 0, 'msg': 'DELETE exited entry'});
                    });
                });
            },
            function(arg, callback) {
                pgconpool.connect().then(client => {
                    client.query("SELECT t1.pat_id AS pat_id, count(series.id) AS num_of_series, sum(num_images) AS num_of_images FROM (SELECT id AS studies_id,pat_id FROM studies WHERE pat_id = ANY ($1)) AS t1 LEFT JOIN series ON studies_id=series.study_id GROUP BY t1.pat_id;", [delinkedParticipants]).then(row => {
                        client.release();
                        row.rows.forEach((row) => {
                            series_count_result.push(row['num_of_series']);
                            images_count_result.push(row['num_of_images']);
                        });
                        callback(null, arg);
                    })
                    .catch(e => {
                        client.release();
                        console.error('query error', e.message, e.stack);
                    })
                });
            }, 
            function(arg1, callback) {
                pgconpool.connect().then(client => {
                    client.query("SELECT pat_id, count(id) AS num_of_studies FROM studies WHERE pat_id = ANY ($1) GROUP BY pat_id;", [delinkedParticipants]).then(row => {
                        client.release();
                        row.rows.forEach((row) => {
                            studies_count_result.push(row['num_of_studies']);
                        });
                        callback(null, arg1);
                    })
                    .catch(e => {
                        client.release();
                        console.error('query error', e.message, e.stack);
                    })
                });
            }
        ], function(err, results) {
                let total_studies_count_result = 0;
                let total_series_count_result = 0;
                let total_images_count_result = 0;

                for(let a = 0; a < studies_count_result.length; a++) {
                    total_studies_count_result = total_studies_count_result + parseInt(studies_count_result[a]);
                    total_series_count_result = total_series_count_result + parseInt(series_count_result[a]);
                    total_images_count_result = total_images_count_result + parseInt(images_count_result[a]);
                }
                mysqlcon.getConnection((err, connection) => {
                    if(err) throw err;
                    var query = connection.query("UPDATE imaging_experiments SET number_of_studies=number_of_studies-?,number_of_series=number_of_series-?,number_of_images=number_of_images-? WHERE id=?",
                        [total_studies_count_result, total_series_count_result, total_images_count_result, experiment_id]);
                    query.on('result', (row) => {
                    });
                    query.on('end', () => {
                        connection.release();
                        logger.warn({
                            level: 'warn',
                            message: req.session.FirstName + ' ' + req.session.LastName
                            + '(' + req.session.user_id[0] + ') successfully UPDATE imaging_experiments SET number_of_studies=number_of_studies-'+total_studies_count_result+',number_of_series=number_of_series-'+total_series_count_result+',number_of_images=number_of_images-'+total_images_count_result+' WHERE id='+experiment_id
                        });
                        return res.json(results);
                    });
                });
            });
        
    }
})

module.exports = mappingRouter;