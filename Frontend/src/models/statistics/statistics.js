import Backbone from 'backbone';


var statistics_overview = Backbone.Model.extend({
	id:'',
	event:'',
	type:'',
	user_id:'',
	last_name:'',
	first_name:'',
	timestamp:''
});

export default statistics_overview;