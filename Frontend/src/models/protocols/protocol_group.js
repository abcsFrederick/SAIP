import Backbone from 'backbone';


var protocol_group = Backbone.Model.extend({
	id:'',
	name:'',
	short_name:'',
	color:'',
	technician_id:''
});

export default protocol_group;