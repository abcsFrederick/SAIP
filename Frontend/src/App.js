import $ from 'jquery';
import _ from 'underscore';
import Backbone from 'backbone';

import View from './views/View';
import ControlPanel from './views/panels/controlPanel';
import UsersCollection from './collections/users/users_overview';
import ProbeCollection from './collections/probes/probes_overview';
import ProtocolsCollection from './collections/protocols/protocols_overview';

import HeaderLayout from './templates/headerLayout.pug';
import './stylesheets/headerLayout.styl';


var domain = 'http://localhost:3000/';
var VMpro = 'https://frsivg-mip02p.ncifcrf.gov/v0.1/';
var VMdev = 'https://frsivg-mip02d.ncifcrf.gov/v0.1/';
var domain_ws = 'ws://localhost:3000/';
var VMpro_ws = 'wss://frsivg-mip02p.ncifcrf.gov/w0.1/';
var VMdev_ws = 'wss://frsivg-mip02d.ncifcrf.gov/w0.1/';


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
					this.is_admin = res.Group_id.includes(7);
					/* phase2 */
					this.probeCollection = new ProbeCollection({
						domain: this.domain
					});
					this.probeCollection.fetch({
						xhrFields: {
							withCredentials: true							// override ajax to send with credential
						},
						success: (_.bind(function (res) {
							console.log('probes collection');
							console.log(res.toJSON());
						}, this))
					});
					if (this.is_admin) {
						this.usersCollection = new UsersCollection({
							domain: this.domain
						});
						this.usersCollection.fetch({
							xhrFields: {
								withCredentials: true							// override ajax to send with credential
							},
							success: (_.bind(function (res) {
								console.log('users collection');
								console.log(res);
							}, this))
						});
						this.protocolsCollection = new ProtocolsCollection({
							domain: this.domain
						});
						this.protocolsCollection.fetch({
							xhrFields: {
								withCredentials: true							// override ajax to send with credential
							},
							success: (_.bind(function (res) {
								console.log('protocols collection');
								console.log(res.toJSON());
							}, this))
						});
					}
					this.controlPanel = new ControlPanel({
						admin: this.is_admin,	// res.Group_id.includes(10) no admin
						el: this.$('.playground'),
						domain_ws: this.domain_ws,
						domain: this.domain,
						user_id: res.User_id[0],
						LoginAdminUser: res,
						users: this.usersCollection || '',
						probes: this.probeCollection || '',
						protocols: this.protocolsCollection || ''
					});

					this.user = res.msg;
					if (this.is_admin) {
						$('#NCIAdminUser').html('&nbsp;&nbsp;&nbsp;(' + res.FirstName + ' ' + res.LastName + ')');
					} else {
						$('#NCIEndUser').html('&nbsp;&nbsp;&nbsp;(' + res.FirstName + ' ' + res.LastName + ')');
					}
					$('#appVersion').html(' v' + res.appVersion);
					// var testingRes = [{'nci_projects_name':'ABCC Folder','nci_projects_created_at':'2010-09-15T02:17:10.000Z','nci_projects_updated_at':'2011-02-14T22:37:44.000Z','site_users_id':3,'site_users_last_name':'Miao','site_users_first_name':'Tianyi','nci_project_users_project_id':58},{'nci_projects_name':'ABCC','nci_projects_created_at':'2010-09-15T02:17:09.000Z','nci_projects_updated_at':'2010-09-15T02:17:09.000Z','site_users_id':3,'site_users_last_name':'Miao','site_users_first_name':'Tianyi','nci_project_users_project_id':33}];
				} else {
					// window.location.replace('https://frsivg-mip01p.ncifcrf.gov/');
					window.location.replace('C:/Users/miaot2/%7B%7BHome%20Folder%7D%7D/html_learning/SAIP/Frontend/public/loginPageDev.html');
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
