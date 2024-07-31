var validator = require('express-validator');
var express = require('express');
var async = require('async');

const { isAdmin, isAuth, mysqlcon } = require('../utils.js');

var logger = require('../loggerConfig');

var projectsRouter = express.Router();


projectsRouter.use(validator({
    customValidators: {
        isArrayOfInt: function(value) {
            return Array.isArray(value) && Number.isInteger(parseInt(value[0]));
        }
    }
}));

// For admin users
projectsRouter.put('/projects/edit', isAdmin, (req, res, next) => {  // isAdmin
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

projectsRouter.delete('/projects/delete/:project_id', isAdmin, (req, res, next) => { // isAdmin
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

projectsRouter.post('/project_add', isAdmin, (req, res, next) => {  //isAdmin
    /*
        Testing params
    */
    //console.log('hello');
    //console.log(req.files.SRAC_file)
    
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') POST `/api/v1/project_add`'
    });
    req.body.name = req.body.name;
    req.body.pi_id = req.body.pi_id;
    req.body.status = req.body.status;
    req.body.proposal = req.body.proposal;
    req.body.requester = req.body.requester;
    //req.body.user_id = [22,4];
    //req.body.permissions = ["R","RW"];
    req.body.protocol_category_id = JSON.parse(req.body.protocol_category_id);
    req.body.users_and_permissions = JSON.parse(req.body.users_and_permissions);
    req.body.project_protocols_names = JSON.parse(req.body.project_protocols_names);

    // console.log(req.body)
    // console.log(req.files)
    req.checkBody('name','Project name cannot be empty').notEmpty();
    req.checkBody('name','Project name should be a string<varchar(127)>').isString();
    req.checkBody('pi_id','Pi id cannot be empty').notEmpty();
    req.checkBody('pi_id','Pi id should be an integer<int(11)>').isInt();
    req.checkBody('status','Status cannot be empty').notEmpty();
    req.checkBody('status','Status should be a string<varchar(1)>').isLength({ max: 1 });
    // req.checkBody('proposal','Proposal cannot be empty').notEmpty();
    // req.checkBody('proposal','Proposal should be a string<text>').isString();
    // req.checkBody('requester','Project name cannot be empty').notEmpty();
    // req.checkBody('requester','Project name should be a string<varchar(255)>').isString();
    req.checkBody('protocol_category_id','protocol category id cannot be empty').notEmpty();
    req.checkBody('protocol_category_id','protocol category id should be an array with integer').isArrayOfInt();

    var errors = req.validationErrors();

    if(errors){
        return res.json({'err':1,errors});
    }
    else{
        for(let a=0;a<req.body.protocol_category_id.length;a++){
            req.body.protocol_category_id[a] = parseInt(req.body.protocol_category_id[a]);
        }
        req.body.protocol_category_id = req.body.protocol_category_id||[2,1];


        let name = req.body.name;
        let pi_id = req.body.pi_id;
        let authors = req.body.authors||'';
        let collaborator = req.body.collaborator||'';
        let collab_grant_num = req.body.collab_grant_num||'';
        let fund_project_id = req.body.fund_project_id||null;
        let SRAC_number = req.body.SRAC_number||'';
        let SRAC_file = '';
        if(req.files){
            SRAC_file = req.files.SRAC_file.name;
        }

        let status = req.body.status;
        let proposal = req.body.proposal||'-';
        let est_costs = req.body.est_costs||0;
        let disease_id = req.body.disease_id||null;
        let organ_id = req.body.organ_id||null;
        let process_id = req.body.process_id||null;
        let mouse_id = req.body.mouse_id||null;
        let probe_id = req.body.probe_id||null;
        let suggested_funding = req.body.suggested_funding||null;
        let requester = req.body.requester||'-';
        let miportal_id = req.body.miportal_id||null;
        let studies_per_object = req.body.studies_per_object||0;
        let number_of_objects = req.body.number_of_objects||0;
        let users_and_permissions = req.body.users_and_permissions||null;
        let permissions = [];
        let user_id = [];
        let uniqueUser_id;
        for(let a=0;a<users_and_permissions.length;a++){
            if(users_and_permissions[a].match(/\d+/)[0]==uniqueUser_id){
                 permissions[user_id.indexOf(uniqueUser_id)] = 'RW'
            }
            else{
                uniqueUser_id=users_and_permissions[a].match(/\d+/)[0]
                permissions.push(users_and_permissions[a].match(/\w/)[0]);
                user_id.push(users_and_permissions[a].match(/\d+/)[0]);
            }
            
        }
        //let permissions = req.query.permissions||'R';   //need to modify
        let project_protocols_names = req.body.project_protocols_names||null;
        let protocol_category_id = req.body.protocol_category_id;

        async.waterfall([
            function(callback) {
                //
                //    Add project for particular users
                //
                mysqlcon.getConnection((err,connection)=>{
                    if(err) throw err;
                    var query = connection.query("INSERT INTO nci_projects ( name, pi_id, \
                        authors, collaborator, collab_grant_num, fund_project_id, SRAC_number, \
                        SRAC_file, status, proposal, est_costs, disease_id, organ_id, process_id, \
                        number_of_objects, studies_per_object, mouse_id, probe_id, suggested_funding, \
                        requester, created_at, updated_at, miportal_id) \
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW(),?)",
                        [name,pi_id,authors,collaborator,collab_grant_num,fund_project_id,SRAC_number,SRAC_file,
                        status,proposal,est_costs,disease_id,organ_id,process_id,number_of_objects,studies_per_object,
                        mouse_id,probe_id,suggested_funding,requester,miportal_id],
                        function(err,result){
                            if(err) throw err;

                            logger.info({
                                level: 'info',
                                message: req.session.FirstName + ' ' + req.session.LastName
                                + '(' + req.session.user_id[0] + ') successfully insert '+result.insertId+' row in `nci_projects` table'
                            });
                            // console.log('successfully insert '+result.insertId+' row in `nci_projects` table');
                            // console.log('INSERT INTO nci_projects ( name, pi_id, authors, collaborator, collab_grant_num, fund_project_id, SRAC_number, SRAC_file, status, proposal, est_costs, disease_id, organ_id, process_id, number_of_objects, studies_per_object, mouse_id, probe_id, suggested_funding, requester, created_at, updated_at, miportal_id)');
                            // console.log('VALUES ('+name+', '+pi_id+', '+authors+', '+collaborator+', '+collab_grant_num+', '+fund_project_id+', '+SRAC_number+', '+SRAC_file+', '+status+', '+proposal+', '+est_costs+', '+disease_id+', '+organ_id+', '+process_id+', '+number_of_objects+', '+studies_per_object+', '+mouse_id+', '+probe_id+', '+suggested_funding+', '+requester+', NOW(), NOW(), '+miportal_id+');');
                            connection.release();
                            callback(null, result.insertId);
                        });
                });
            },
            function(arg1, callback) {

                mysqlcon.getConnection((err,connection)=>{
                    if(err) throw err;
                    //
                    //    Insert corresponding protocols
                    //
                    var project_protocols_namesArray=[];
                    for(let a=0;a<project_protocols_names.length;a++){
                        project_protocols_namesArray[a] = project_protocols_names[a]+'-'+arg1+' '+name
                    }
                    var protocol_queryArray=[];
                    var created = new Date();
                    for(let a=0;a<protocol_category_id.length;a++){
                            protocol_queryArray[a]=[arg1,project_protocols_namesArray[a],protocol_category_id[a],number_of_objects,studies_per_object,1,created,created];
                        }
                    var query = connection.query("INSERT INTO nci_protocols (project_id, protocol_name, \
                        protocol_category_id, number_of_objects, studies_per_object,hours_per_study,created_at, updated_at) VALUES \
                        ?",[protocol_queryArray],function(err,result){
                            if(err) throw err;
                            logger.info({
                                level: 'info',
                                message: req.session.FirstName + ' ' + req.session.LastName
                                + '(' + req.session.user_id[0] + ') successfully insert '+result.insertId+' row in `nci_protocols` table'
                            });
                            // console.log('successfully insert '+result.insertId+' row in `nci_protocols` table');
                            // console.log('INSERT INTO nci_protocols (project_id, protocol_name, protocol_category_id, number_of_objects, studies_per_object,hours_per_study,created_at, updated_at)');
                            // console.log('VALUES ('+arg1+', ['+project_protocols_names+'], ['+protocol_category_id+'], '+number_of_objects+', '+studies_per_object+', 1, NOW(), NOW() '+');');
                        });

                    //
                    //   Upload files 
                    //
                    if(req.files){
                        // console.log('uploading');
                        //FOR mariadb10.2.8
                        fs.mkdir(__dirname+'/tmpFile/'+arg1,0o755, function(err){
                        //fs.mkdir('/Users/miaot2/html_learning/SAIP/Backend/tmpFile/'+arg1,0o755, function(err){
                            if(err) {
                                logger.error({
                                    level: 'error',
                                    message: err
                                })
                                // console.log('what is wrong????');
                                throw err;
                            }
                            //FOR mariadb10.2.8
                            req.files.SRAC_file.mv(__dirname+'/tmpFile/'+arg1+'/'+SRAC_file, function(err) {
                            //req.files.SRAC_file.mv('/Users/miaot2/html_learning/SAIP/Backend/tmpFile/'+arg1+'/'+SRAC_file, function(err) {
                                if (err)
                                {   
                                    logger.error({
                                        level: 'error',
                                        message: err
                                    })
                                    return res.status(500).send(err);
                                }
                                var query = connection.query("INSERT INTO nci_project_document (project_id,doc_name) VALUES (?,?)",[arg1,SRAC_file],function(err,result){
                                    if(err) {
                                        throw err; 
                                    }
                                    logger.info({
                                        level: 'info',
                                        message: req.session.FirstName + ' ' + req.session.LastName
                                        + '(' + req.session.user_id[0] + ') successfully insert '+result.insertId+' row in `nci_project_document` table'
                                    });
                                    // console.log('successfully insert '+result.insertId+' row in `nci_project_document` table');
                                    // console.log('INSERT INTO nci_project_document (project_id,doc_name, created_at, updated_at');
                                    // console.log('VALUES ('+arg1+', '+SRAC_file+', NOW(), NOW());');
                                });
                            });
                        })
                        
                    }
                    //
                    //   Insert PI and corresponding users
                    //
                    var query = connection.query("INSERT INTO nci_project_users (project_id, user_id, \
                        permissions, created_at, updated_at) VALUES (?,?,?,NOW(),NOW())",[arg1,pi_id,'RW'],
                        function(err,result){
                            if(err) throw err;
                            logger.info({
                                level: 'info',
                                message: req.session.FirstName + ' ' + req.session.LastName
                                + '(' + req.session.user_id[0] + ') successfully insert '+result.insertId+' row in `nci_project_users` table'
                            });
                            // console.log('successfully insert '+result.insertId+' row in `nci_project_users` table');
                            // console.log('INSERT INTO nci_project_users (project_id, user_id, permissions, created_at, updated_at');
                            // console.log('VALUES ('+arg1+', ['+user_id+'], ['+permissions+'], NOW(), NOW());');
                        });
                    if(user_id.length){
                        var queryArray=[];
                        var created = new Date();
                        for(let a=0;a<user_id.length;a++){
                            queryArray[a]=[arg1,user_id[a],permissions[a],created,created];
                        }
                        // console.log(queryArray);
                        var query = connection.query("INSERT INTO nci_project_users (project_id, user_id, \
                        permissions, created_at, updated_at) VALUES ?",[queryArray],
                        function(err,result){
                            if(err) throw err;
                            logger.info({
                                level: 'info',
                                message: req.session.FirstName + ' ' + req.session.LastName
                                + '(' + req.session.user_id[0] + ') successfully insert '+result.insertId+' row in `nci_project_users` table'
                            });
                            // console.log('successfully insert '+result.insertId+' row in `nci_project_users` table');
                            // console.log('INSERT INTO nci_project_users (project_id, user_id, permissions, created_at, updated_at');
                            // console.log('VALUES ('+arg1+', ['+user_id+'], ['+permissions+'], NOW(), NOW());');
                            connection.release();
                            callback(null, 'Project id '+arg1+' is ['+permissions+'] for user(s) ['+ user_id+'], Project protocols are ['+project_protocols_names+'] with id ['+ protocol_category_id+']');
                        });
                    }
                    else{
                        connection.release();
                        callback(null, 'Project id '+arg1+' is for no one, Project protocols are ['+project_protocols_names+'] with id ['+ protocol_category_id+']');
                    }
                });
            }
        ], function (err, result) {
            return res.json({'err':0,result});
        });
        
    }
});

projectsRouter.post('/project_add_users', isAdmin, (req, res, next) => {
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') POST `/api/v1/project_add_users`'
    });
    req.checkBody('project_id','Project id cannot be empty').notEmpty();
    req.checkBody('project_id','Project id should be an integer').isInt();
    req.body.users_and_permissions = JSON.parse(req.body.users_and_permissions);

    let project_id = req.body.project_id||null;
    let users_and_permissions = req.body.users_and_permissions||null;
    var errors = req.validationErrors();

    if(errors){
        return res.json({'err':1,errors});
    }
    else{
    
        let permissions = [];
        let user_id = [];
        let uniqueUser_id;
        for(let a=0;a<users_and_permissions.length;a++){
            if(users_and_permissions[a].match(/\d+/)[0]==uniqueUser_id){
                 permissions[user_id.indexOf(uniqueUser_id)] = 'RW'
            }
            else{
                uniqueUser_id=users_and_permissions[a].match(/\d+/)[0]
                permissions.push(users_and_permissions[a].match(/\w/)[0]);
                user_id.push(users_and_permissions[a].match(/\d+/)[0]);
            }
            
        }
        // console.log(project_id);
        // console.log(user_id);
        // console.log(permissions);
    
        if(user_id.length){
            async.waterfall([
                function(callback){
                    let results=[];
                    ///Get rid of same users in project
                    mysqlcon.getConnection((err,connection)=>{
                        if(err) throw err;
                        var query = connection.query("SELECT user_id FROM nci_project_users WHERE project_id= ?",[project_id]);
                        query.on('result',(row)=>{
                                    results.push(row['user_id']);
                        });
                        query.on('end',()=>{
                                // console.log(results);
                                connection.release();
                                callback(null,results);
                        });
                    });
                },function(arg,callback){
                        var queryArray=[];
                        var created = new Date();
                        for(let a=0;a<user_id.length;a++){
                            if(arg.includes(parseInt(user_id[a])))
                            {
                                console.log('already has user '+user_id[a]+' in project '+project_id);
                            }else{
                                queryArray.push([project_id,user_id[a],permissions[a],created,created]);
                            }
                        }
                        // console.log(queryArray);
                        if(queryArray.length){
                            let new_user_id=[];
                            let new_permissions=[];
                            for(let a=0;a<queryArray.length;a++){
                                new_user_id.push(queryArray[a][1])
                                new_permissions.push(queryArray[a][2])
                                // console.log(queryArray[a][1])
                            }
                            
                            mysqlcon.getConnection((err,connection)=>{
                                var query = connection.query("INSERT INTO nci_project_users (project_id, user_id, \
                                permissions, created_at, updated_at) VALUES ?",[queryArray],
                                function(err,result){
                                    if(err) throw err;
                                    logger.info({
                                        level: 'info',
                                        message: req.session.FirstName + ' ' + req.session.LastName
                                        + '(' + req.session.user_id[0] + ') successfully insert '+result.insertId+' row in `nci_project_users` table'
                                    });
                                    // console.log('successfully insert '+result.insertId+' row in `nci_project_users` table');
                                    // console.log('INSERT INTO nci_project_users (project_id, user_id, permissions, created_at, updated_at');
                                    // console.log('VALUES ('+project_id+', ['+new_user_id+'], ['+new_permissions+'], NOW(), NOW());');
                                    connection.release();
                                    callback(null,{'err':0, 'msg':'Project id '+project_id+' adds user(s) ['+ new_user_id+'] with permission(s) ['+new_permissions+']'});
                                });
                            });
                        }else{
                            callback(null,{'err':1, 'msg':'No new user added (already exit)'});
                        }
                        
                }],function(err,result){
                    return res.json(result);
                });
        }
    }
});

