import $ from 'jquery'
import _ from 'underscore'
import View from '../View'
import selectedExperimentTemplate from '../../templates/mapping/SelectedExperiment.pug'
import participantsCollection from '../../collections/participants/participants'
import eventsBus from '../../eventsBus'
var selectedExperiment = View.extend({
  events: {
    // 'click #Link':'Link',
    // 'click #DeLink':'DeLink',
    'click #selectedExperimentParticipants tbody tr': 'selectedExperimentParticipantsRender'
  },
  initialize (setting) {
    this.$el.html(selectedExperimentTemplate())
    this.experiment_id = setting.experiment_id
    this.domain = setting.domain
    this.participants = new participantsCollection({			// Do not use this.participants to avoid duplicate maybe??
      domain: this.domain,
      experiment_id: this.experiment_id
    })
    eventsBus.on('needMapParents', this.needMapParentsPropagate, this)
    this.mapping = setting.parent
    this.mapping.needMapParents = []
    this.allParentElement = setting.allParentElement
    eventsBus.on('Link', this.Link, this)
    eventsBus.on('DeLink', this.DeLink, this)
    this.render()
  },
  render () {
    this.participants.fetch({
      xhrFields: {
				  withCredentials: true							// override ajax to send with credential
      },
      success: _.bind(function (res) {
        const uniqueParentsIdInExperiment = []
        const uniqueParentsInExperimentTable = []
        for (let a = 0; a < res.toJSON().length; a++) {
          // console.log(res.toJSON()[a])
          if (!uniqueParentsIdInExperiment.includes(res.toJSON()[a].pat_id)) {
            uniqueParentsIdInExperiment.push(res.toJSON()[a].pat_id)
            uniqueParentsInExperimentTable.push(res.toJSON()[a])
          } else {
            //	console.log('skip '+res.toJSON()[a].pat_id)
          }
        }
        // console.log(uniqueParentsIdInExperiment);
        // console.log(uniqueParentsInExperimentTable);
        this.linkedParticipants = []
        console.log(res.toJSON()[0].error)
        if (res.toJSON()[0].error != 'no patient exist') {
          this.selectedProject_table = $('#selectedExperimentParticipants').DataTable({

					    data: uniqueParentsInExperimentTable,
					    rowId: 'pat_id',
					    columns: [
					    	{
					    		data: 'pat_name'
					    	},
					    	{
					    		data: 'pat_mrn'
					    	}
					    ],
					    destroy: true,
            lengthMenu: [[-1], ['ALL']],
            scrollY: '30vh',
            scrollCollapse: true,
            dom: ' rt'
          })
        } else {
          console.log(res.toJSON())
          this.participantsTable = $('#selectedExperimentParticipants').DataTable({
            data: res.toJSON(),
            columns: [
					    	{
					    		data: 'error'
					    	},
					    	{
					    		data: 'error'
					    	}
					    	],
					    destroy: true,
            lengthMenu: [[-1], ['ALL']],
            scrollY: '500px',
            scrollCollapse: true,
            dom: 'rt'
          })
        }
        $('#patientsCollapse').on('show.bs.collapse', function () {
          $('#patientsCollapseHeader').addClass('active')
        })

        $('#patientsCollapse').on('hide.bs.collapse', function () {
          $('#patientsCollapseHeader').removeClass('active')
        })
      }, this)
    })
    return this
  },
  selectedExperimentParticipantsRender (e) {
    if ($(e.currentTarget).hasClass('selected')) {
      $(e.currentTarget).removeClass('selected')
      this.linkedParticipants.splice(this.linkedParticipants.indexOf(e.currentTarget.id), 1)
    } else {
      $(e.currentTarget).addClass('selected')
      this.linkedParticipants.push(e.currentTarget.id)// make sure parent is not depulicate?
    }
  },
  Link () {
    this.allParentElement.children().children().removeClass('selected')
    console.log(this.needMapParents)
    console.log(this.experiment_id)
    var newMappingData = new FormData()
    newMappingData.append('experiment_id', this.experiment_id)
    newMappingData.append('linkedParticipants', JSON.stringify(this.needMapParents))

    //	console.log(newMappingData)
    $.ajax({
      url: this.domain + 'api/v1/mapping/linkToExp',
      type: 'POST',
      data: newMappingData,
      processData: false, // important
      contentType: false, // important
      dataType: 'json',
      xhrFields: {
			  withCredentials: true
      },
      success: _.bind(function (res) {
        // console.log(res);
        this.needMapParents = []
        if (res.err == 0) {
          console.log(res)
          this.render()
          this.mapping.unmappedTableRender()
        } else {
          console.log(res)
          $('#linkErr').tooltip('enable')
          $('#linkErr').tooltip('show')
          setTimeout(function () { $('#linkErr').tooltip('hide') }, 3000)
          $('#linkErr').tooltip('disable')
        }
      }, this)
    })
  },
  DeLink () {
    var newMappingData = new FormData()
    newMappingData.append('experiment_id', this.experiment_id)
    newMappingData.append('delinkedParticipants', JSON.stringify(this.linkedParticipants))
    $.ajax({
      url: this.domain + 'api/v1/mapping/delinkFromExp',
      type: 'POST',
      data: newMappingData,
      processData: false, // important
      contentType: false, // important
      dataType: 'json',
      xhrFields: {
			  withCredentials: true
      },
      success: _.bind(function (res) {
        // console.log(res);
        if (res.err == 0) {
          console.log(res)
          this.render()
          this.mapping.unmappedTableRender()
        } else {
          //	console.log($('#delinkErr'));
          $('#delinkErr').tooltip('enable')
          $('#delinkErr').tooltip('show')
          setTimeout(function () { $('#delinkErr').tooltip('hide') }, 3000)
          $('#delinkErr').tooltip('disable')
        }
      }, this)
    })
  },
  needMapParentsPropagate (e) {
    this.needMapParents = e
    console.log(this.needMapParents)
    /// there is a zombie view
  },
  onClose: function () {			/// off eventbus when new view call refer and its onClose calls in its prototype to prevent zombie view above
    eventsBus.off('needMapParents')
    eventsBus.off('DeLink')
    eventsBus.off('Link')
  }

})
export default selectedExperiment
