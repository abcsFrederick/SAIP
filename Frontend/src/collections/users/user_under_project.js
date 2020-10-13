import Backbone from 'backbone';
import users_under_project_model from '../../models/users/users_under_project';
var users_under_project = Backbone.Collection.extend({
	model:users_under_project_model,
	initialize(setting){
		this.domain = setting.domain;
		this.project_id = setting.project_id;
	},
	url:function(){
		return this.domain + 'api/v1/project_users/' + this.project_id;
	}
});

export default users_under_project;