projectsRouter.post('/project_status', isAdmin, (req, res, next) => {
    /*
        remove project from particular users
    */
    // console.log(req.body)
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') POST `/api/v1/project_status`'
    });
    req.checkBody('project_id','Project id cannot be empty').notEmpty();
    req.checkBody('project_id','Project id should be an integer<int(11)>').isInt();
    req.checkBody('project_status','project status cannot be empty').notEmpty();
    req.checkBody('project_status','project status should be a string<varchar(255)>').isString();
    var errors = req.validationErrors();
    if(errors){
        console.log(errors);
    }
    else{
        let project_id = parseInt(req.body.project_id);
        let project_status = req.body.project_status;
        let results=[];
        // console.log("UPDATE nci_projects SET status='"+project_status+"' WHERE id="+project_id+";");
        // console.log(typeof(project_status));
        // console.log(typeof(project_id));
        mysqlcon.getConnection((err,connection)=>{
            if(err) throw err;
            var query = connection.query("UPDATE nci_projects SET status=? WHERE id=?",[project_status,project_id]);
            query.on('result',(row)=>{
                results.push(row);
            });
            query.on('end',()=>{
                logger.info({
                    level: 'info',
                    message: req.session.FirstName + ' ' + req.session.LastName
                    + '(' + req.session.user_id[0] + ') successfully update status="'+project_status+'" WHERE id="'+project_id+'" in `nci_projects` table'
                });
                connection.release();
                return res.json(project_status);
            });
        }); 
        
        
    }
});

