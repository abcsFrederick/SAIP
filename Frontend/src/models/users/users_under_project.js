import Backbone from 'backbone';


var users_under_project = Backbone.Model.extend({
	project_id:'',
	user_id:'',
	last_name:'',
	first_name:'',
	permissions:''
});

export default users_under_project;