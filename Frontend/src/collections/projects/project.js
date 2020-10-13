import Backbone from 'backbone';
import project_model from '../../models/projects/project';
var projectCollection = Backbone.Collection.extend({
	model:project_model,
	initialize(setting){
		this.domain = setting.domain;
		this.project_id = setting.project_id;
	},
	url:function(){
		return this.domain + 'api/v1/project/' + this.project_id;
	}
});

export default projectCollection;