import Backbone from "backbone";
import protocol_projects_model from '../../models/protocols/protocol_projects';
var protocol_projects_Collection= Backbone.Collection.extend({
	model:protocol_projects_model,
	initialize(setting){
		this.domain = setting.domain;
		this.protocolid =setting.protocolid
	},
	url:function(){
		return this.domain+'api/v1/project_protocol/'+this.protocolid
	}
});

export default protocol_projects_Collection;