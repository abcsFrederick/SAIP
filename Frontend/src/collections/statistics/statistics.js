import Backbone from "backbone";
import statistics_model from '../../models/statistics/statistics';
var statistics_overview = Backbone.Collection.extend({
	model:statistics_model,
	initialize(setting){
		this.domain = setting.domain
	},
	url:function(){
		return this.domain+'api/v1/statistics_overview'
	}
});

export default statistics_overview;