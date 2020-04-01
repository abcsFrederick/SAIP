import Backbone from 'backbone';
import experiment_overview_model from '../../models/experiments/experiment_overview';
var experiment_overview = Backbone.Collection.extend({
	model:experiment_overview_model,
	initialize(setting){
		this.domain = setting.domain;
		this.project_id = setting.project_id;
	},
	url:function(){
		return this.domain + 'api/v1/experiments/' + this.project_id;
	}
});

export default experiment_overview;