import Backbone from 'backbone';
import QueryModel from '../models/queryModel';
var queryCollection = Backbone.Collection.extend({
	url:'que.php',
	model:QueryModel
});

export default queryCollection;