projectsRouter.post('/project_permissions', isAdmin, (req, res, next) => {
    /*
        remove project from particular users
    */
    // console.log(req.body)
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') POST `/api/v1/project_permissions`'
    });
    req.checkBody('project_id','Project id cannot be empty').notEmpty();
    req.checkBody('project_id','Project id should be an integer<int(11)>').isInt();
    req.checkBody('user_id','Project id cannot be empty').notEmpty();
    req.checkBody('user_id','Project id should be an integer<int(11)>').isInt();
    var errors = req.validationErrors();
    if(errors){
        console.log(errors);
    }
    else{
        let project_id = parseInt(req.body.project_id);
        let user_id = parseInt(req.body.user_id);
        let permissions = req.body.permissions;
        let results=[];
        // console.log("UPDATE nci_project_users SET permissions='"+permissions+"',updated_at=NOW() WHERE project_id="+project_id+" AND user_id="+user_id+";");
        //console.log(typeof(permissions));
        //console.log(typeof(project_id));
        mysqlcon.getConnection((err,connection)=>{
            if(err) throw err;
            var query = connection.query("UPDATE nci_project_users SET permissions=?,updated_at=NOW() WHERE project_id=? AND user_id=?",[permissions,project_id,user_id]);
            query.on('result',(row)=>{
                results.push(row);
            });
            query.on('end',()=>{
                logger.info({
                    level: 'info',
                    message: req.session.FirstName + ' ' + req.session.LastName
                    + '(' + req.session.user_id[0] + ') successfully update permissions="'+permissions+'",updated_at=NOW() WHERE project_id="'+project_id+'" AND user_id="'+user_id+'" in `nci_project_users` table'
                });
                connection.release();
                return res.json(results);
            });
        }); 
             
    }
});

