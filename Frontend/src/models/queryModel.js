import Backbone from 'backbone';

var queryModel = Backbone.Model.extend({
	url:'http://ivg-boxx:3000/api/v1/scippy/date=2010-01-02.2010-01-20/modality=CT'
});

export default queryModel;