import Backbone from 'backbone';


var experimentDoc = Backbone.Model.extend({
	name:'',
	path:'',
	size:'',
	created:''
});

export default experimentDoc;