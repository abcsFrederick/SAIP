import Backbone from 'backbone';
import groups_overview_model from '../../models/groups/groups_overview';
var groups_overview = Backbone.Collection.extend({
	model: groups_overview_model,
	initialize(setting) {
		this.domain = setting.domain;
	},
	url: function () {
		return this.domain + 'api/v1/groups_overview';
	}
});

export default groups_overview;