import Backbone from 'backbone';


var allpatients = Backbone.Model.extend({
	pat_mrn:'',
	pat_name:'',
	id:''
});

export default allpatients;