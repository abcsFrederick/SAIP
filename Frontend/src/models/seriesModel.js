import Backbone from 'backbone';

var queryModel = Backbone.Model.extend({
	url:'/api',
	modality:null,
	studyId:null
});

export default queryModel;