import Backbone from 'backbone';
import $ from 'jquery';
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";
import App from './App.js';
import Router from './router';

import './stylesheets/body.styl';

$(function () {
	new App({
		el: 'body',
	});
	this.router = new Router();

	Backbone.history.start(); 
	this.router.navigate('/', true);
});
