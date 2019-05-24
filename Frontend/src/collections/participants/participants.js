import Backbone from "backbone";
import participants_model from '../../models/participants/participants';
var participantsCollection= Backbone.Collection.extend({
	model:participants_model,
	initialize(setting){
		this.domain = setting.domain;
		this.experiment_id=setting.experiment_id;
	},
	url:function(){
		return this.domain+'api/v1/imaging_participants/'+this.experiment_id
	}
});

export default participantsCollection;