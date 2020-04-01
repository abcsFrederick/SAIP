import Backbone from 'backbone';
import probes_overview_model from '../../models/probes/probes_overview';
var probes_overview = Backbone.Collection.extend({
	model:probes_overview_model,
	initialize(setting){
		this.domain = setting.domain;
	},
	url:function(){
		return this.domain + 'api/v1/probes_overview';
	}
});

export default probes_overview;