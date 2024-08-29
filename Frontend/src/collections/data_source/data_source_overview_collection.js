import Backbone from 'backbone';
import data_source_model from '../../models/data_source/data_source_overview';


var data_source_overview = Backbone.Collection.extend({
	model: data_source_model,
	initialize (setting) {
		this.domain = setting.domain;
	},
	url: function() {
		return this.domain + 'api/v1/data_source_overview';
	}
});

export default data_source_overview;