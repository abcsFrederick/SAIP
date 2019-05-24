import Backbone from "backbone";
import protocol_category_model from '../../models/protocols/protocol_category';
var protocol_category_Collection= Backbone.Collection.extend({
	model:protocol_category_model,
	initialize(setting){
		this.domain = setting.domain;
		this.protocolGroupid = setting.protocolGroupid;
	},
	url:function(){
		return this.domain+'api/v1/protocol/'+this.protocolGroupid
	}
});

export default protocol_category_Collection;