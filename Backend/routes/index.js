
const express = require('express');
const router = express.Router();
const pg = require('pg');
const path = require('path');
const connectionString = process.env.DATABASE_URL || 'postgres://miaot2:luying0325@localhost:5432/miaot2';


router.get('/api/v1/scippy',(req,res,next)=>{
	const results = [];
	pg.connect(connectionString,(err,client,done)=>{
		if(err){
			done();
			console.log(err);
			return res.status(500),json({success:false,data:err});
		}
		const query = client.query("SELECT * FROM series WHERE series_date >= '$2010/01/01' and series_date <= '2010/01/20'");
		query.on('row',(row)=>{
			results.push(row);
		});
		query.on('end',()=>{
			done();
			return res.json(results);
		});
	});
});

