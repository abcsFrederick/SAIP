var express = require('express');
var probesRouter = express.Router();
const { isAdmin, isAuth, mysqlcon } = require('../utils.js');
var logger = require('../loggerConfig');


probesRouter.get('/probes_overview', isAuth, (req, res, next) => {  //isAuth
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') GET `/api/v1/probes_overview`'
    });
    var results = [];
    mysqlcon.getConnection((err, connection) => {
        if (err) throw err;
        var query = connection.query("SELECT * FROM imaging_probes;");
        query.on('result', (row) => {
            results.push(row);
        });
        query.on('end', () => {
            connection.release();
            return res.json(results);
        });
    });
});

probesRouter.post('/probes_add', isAdmin, (req, res, next) => {  //isAdmin
    req.checkBody('name','name cannot be empty').notEmpty();
    req.checkBody('name','name should be a string<varchar(127)>').isString();
    req.checkBody('description', 'description cannot be empty').notEmpty();
    req.checkBody('description', 'description should be a string<varchar(127)>').isString();

    var errors = req.validationErrors();

    if (errors) {
        return res.json({'err': 1, errors});
    } else {
        let name = req.body.name;
        let description = req.body.description;
        mysqlcon.getConnection((err, connection) => {
            if (err) throw err;
            var query = connection.query("INSERT INTO imaging_probes (name,description,created_at,updated_at) VALUES (?,?,NOW(), NOW())",
                [name, description], function(err, result) {
                    if (err) {
                       throw err; 
                    }

                    console.log('successfully insert ' + result.insertId + ' row in `imaging_probes` table');
                    console.log('INSERT INTO imaging_probes (name,description,created_at,updated_at)');
                    console.log('VALUES (' + name + ', ' + description + ', NOW(), NOW());');

                    connection.release();
                    let msg = name + ' ' + description + ' is added in the imaging_probes';
                   
                    return res.json({'err': 0, 'msg': msg})
                });
        });
    }
});

module.exports = probesRouter;