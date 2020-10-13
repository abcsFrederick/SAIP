import Backbone from 'backbone';
import accessRequests_overview_model from '../../models/users/accessRequests_overview';
var accessRequests_overview = Backbone.Collection.extend({
  model:accessRequests_overview_model,
  initialize(setting){
    this.domain = setting.domain;
  },
  url:function(){
    return this.domain + 'api/v1/accessRequests_overview';
  }
});

export default accessRequests_overview;