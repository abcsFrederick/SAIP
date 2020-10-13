import $ from 'jquery'
import _ from 'underscore'
import Backbone from 'backbone'
import ProbeCollection from '../../collections/probes/probes_overview'
import eventsBus from '../../eventsBus'
import View from '../View'
import ProbesTable from '../../templates/probes/probes.pug'
var protocol = View.extend({
  events: {
    'click #add_New_Probe': 'add_New_Probe'
  },
  initialize (setting) {
    this.is_admin = setting.admin
    this.$el.html(ProbesTable({ admin: this.is_admin }))
    this.domain = setting.domain
    this.probeCollection = new ProbeCollection({
      domain: this.domain
    })
    this.render()
  },
  render () {
    this.probeCollection.fetch({
      xhrFields: {
				  withCredentials: true							// override ajax to send with credential
      },
      success: (_.bind(function (res) {
        this.probesTable = $('#probesTable').DataTable({
          data: res.toJSON(),
          language: {
				        searchPlaceholder: 'Search Probe'
				    },
          columns: [
				    	{
				    		data: 'name'
				    	},
				    	{
				    		data: 'description'
				    	}
			    	],
				    buttons: [
    					{
    						className: ' btn btn-primary',
    						text: 'Add New Probe',
    						action: _.bind(function () {
    							$('#addNewProbe').show()
    					 		$('.close').on('click', function () {
    					 			$('#addNewProbe').hide()
    					 		})
    					 		$('.cancel').on('click', function () {
    					 			$('#addNewProbe').hide()
    					 		})
    						}, this)
    					}
    				],
			    	destroy: true,
          lengthMenu: [[-1], ['ALL']],
          scrollY: '80vh',
          scrollCollapse: true,
          dom: '<"datatable_addProbe_buttons col-md-6"B><"datatable_search_probes col-md-6"f>rt'
        })
      }, this))
    })
    return this
  },
  add_New_Probe () {
    console.log($('#newProbeName').val())
    console.log($('#probeDescription').val())

    var newProbeData = new FormData()

    newProbeData.append('name', $('#newProbeName').val())
    newProbeData.append('description', $('#probeDescription').val())

    $.ajax({
      url: this.domain + 'api/v1/probes_add',
      type: 'POST',
      data: newProbeData,
      processData: false, // important
      contentType: false, // important
      dataType: 'json',
      xhrFields: {
			  withCredentials: true
      },
		    success: _.bind(function (res) {
		    	if (!res.err) {
		    		$('#addNewProbe').hide()
		    		eventsBus.trigger('addNewProbeEvent')
		    		$('.alert-success').empty()
		    		$('.alert-success').html(res.msg)
		    		$('.alert-success').fadeTo('slow', 0.8).delay(3000).slideUp(500)
		    	}
		    }, this)
    })
  }
})

export default protocol
