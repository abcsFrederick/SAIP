import Backbone from "backbone";
import users_overview_model from '../../models/users/users_overview';
var users_overview = Backbone.Collection.extend({
	model:users_overview_model,
	initialize(setting){
		this.domain = setting.domain
	},
	url:function(){
		return this.domain+'api/v1/users_overview'
	}
});

export default users_overview;