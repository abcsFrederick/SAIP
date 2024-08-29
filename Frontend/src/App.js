import $ from 'jquery';
import _ from 'underscore';
import Backbone from 'backbone';

import View from './views/View';
import ControlPanel from './views/panels/controlPanel';

import HeaderLayout from './templates/headerLayout.pug';
import './stylesheets/headerLayout.styl';
import {SYSTEM_ADMIN} from './constants.js';

var domain = api;
var VMpro = 'https://fsivgl-mip02p.ncifcrf.gov/v0.1/';
var domain_ws = ws;
var VMpro_ws = 'wss://fsivgl-mip02p.ncifcrf.gov/w0.1/';


var App = View.extend({
	initialize(){
		this.render();
		this.domain = domain;
		this.domain_ws = domain_ws;
		$.ajax({
			url: this.domain + '',
			type: 'GET',

			xhrFields: {
				withCredentials: true
			},
			success: _.bind(function (res) {
				if (res.status === 'Authenticated') {
					this.permission = res.Permission;
					this.admin_groups = res.Admin_groups;
					this.user_groups = res.User_groups;
					/* phase2 */
					this.controlPanel = new ControlPanel({
						permission: this.permission,
						admin_groups: this.admin_groups,
						is_sys_admin: this.permission === 2,
						el: this.$('.playground'),
						domain_ws: this.domain_ws,
						domain: this.domain,
						user_id: res.User_id[0],
						LoginAdminUser: res
					});

					this.user = res.msg;
					if (this.permission === 2) {
						$('#NCIAdminUser').html('&nbsp;&nbsp;&nbsp;(' + res.FirstName + ' ' + res.LastName + ' Admin of System)');
					} else if (this.permission === 1) {
						$('#NCIAdminUser').html(`&nbsp;&nbsp;&nbsp;(${res.FirstName} ${res.LastName} Admin of ${res.Admin_groups[0].name})`);
					} else {
						$('#NCIEndUser').html('&nbsp;&nbsp;&nbsp;(' + res.FirstName + ' ' + res.LastName + ')');
					}
					$('#appVersion').html(' v' + res.appVersion);
					// var testingRes = [{'nci_projects_name':'ABCC Folder','nci_projects_created_at':'2010-09-15T02:17:10.000Z','nci_projects_updated_at':'2011-02-14T22:37:44.000Z','site_users_id':3,'site_users_last_name':'Miao','site_users_first_name':'Tianyi','nci_project_users_project_id':58},{'nci_projects_name':'ABCC','nci_projects_created_at':'2010-09-15T02:17:09.000Z','nci_projects_updated_at':'2010-09-15T02:17:09.000Z','site_users_id':3,'site_users_last_name':'Miao','site_users_first_name':'Tianyi','nci_project_users_project_id':33}];
				} else {
					// window.location.replace('https://frsivg-mip01p.ncifcrf.gov/');
					window.location.replace('https://fsivgl-infv01d.ncifcrf.gov/');
				}
			}, this)
		});
	},
	render() {
		let d = new Date();
		this.$el.html(HeaderLayout({
			footer: d.getFullYear()
		}));
		return this;
	}
});

Backbone.View.prototype.close = function () {
	// console.log('abcc Unbinding events for ' + this.cid);
	this.remove();
	this.unbind();

	if (this.onClose) {
		this.onClose();
	}
};

export default App;
