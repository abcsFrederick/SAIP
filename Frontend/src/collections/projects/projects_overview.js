import Backbone from 'backbone';
import project_overview_model from '../../models/projects/project_overview';
var project_overview = Backbone.Collection.extend({
	model:project_overview_model,
	initialize(setting){
		this.domain = setting.domain;
	},
	url:function(){
		return this.domain + 'api/v1/projects_overview';
	}
});

export default project_overview;