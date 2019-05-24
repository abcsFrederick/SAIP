import Backbone from 'backbone';


var project_overview = Backbone.Model.extend({
	Login_user:'',
	nci_projects_id:'',
	nci_projects_name:'',
	nci_projects_pi_id:'',
	Pi_Last_name:'',
	Pi_First_name:'',
	number_of_studies:'',
	number_of_images:'',
	protocol_category_id:'',
	short_name:'',
	projects_status:''
});

export default project_overview;