// For normal users
projectsRouter.get('/projects_overview', isAuth, (req, res, next) => {

    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') GET `/api/v1/projects_overview`'
    });
    /*
        Testing params
    */
    //var LoginUserId = 4;
    // console.log(req.session);
    var LoginUserId = req.session.user_id[0];
    var results = [];
    if (req.session.group_id.includes(7)) {
        mysqlcon.getConnection((err, connection) => {
            if (err) throw err;
            //FOR mariadb 10.2.8
            var query = connection.query("SELECT nci_projects_created_at, nci_projects_id, \
                                          nci_projects_name, nci_projects_pi_id, Pi_First_name, \
                                          Pi_Last_name, number_of_experiments, number_of_studies, \
                                          projects_status, number_of_images, GROUP_CONCAT(short_name) AS short_name, \
                                          GROUP_CONCAT(protocol_category_id) AS protocol_category_id \
                                          FROM (SELECT t5.*, nci_protocol_categories.short_name \
                                          FROM(SELECT t4.*, nci_protocols.protocol_category_id \
                                          FROM(SELECT t3.*,COUNT(imaging_experiments.title) AS number_of_experiments, \
                                          SUM(IFNULL(imaging_experiments.number_of_studies,0)) AS number_of_studies, \
                                          SUM(IFNULL(imaging_experiments.number_of_images,0)) AS number_of_images \
                                          FROM(SELECT t2.*, site_users.last_name AS Pi_Last_name, \
                                          site_users.first_name AS Pi_First_name \
                                          FROM(SELECT nci_projects.id AS nci_projects_id, \
                                          nci_projects.name AS nci_projects_name, nci_projects.pi_id AS nci_projects_pi_id, \
                                          status AS projects_status, created_at AS nci_projects_created_at \
                                          FROM nci_projects) as t2 \
                                          LEFT JOIN site_users ON t2.nci_projects_pi_id=site_users.id) as t3 \
                                          LEFT JOIN imaging_experiments ON t3.nci_projects_id =imaging_experiments.project_id GROUP BY t3.nci_projects_id) as t4 \
                                          LEFT JOIN nci_protocols ON t4.nci_projects_id=nci_protocols.project_id) as t5 \
                                          LEFT JOIN nci_protocol_categories ON t5.protocol_category_id=nci_protocol_categories.id) AS t6 GROUP BY nci_projects_id;");
            //FOR MySQL
            //var query = connection.query("SELECT nci_projects_created_at,nci_projects_id, nci_projects_name, nci_projects_pi_id, Pi_First_name, Pi_Last_name, number_of_experiments, number_of_studies, projects_status, number_of_images, JSON_ARRAYAGG(short_name) AS short_name FROM (SELECT t5.*, nci_protocol_categories.short_name FROM(SELECT t4.*, nci_protocols.protocol_category_id FROM(SELECT t3.*,COUNT(imaging_experiments.title) AS number_of_experiments, SUM(IFNULL(imaging_experiments.number_of_studies,0)) AS number_of_studies, SUM(IFNULL(imaging_experiments.number_of_images,0)) AS number_of_images FROM(SELECT t2.*, site_users.last_name AS Pi_Last_name, site_users.first_name AS Pi_First_name FROM(SELECT nci_projects.id AS nci_projects_id,nci_projects.name AS nci_projects_name,nci_projects.pi_id AS nci_projects_pi_id,status AS projects_status, created_at AS nci_projects_created_at  FROM nci_projects) as t2 LEFT JOIN site_users ON t2.nci_projects_pi_id=site_users.id) as t3 LEFT JOIN imaging_experiments ON t3.nci_projects_id =imaging_experiments.project_id GROUP BY t3.nci_projects_id) as t4 LEFT JOIN nci_protocols ON t4.nci_projects_id=nci_protocols.project_id) as t5 LEFT JOIN nci_protocol_categories ON t5.protocol_category_id=nci_protocol_categories.id) AS t6 GROUP BY nci_projects_id;");//SELECT nci_projects_id, nci_projects_name, nci_projects_pi_id, Pi_First_name, Pi_Last_name, number_of_studies, number_of_images, JSON_ARRAYAGG(short_name) AS short_name FROM (SELECT t5.*, nci_protocol_categories.short_name FROM(SELECT t4.*, nci_protocols.protocol_category_id FROM(SELECT t3.*, SUM(IFNULL(imaging_experiments.number_of_studies,0)) AS number_of_studies, SUM(IFNULL(imaging_experiments.number_of_images,0)) AS number_of_images FROM(SELECT t2.*, site_users.last_name AS Pi_Last_name, site_users.first_name AS Pi_First_name FROM(SELECT nci_projects.id AS nci_projects_id,nci_projects.name AS nci_projects_name,nci_projects.pi_id AS nci_projects_pi_id FROM nci_projects) as t2 LEFT JOIN site_users ON t2.nci_projects_pi_id=site_users.id) as t3 LEFT JOIN imaging_experiments ON t3.nci_projects_id =imaging_experiments.project_id GROUP BY t3.nci_projects_id) as t4 LEFT JOIN nci_protocols ON t4.nci_projects_id=nci_protocols.project_id) as t5 LEFT JOIN nci_protocol_categories ON t5.protocol_category_id=nci_protocol_categories.id) AS t6 GROUP BY nci_projects_id;");            
            query.on('result', (row) => {
                results.push(row);
            });
            query.on('end', () => {
                connection.release();
                return res.json(results);
            });
        });
    } else {
        mysqlcon.getConnection((err, connection) => {
            if (err) throw err;
            //FOR mariadb 10.2.8
            var query = connection.query("SELECT nci_projects_created_at,Login_user, projects_status ,nci_projects_id, nci_projects_name, nci_projects_pi_id, Pi_First_name, Pi_Last_name,number_of_experiments, number_of_studies, number_of_images, GROUP_CONCAT(short_name) AS short_name FROM (SELECT t5.*, nci_protocol_categories.short_name FROM(SELECT t4.*, nci_protocols.protocol_category_id FROM(SELECT t3.*, COUNT(imaging_experiments.title) AS number_of_experiments, SUM(IFNULL(imaging_experiments.number_of_studies,0)) AS number_of_studies, SUM(IFNULL(imaging_experiments.number_of_images,0)) AS number_of_images FROM(SELECT t2.*, site_users.last_name AS Pi_Last_name, site_users.first_name AS Pi_First_name FROM(SELECT status AS projects_status, t1.project_users_user_id AS Login_user, nci_projects.id AS nci_projects_id,nci_projects.name AS nci_projects_name,nci_projects.pi_id AS nci_projects_pi_id,nci_projects.created_at AS nci_projects_created_at FROM (SELECT id AS project_users_id,project_id AS project_users_project_id,user_id AS project_users_user_id,permissions AS project_users_permissions FROM nci_project_users WHERE user_id = "+LoginUserId+") as t1 LEFT JOIN nci_projects ON t1.project_users_project_id=nci_projects.id WHERE status= 'A') as t2 LEFT JOIN site_users ON t2.nci_projects_pi_id=site_users.id) as t3 LEFT JOIN imaging_experiments ON t3.nci_projects_id =imaging_experiments.project_id GROUP BY t3.nci_projects_id) as t4 LEFT JOIN nci_protocols ON t4.nci_projects_id=nci_protocols.project_id) as t5 LEFT JOIN nci_protocol_categories ON t5.protocol_category_id=nci_protocol_categories.id) AS t6 GROUP BY nci_projects_id;");
            //FOR MySQL
            //var query = connection.query("SELECT nci_projects_created_at,Login_user, projects_status ,nci_projects_id, nci_projects_name, nci_projects_pi_id, Pi_First_name, Pi_Last_name, number_of_studies, number_of_experiments,number_of_images, JSON_ARRAYAGG(short_name) AS short_name FROM (SELECT t5.*, nci_protocol_categories.short_name FROM(SELECT t4.*, nci_protocols.protocol_category_id FROM(SELECT t3.*, COUNT(imaging_experiments.title) AS number_of_experiments, SUM(IFNULL(imaging_experiments.number_of_studies,0)) AS number_of_studies, SUM(IFNULL(imaging_experiments.number_of_images,0)) AS number_of_images FROM(SELECT t2.*, site_users.last_name AS Pi_Last_name, site_users.first_name AS Pi_First_name FROM(SELECT status AS projects_status, t1.project_users_user_id AS Login_user, nci_projects.id AS nci_projects_id,nci_projects.name AS nci_projects_name,nci_projects.pi_id AS nci_projects_pi_id, nci_projects.created_at AS nci_projects_created_at FROM (SELECT id AS project_users_id,project_id AS project_users_project_id,user_id AS project_users_user_id,permissions AS project_users_permissions FROM nci_project_users WHERE user_id = "+LoginUserId+") as t1 LEFT JOIN nci_projects ON t1.project_users_project_id=nci_projects.id WHERE status= 'A') as t2 LEFT JOIN site_users ON t2.nci_projects_pi_id=site_users.id) as t3 LEFT JOIN imaging_experiments ON t3.nci_projects_id =imaging_experiments.project_id GROUP BY t3.nci_projects_id) as t4 LEFT JOIN nci_protocols ON t4.nci_projects_id=nci_protocols.project_id) as t5 LEFT JOIN nci_protocol_categories ON t5.protocol_category_id=nci_protocol_categories.id) AS t6 GROUP BY nci_projects_id;");
            query.on('result', (row) => {
                results.push(row);
            });
            query.on('end', () => {
                connection.release();
                return res.json(results);
            });
        });
    }
});

