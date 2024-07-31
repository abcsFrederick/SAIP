var validator = require('express-validator');
var express = require('express');
var async = require('async');

const { isAdmin, isAuth, mysqlcon, pgconpool } = require('../utils.js');

var logger = require('../loggerConfig');

var imagingRouter = express.Router();


imagingRouter.get('/imaging_participants/:experiment_id', isAuth, (req, res, next) => {   //isAuth
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') GET `/api/v1/imaging_participants/' + req.params.experiment_id + '`'
    });
    async.waterfall([
        function(callback) {
            mysqlcon.getConnection((err,connection)=>{
                var results_from_Miportal = [];
                if(err) throw err;
                var query = connection.query("SELECT * FROM imaging_participants WHERE experiment_id = " + req.params.experiment_id);
                    query.on('result', (row) => {
                        results_from_Miportal.push(row['patient_id']);
                    });
                    query.on('end', () => {
                        connection.release();
                        callback(null, results_from_Miportal);
                    });
            });
        },
        function(arg1, callback) {
            if (arg1.length) {
                var results_from_Scippy = [];
                pgconpool.connect().then(client => {
                    client.query("SELECT t1_id AS pat_id, t1_pat_name AS pat_name, t1_pat_mrn AS pat_mrn, t1_pat_path As pat_path, t2_id AS study_id, t2_studyid AS studyid, t2_mod_time AS study_mod_time, t2_study_description AS study_description, t2_study_path AS study_path, JSON_AGG (t3_series_description) AS series_description, JSON_AGG (t3_series_number) AS series_number, JSON_AGG (t3_modality) AS modality, JSON_AGG (t3_num_images) AS num_images, JSON_AGG (t3_series_path) AS series_path, JSON_AGG(t3_series_uid) AS series_uid FROM(SELECT t2.*,series_description AS t3_series_description,series_number AS t3_series_number, modality AS t3_modality,num_images AS t3_num_images,series_path AS t3_series_path,series_uid AS t3_series_uid FROM (SELECT t1.*,id AS t2_id, studyid AS t2_studyid,mod_time AS t2_mod_time, study_description AS t2_study_description, study_path AS t2_study_path FROM (SELECT id AS t1_id, pat_name AS t1_pat_name, pat_mrn  AS t1_pat_mrn, pat_path AS t1_pat_path FROM patients WHERE id in (" + arg1 + ")) AS t1 LEFT JOIN studies ON t1.t1_id = studies.pat_id) AS t2 LEFT JOIN series on t2.t2_id=series.study_id) AS t3 GROUP BY t2_id, t2_studyid, t2_mod_time, t2_study_description, t2_study_path, t1_id, t1_pat_name, t1_pat_mrn, t1_pat_path;").then(row => {
                        client.release();
                        results_from_Scippy.push(row);
                        callback(null, results_from_Scippy);
                    })
                    .catch(e => {
                        client.release();
                        console.error('query error', e.message, e.stack);
                    })
                });
            } else {
                var no_patient_exist = [{'error': 'no patient exist'}];
                callback(null, no_patient_exist);
            }
        }
    ], function(err, results) {
        if (results[0].error) {
            return res.json(results[0].error);
        }
        return res.json(results[0].rows);
    });
});

module.exports = imagingRouter;