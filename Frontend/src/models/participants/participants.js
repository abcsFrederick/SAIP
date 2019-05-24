import Backbone from 'backbone';


var participants = Backbone.Model.extend({
	pat_id:'',
	pat_name:'',
	pat_mrn:'',
	pat_path:'',
	study_id:'',
	studyid:'',
	study_mod_time:'',
	study_description:'',
	study_path:'',
	series_description:'',
	series_number:'',
	modality:'',
	num_images:'',
	series_path:'',
	series_uid:'',
	modality:''

});

export default participants;