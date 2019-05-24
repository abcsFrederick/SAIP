import Backbone from "backbone";
import protocols_overview_model from '../../models/protocols/protocols_overview';
var protocols_overview_Collection= Backbone.Collection.extend({
	model:protocols_overview_model,
	initialize(setting){
		this.domain = setting.domain
	},
	url:function(){
		return this.domain+'api/v1/protocols_overview'
	}
});

export default protocols_overview_Collection;