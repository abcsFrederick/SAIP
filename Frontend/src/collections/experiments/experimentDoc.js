import Backbone from 'backbone';
import experimentDoc_model from '../../models/experiments/experimentDoc';
var experimentDoc = Backbone.Collection.extend({
	model:experimentDoc_model,
	initialize(setting){
		this.domain = setting.domain;
		this.experiment_id = setting.experiment_id;
	},
	url:function(){
		return this.domain + 'api/v1/experiment_doc/' + this.experiment_id;
	}
});

export default experimentDoc;