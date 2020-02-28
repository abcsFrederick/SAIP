var express = require('express');
var config = require('config');
const mysqlConfig = config.get('dbConfig.mysql');
var logger = require('../loggerConfig');

var experimentsRouter = express.Router();

const mysql = require('mysql');
var mysqlcon = mysql.createPool(mysqlConfig);

var isAdmin = function (req, res, next) {
    if (req.session.group_id.includes(7)) {
        return next();
    } else {
        return res.json({'err': '1', 'msg': 'Contact Admin user to gain permission'});
    }
}

var isAuth = function (req, res, next) {
    if (req.session.status === 'Authenticated') {
        return next();
    } else {
        return res.json({'err': '1', 'msg': 'Please login first or contact admin user to whitelist you'});
    }
}


experimentsRouter.put('/edit', isAdmin, (req, res, next) => { // isAdmin
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
module.exports = experimentsRouter;
