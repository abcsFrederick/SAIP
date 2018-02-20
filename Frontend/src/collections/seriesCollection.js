import Backbone from 'backbone';
import SeriesModel from '../models/seriesModel';

var seriesCollection = Backbone.Collection.extend({
	url:function(){
		return this.options.url
	},
	initialize(models,options){
		this.options = options
	}
	//model:SeriesModel
});

export default seriesCollection;