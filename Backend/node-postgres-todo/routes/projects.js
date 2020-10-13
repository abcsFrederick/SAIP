var validator = require('express-validator');
var express = require('express');
var config = require('config');
const mysqlConfig = config.get('dbConfig.mysql');
var logger = require('../loggerConfig');

var projectsRouter = express.Router();

const mysql = require('mysql');
var mysqlcon = mysql.createPool(mysqlConfig);

projectsRouter.use(validator({
    customValidators: {
        isArrayOfInt: function(value) {
            return Array.isArray(value) && Number.isInteger(parseInt(value[0]));
        }
    }
}));

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

projectsRouter.put('/edit', isAdmin, (req, res, next) => {  // isAdmin
    /*
        Testing params
    */
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') PUT `projects/api/v1/project_edit`'
    });
    req.body.protocol_category_id = JSON.parse(req.body.protocol_category_id);
    req.checkBody('project_id', 'Project id cannot be empty').notEmpty();
    req.checkBody('project_id', 'Project id should be an integer').isInt();
    req.checkBody('name', 'Project name cannot be empty').notEmpty();
    req.checkBody('name', 'Project name should be a string<varchar(127)>').isString();
    req.checkBody('status','Status cannot be empty').notEmpty();
    req.checkBody('status','Status should be a string<varchar(1)>').isLength({ max: 1 });
    req.checkBody('pi_id', 'Pi id cannot be empty').notEmpty();
    req.checkBody('pi_id', 'Pi id should be an integer<int(11)>').isInt();
    req.checkBody('protocol_category_id', 'protocol category id cannot be empty').notEmpty();
    req.checkBody('protocol_category_id', 'protocol category id should be an array with integer').isArrayOfInt();

    var errors = req.validationErrors();

    if (errors) {
        return res.json({'err': 1, errors});
    } else {
        let project_id = req.body.project_id;
        let name = req.body.name;
        let pi_id = req.body.pi_id;
        let status = req.body.status;
        let protocol_category_id = req.body.protocol_category_id;
        let project_protocols_names = JSON.parse(req.body.project_protocols_names);
        if (protocol_category_id.length !== project_protocols_names.length) {
            return res.json({'err': 1, 'msg': 'project_protocols_names and protocol_category_id should have same size'});
        } 
        mysqlcon.getConnection((err, connection) => {
            if (err) throw err;
            connection.query("UPDATE nci_projects SET name=?, pi_id=?, status=?, updated_at=NOW() WHERE id=?",
                [name, pi_id, status, project_id], function (error, results, fields) {
                if (error) {
                    return connection.rollback(function() {
                        throw error;
                    });
                }
                connection.query("DELETE FROM nci_protocols WHERE project_id=?",
                    project_id, function (error, results, fields) {
                    if (error) {
                        return connection.rollback(function() {
                            throw error;
                        });
                    }
                    var created = new Date();
                    let protocol_queryArray = [];
                    for (let a = 0; a < protocol_category_id.length; a++) {
                        project_protocols_name = project_protocols_names[a] + '-' + project_id + ' ' + name;
                        protocol_queryArray[a] = [project_id, project_protocols_name, protocol_category_id[a], 0, 0, 1, created, created];
                    }
                    connection.query("INSERT INTO nci_protocols (project_id, protocol_name, \
                        protocol_category_id, number_of_objects, studies_per_object,hours_per_study,created_at, updated_at) VALUES \
                        ?", [protocol_queryArray], function (error, results, fields) {
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
                            logger.info({
                                level: 'info',
                                message: req.session.FirstName + ' ' + req.session.LastName
                                + '(' + req.session.user_id[0] + ') successfully UPDATE ' + project_id + ' project from `nci_projects` table'
                            });
                            connection.release();
                            return res.json({'err': 0, result: ['Project #' + project_id + '\'s information has been updated']});
                        });
                    });
                });
            });
        });
    }
});

projectsRouter.delete('/delete/:project_id', isAdmin, (req, res, next) => { // isAdmin
    /*
        Testing params
    */
    logger.warn({
        level: 'warn',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') DELETE `projects/api/v1/project/' + req.params.project_id + '`'
    });
    let project_id = req.params.project_id;
    mysqlcon.getConnection((err, connection) => {
        if (err) throw err;
        connection.query("SELECT * FROM imaging_experiments WHERE project_id=?", project_id, function (error, results, fields) {
            if (error) {
                return connection.rollback(function() {
                    throw error;
                });
            }
            if (results.length) {
                return res.json({'err': 1, 'error': 'You need to delete experiments under this project first'});
            }
            connection.query("DELETE FROM nci_projects WHERE id=?", project_id, function (error, results, fields) {
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
                        + '(' + req.session.user_id[0] + ') successfully DELETE ' + project_id + ' project from `nci_projects` table'
                    });
                    return res.json({'err': 0, 'msg': 'Successfully remove a project'})
                });
            });
        });
    });
});
module.exports = projectsRouter;