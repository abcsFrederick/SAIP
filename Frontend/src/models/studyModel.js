import Backbone from 'backbone';

var studyQuery = Backbone.Model.extend({
	url:function(){
		return 'http://ivg-boxx:3000/api/v1/scippy/study='+this.options.studyId
	},
	initialize(options){
		this.options = options
	}
});

export default studyQuery;