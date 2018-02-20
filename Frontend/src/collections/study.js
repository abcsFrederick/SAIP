import Backbone from 'backbone';
import Study from '../models/study';

var study = Backbone.Collection.extend({
	resourceStudy:'study/patient=',
	urlBase: this.urlBase,
	patientId:this.patient_id,
	url:function(){
		return this.urlBase+'/'+this.resourceStudy+this.patientId
	},
	initialize(setting){
		this.setting = setting
	}
});

export default study;