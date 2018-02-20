import Backbone from 'backbone';

var patient = Backbone.Model.extend({
	study_id:'',
	patient_name:'',
	study_description:'',
	patient_path:'',
	study_path:''
});

export default patient;