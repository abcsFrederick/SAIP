import Backbone from "backbone";
import protocol_group_model from '../../models/protocols/protocol_group';
var protocol_group_Collection= Backbone.Collection.extend({
	model:protocol_group_model,
	initialize(setting){
		this.domain = setting.domain;
	},
	url:function(){
		return this.domain+'api/v1/protocol_groups'
	}
});

export default protocol_group_Collection;