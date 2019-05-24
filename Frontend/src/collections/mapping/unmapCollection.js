import Backbone from "backbone";
import unmap_model from '../../models/mapping/unmap';
var unmap = Backbone.Collection.extend({
	model:unmap_model,
	initialize(setting){
		this.domain = setting.domain;
	},
	url:function(){
		return this.domain+'api/v1/mapping';
	}
});

export default unmap;