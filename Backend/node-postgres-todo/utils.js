var config = require('config');

const mysqlConfig = config.get('dbConfig.mysql');
const postgresConfig = config.get('dbConfig.postgres');

const mysql = require('mysql');
var mysqlcon = mysql.createPool(mysqlConfig);

const Pool = require('pg-pool');
var parse = require('pg-connection-string').parse;

var pgConfig = parse(postgresConfig);
const pgconpool = new Pool(pgConfig);

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

module.exports = { isAdmin, isAuth, mysqlcon, pgconpool }