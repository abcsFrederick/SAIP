import Backbone from 'backbone';
import Patient from '../models/patient_study.js';
var patient = Backbone.Collection.extend({
	model:Patient,
	resoucePatient:'patient=',
	resouceDate:'date=',
	url: function(){
		return this.setting.urlBase+'/'+this.resouceDate+this.setting.from+'.'+this.setting.to
		+'/'+this.resoucePatient+this.setting.patientName
	},
	initialize(setting){
		this.setting = setting
	}
});

export default patient;