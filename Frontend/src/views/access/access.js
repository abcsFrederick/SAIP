import $ from 'jquery'
import _ from 'underscore'
import Backbone from 'backbone'
import eventsBus from '../../eventsBus'
import accessTemplate from '../../templates/access/accessTemplate.pug'
import AccessRequestsCollection from '../../collections/users/accessRequests_overview'
var access = Backbone.View.extend({
  events: {
    'click .decision': 'changeAccess',
    'click #add_New_User_access': 'add_New_User'
  },
  initialize (setting) {
    this.domain = setting.domain
    this.user_id = setting.user_id
    this.users = setting.users
    this.admin = setting.admin
    this.$el.html(accessTemplate({
      admin: this.admin
    }))
    this.accessRequestsCollection = new AccessRequestsCollection({
      domain: this.domain
    })
    this.render()
  },
  render () {
    this.accessRequestsCollection.fetch({
      xhrFields: {
        withCredentials: true // override ajax to send with credential
      },
      success: (_.bind(function (res) {
        this.accessRequestTable = $('#access_request_body').DataTable({
          data: res.toJSON(),
          columns: [
            {
              targets: 0,
              render: _.bind(function (data, type, full, meta) {
                return full.last_name + ',' + full.first_name
              }, this)
            },
            {
              targets: 1,
              render: _.bind(function (data, type, full, meta) {
                return full.userID
              }, this)
            },
            {
              targets: 2,
              render: _.bind(function (data, type, full, meta) {
                return full.phone_office
              }, this)
            },
            {
              targets: 3,
              render: _.bind(function (data, type, full, meta) {
                return full.email
              }, this)
            },
            {
              targets: 4,
              render: _.bind(function (data, type, full, meta) {
                return full.nedID
              }, this)
            },
            {
              targets: 5,
              render: _.bind(function (data, type, full, meta) {
                return full.status
              }, this)
            },
            {
              targets: 6,
              render: _.bind(function (data, type, full, meta) {
                // console.log(full.status)
                if (full.status == 'approval') {
                  // console.log('approval')
                  return '<a> </a>'
                } else if (full.status == 'denied') {
                  return '<a email = ' + full.email + ' phone_office = ' + full.phone_office + ' userID = ' + full.userID + ' lastName = ' + full.first_name + ' firstName =' + full.last_name + ' decisionId = 1 requestId =' + full.id + ' class="fa icon-ok-circled decision" style="color:green; cursor:pointer"></a>'
                } else {
                  return '<a email = ' + full.email + ' phone_office = ' + full.phone_office + ' userID = ' + full.userID + ' lastName = ' + full.first_name + ' firstName =' + full.last_name + ' decisionId = 1 requestId =' + full.id + ' class="fa icon-ok-circled decision" style="color:green; cursor:pointer"></a><a decisionId = 0 requestId =' + full.id + ' class="fa icon-cancel-circled decision" style="color:red; cursor:pointer"></a>'
                }
              }, this)
            }
          ],
          destroy: true,
          lengthMenu: [[-1], ['ALL']],
          scrollY: '50vh',
          scrollCollapse: true,
          dom: 'rt'
        })
      }, this))
    })
    return this
  },
  changeAccess: function (e) {
    this.decision = $(e.currentTarget).attr('decisionId')

    this.requestId = $(e.currentTarget).attr('requestId')

    if (!parseInt(this.decision)) {
      $.ajax({
        url: this.domain + 'api/v1/accessRequests',
        method: 'POST',
        data: {
          decision: this.decision, id: this.requestId
        },
        dataType: 'json',
        xhrFields: {
          withCredentials: true
        },
        success: _.bind(function (res) {
          this.render()
        }, this)
      })
    } else {
      const firstName = $(e.currentTarget).attr('firstName')
      const lastName = $(e.currentTarget).attr('lastName')
      const userID = $(e.currentTarget).attr('userID')

      const email = $(e.currentTarget).attr('email')
      const phone_office = $(e.currentTarget).attr('phone_office')

      $('#newUser_firstName_access').val(firstName)
      $('#newUser_lastName_access').val(lastName)
      $('#newUser_userID_access').val(userID)

      $('#newUser_phone_office_access').val(phone_office)
      $('#newUser_email_access').val(email)

      $('#addNewUser_access').show()
      $('.close').on('click', function () {
        $('#addNewUser_access').hide()
      })
      $('.cancel').on('click', function () {
        $('#addNewUser_access').hide()
      })
    }
  },
  add_New_User () {
    var newUserData = new FormData()

    newUserData.append('first_name', $('#newUser_firstName_access').val())
    newUserData.append('last_name', $('#newUser_lastName_access').val())
    newUserData.append('userID', $('#newUser_userID_access').val())
    newUserData.append('status', $('#newUser_status_access').val())

    newUserData.append('is_pi', $('#newUser_pi_access').val())
    newUserData.append('group', $('#newUser_group_access').val())
    newUserData.append('position', $('#newUser_position_access').val())
    newUserData.append('phone_office', $('#newUser_phone_office_access').val())
    newUserData.append('email', $('#newUser_email_access').val())

    $.ajax({
      url: this.domain + 'api/v1/whitelist',
      type: 'POST',
      data: newUserData,
      processData: false, // important
      contentType: false, // important
      dataType: 'json',
      xhrFields: {
        withCredentials: true
      },
      success: _.bind(function (res) {
        if (!res.err) {
          $.ajax({
            url: this.domain + 'api/v1/accessRequests',
            method: 'POST',
            data: {
              decision: this.decision, id: this.requestId
            },
            dataType: 'json',
            xhrFields: {
              withCredentials: true
            },
            success: _.bind(function (res) {
              this.render()
            }, this)
          })
          $('#addNewUser').hide()
          eventsBus.trigger('addNewUserEvent_access')
          $('.alert-success').empty()
          $('.alert-success').html(res.msg)
          $('.alert-success').fadeTo('slow', 0.8).delay(3000).slideUp(500)
        } else {
          $('.alert-danger').empty()
          if (typeof (res.errors) === 'object') {
            for (let a = 0; a < res.errors.length; a++) {
              $('.alert-danger').append('<li>' + res.errors[a].msg + '</li>')
            }
          } else if (typeof (res.errors) === 'string') {
            $('.alert-danger').append('<li>' + res.errors + '</li>')
          }

          $('.alert-danger').fadeTo('slow', 0.8).delay(3000).slideUp(500)
        }
      }, this)
    })
  }
})

export default access
