import Backbone from 'backbone';


var protocols_overview = Backbone.Model.extend({
	id:'',
	name:'',
	protocol_group_id:'',
	short_name:'',
	color:'',
	technician_id:'',
	chargeable: '',
	schedule: '',
	color: '',
	charge_per_hour: '',
	hours_per_study: '',
	default_category: '',
	inactive: '',
	allow_overlapping_events: '',
	created_at: '',
	updated_at: ''
});

export default protocols_overview;