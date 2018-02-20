import Backbone from 'backbone';
import Study_series from '../models/study_series';

var study_series = Backbone.Collection.extend({
	rescoureStudy:'study=',

	url:function(){
		return this.setting.urlBase+"/"+this.rescoureStudy+this.setting.study_id
	},
	initialize(setting){
		this.setting = setting
	}
});

export default study_series;