projectsRouter.get('/project/:project_id', isAuth, (req, res, next) => {   //isAuth
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') GET `/api/v1/project/' + req.params.project_id + '`'
    });
    /*
        Testing params
    */
    var selected_project = req.params.project_id;
    /*
        Query project
    */
    /*
        validation for random project query is need for user who does not have access to that project
    */
    var results = [];
    mysqlcon.getConnection((err, connection) => {
        if (err) throw err;
        //FOR mariadb10.2.8
        var query = connection.query("SELECT last_name,first_name, nci_project_pi_id,nci_project_id, nci_project_name, authors, requester, collaborator, collab_grant_num, SRAC_number, SRAC_file, status, proposal, est_costs, fund_project_id, disease_id, organ_id, process_id, mouse_id, probe_id, GROUP_CONCAT(nci_protocols_number_of_objects) AS number_of_objects, GROUP_CONCAT(nci_protocols_studies_per_object) AS studies_per_object, GROUP_CONCAT(nci_protocols_hours_per_study) AS hours_per_study, GROUP_CONCAT(name) AS name, GROUP_CONCAT(short_name) AS short_name, GROUP_CONCAT(nci_protocols_id) AS protocols_id, GROUP_CONCAT(protocol_category_id) AS protocol_category_id FROM(SELECT t3.*, nci_protocol_categories.name, nci_protocol_categories.short_name FROM(SELECT site_users.last_name, site_users.first_name, t2.* FROM(SELECT t1.*, nci_protocols.id AS nci_protocols_id, nci_protocols.protocol_category_id AS protocol_category_id, nci_protocols.project_id AS nci_protocols_project_id, nci_protocols.number_of_objects AS nci_protocols_number_of_objects, nci_protocols.studies_per_object AS nci_protocols_studies_per_object, nci_protocols.hours_per_study AS nci_protocols_hours_per_study From (SELECT id AS nci_project_id,name AS nci_project_name,pi_id AS nci_project_pi_id,authors,requester,collaborator,collab_grant_num,SRAC_number,SRAC_file,status,proposal,est_costs,fund_project_id, disease_id, organ_id, process_id, mouse_id, probe_id FROM nci_projects WHERE id = "+selected_project+") as t1 LEFT JOIN nci_protocols ON t1.nci_project_id=nci_protocols.project_id) as t2 LEFT JOIN site_users ON t2.nci_project_pi_id = site_users.id) AS t3 LEFT JOIN nci_protocol_categories ON t3.protocol_category_id=nci_protocol_categories.id) AS t4 GROUP BY nci_project_id;");
        //FOR MySQL
        //var query = connection.query("SELECT last_name,first_name, nci_project_pi_id,nci_project_id, nci_project_name, authors, requester, collaborator, collab_grant_num, SRAC_number, SRAC_file, status, proposal, est_costs, fund_project_id, disease_id, organ_id, process_id, mouse_id, probe_id, JSON_ARRAYAGG(nci_protocols_number_of_objects) AS number_of_objects, JSON_ARRAYAGG(nci_protocols_studies_per_object) AS studies_per_object, JSON_ARRAYAGG(nci_protocols_hours_per_study) AS hours_per_study, JSON_ARRAYAGG(name) AS name, JSON_ARRAYAGG(short_name) AS short_name, JSON_ARRAYAGG(nci_protocols_id) AS protocols_id, JSON_ARRAYAGG(protocol_category_id) AS protocol_category_id FROM(SELECT t3.*, nci_protocol_categories.name, nci_protocol_categories.short_name FROM(SELECT site_users.last_name, site_users.first_name, t2.* FROM(SELECT t1.*, nci_protocols.id AS nci_protocols_id, nci_protocols.protocol_category_id AS protocol_category_id, nci_protocols.project_id AS nci_protocols_project_id, nci_protocols.number_of_objects AS nci_protocols_number_of_objects, nci_protocols.studies_per_object AS nci_protocols_studies_per_object, nci_protocols.hours_per_study AS nci_protocols_hours_per_study From (SELECT id AS nci_project_id,name AS nci_project_name,pi_id AS nci_project_pi_id,authors,requester,collaborator,collab_grant_num,SRAC_number,SRAC_file,status,proposal,est_costs,fund_project_id, disease_id, organ_id, process_id, mouse_id, probe_id FROM nci_projects WHERE id = "+selected_project+") as t1 LEFT JOIN nci_protocols ON t1.nci_project_id=nci_protocols.project_id) as t2 LEFT JOIN site_users ON t2.nci_project_pi_id = site_users.id) AS t3 LEFT JOIN nci_protocol_categories ON t3.protocol_category_id=nci_protocol_categories.id) AS t4 GROUP BY nci_project_id;");
        query.on('result', (row) => {
            results.push(row);
        });
        query.on('end', () => {
            connection.release();
            return res.json(results);
        });
    });
});
projectsRouter.get('/project_users/:project_id', isAuth, (req, res, next) => {
    logger.info({
        level: 'info',
        message: req.session.FirstName + ' ' + req.session.LastName
        + '(' + req.session.user_id[0] + ') GET `/api/v1/project_users/' + req.params.project_id + '`'
    });
    var selected_project_id = req.params.project_id;
    var results = [];
    mysqlcon.getConnection((err, connection) => {
        if(err) throw err;
        var query = connection.query("SELECT project_id,user_id,last_name,first_name,permissions FROM(SELECT * FROM nci_project_users WHERE project_id=" + selected_project_id + ") AS t1 LEFT JOIN site_users ON t1.user_id= site_users.id;");        
        query.on('result', (row) => {
                results.push(row);
        });
        query.on('end', () => {
                connection.release();
                return res.json(results);
        });
    });
});
module.exports = projectsRouter;