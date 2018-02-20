import _ from 'underscore';
import Backbone from 'backbone';
import $ from 'jquery';
import bootstrap from 'bootstrap/dist/css/bootstrap.css';
import App from './App.js';
import Router from './router';
import './stylesheets/body.styl';
$(function(){

	var app = new App({
		el:'body',
	});
	this.router = new Router();

	Backbone.history.start(); 
	this.router.navigate('/', true);
});