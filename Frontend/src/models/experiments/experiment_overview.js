import Backbone from 'backbone';


var experiment_overview = Backbone.Model.extend({
	last_name:'',
	first_name:'',
	id:'',
	title:'',
	description:'',
	number_of_studies:'',
	number_of_series:'',
	number_of_images:'',
	mouse_id:'',
	probe_id:'',
	updated_at:''
});

export default experiment_overview;