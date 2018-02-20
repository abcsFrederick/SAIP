import Backbone from 'backbone';

var downloadSeries = Backbone.Collection.extend({

	resouceDownload:'downloadSeries',
	url: function(){
		return this.setting.urlBase+'/'+this.resouceDownload+'/'+this.setting.params
	},
	initialize(setting){
		this.setting = setting
	}
});

export default downloadSeries;