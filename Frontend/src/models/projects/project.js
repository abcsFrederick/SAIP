import Backbone from 'backbone';


var project = Backbone.Model.extend({
	last_name:'',
	first_name:'',
	nci_project_id:'',
	nci_project_pi_id:'',
	nci_project_name:'',
	authors:'',
	requester:'',
	collaborator:'',
	collab_grant_num:'',
	SRAC_number:'',
	SRAC_file:'',
	status:'',
	proposal:'',
	est_costs:'',
	fund_project_id:'',
	disease_id:'',
	organ_id:'',
	process_id:'',
	mouse_id:'',
	probe_id:'',
	number_of_objects:'',
	studies_per_object:'',
	hours_per_study:'',
	name:'',
	short_name:'',
	protocols_id:'',
	protocol_category_id:''
});

export default project;