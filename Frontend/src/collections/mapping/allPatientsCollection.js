import Backbone from "backbone";
import allPatients_model from '../../models/mapping/allPatients';
var allPatients = Backbone.Collection.extend({
	model:allPatients_model,
	initialize(setting){
		this.domain = setting.domain;
	},
	url:function(){
		return this.domain+'api/v1/mappingAll';
	}
});

export default allPatients;