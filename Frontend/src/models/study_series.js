import Backbone from 'backbone';


var study_series = Backbone.Model.extend({
	id:'',
	modality:'',
	series_description:'',
	series_path:''
});

export default study_series;