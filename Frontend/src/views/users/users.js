import $ from 'jquery'
import _ from 'underscore'
import Backbone from 'backbone'
import eventsBus from '../../eventsBus'
import UsersTemplate from '../../templates/users/UsersTemplate.pug'
import AlertTemplate from '../../templates/users/AlertTemplate.pug'
import UsersCollection from '../../collections/users/users_overview'

var users = Backbone.View.extend({
  events: {
    'change .changeUserStatus': 'changeUserStatus',
    'click #add_New_User': 'add_New_User',
    'change .changeUserPermission': 'changeUserPermission',
    'click .changeUserPermission': 'getCurrentPermission',
    'click #changeUserPermissionSubmit': 'changeUserPermissionRequest',
    'click .user_edit': 'edit_User_Dialog',
    'click #edit_User': 'edit_User'
  },
  initialize (setting) {
    this.domain = setting.domain
    this.user_id = setting.user_id
    this.users = setting.users
    this.admin = setting.admin

    this.$el.html(UsersTemplate({
      admin: this.admin
    }))
    this.usersCollection = new UsersCollection({
      domain: this.domain
    })
  },
  render () {
    $.fn.dataTable.ext.order['dom-select'] = function (settings, col) {
      return this.api().column(col, { order: 'index' }).nodes().map(function (td, i) {
        return $('select', td).val()
      })
    }

    this.usersCollection.fetch({
      xhrFields: {
        withCredentials: true // override ajax to send with credential
      },
      success: (_.bind(function (res) {
        console.log($('#usersTable'))
        this.usersTable = $('#usersTable').DataTable({
          language: {
            searchPlaceholder: 'Search User'
          },
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
                if (typeof (full.Groups) === 'string') {
                  const Group = full.Groups.replace(/null|[\[\]"]+/g, '')
                  if (Group === 'SAIP_Admin') {
                    return '<select id = \'selector_' + full.id + '\' class=\'changeUserPermission\' user_id=' + full.id + ' ><option value=\'7\' selected>SAIP_Admin</option><option value=\'8\'>User</option></select>'
                  } else if (Group === 'User') {
                    return '<select id = \'selector_' + full.id + '\' class=\'changeUserPermission\' user_id=' + full.id + ' ><option value=\'7\'>SAIP_Admin</option><option value=\'8\' selected>User</option></select>'
                  }
                } else {
                  return full.Groups
                }
              }, this),
              orderDataType: 'dom-select'
            },
            {
              orderable: false,
              targets: -2,
              render: _.bind(function (data, type, full, meta) {
                if (full.active === 1) { return '<select class=\'changeUserStatus\' id=' + full.id + ' ><option value=\'1\' selected>Active</option><option value=\'0\'>Inactive</option></select>' } else { { return '<select class=\'changeUserStatus\' id=' + full.id + '><option value=\'1\'>Active</option><option value=\'0\' selected>Inactive</option></select>' } }
              }, this)
            }, {
              orderable: false,
              targets: -1,
              render: _.bind(function (data, type, full, meta) {
                // console.log(full)
                const phoneOffice = full.phone_office || null
                const position = full.position || null
                const email = full.email || null
                const lastName = full.last_name || null
                const firstName = full.first_name || null
                const status = full.status || null

                if (full.id !== this.user_id) {
                  // console.log(phone_office)
                  return '<a last_name=' + lastName + ' first_name=' + firstName + ' email=' + email + ' phone_office=' + phoneOffice + ' position=' + position + ' status=' + status + ' userID=' + full.userID + ' is_pi=' + full.is_pi + ' user_id=' + full.id + ' class=\'fa fa-edit user_edit\' style=\'cursor:pointer\'></a>'
                } else {
                  return ''
                }
              }, this)
            }
          ],
          buttons: [
            {
              className: ' btn btn-primary',
              text: 'Add New User',
              action: _.bind(function () {
                $('#addNewUser').show()
                $('.close').on('click', function () {
                  $('#addNewUser').hide()
                })
                $('.cancel').on('click', function () {
                  $('#addNewUser').hide()
                })
              }, this)
            }
          ],
          columnDefs: [
            { targets: [-1], searchable: false }
          ],
          destroy: true,
          lengthMenu: [[-1], ['ALL']],
          scrollY: '80vh',
          scrollCollapse: true,
          dom: '<"datatable_addUser_buttons col-md-6"B><"datatable_search_users col-md-6"f>rt'
        })
      }, this))
    })

    return this
  },
  changeUserStatus (e) {
    const newUserStatus = new FormData()
    const status = e.currentTarget[e.currentTarget.selectedIndex].value

    newUserStatus.append('user_id', e.currentTarget.id)
    newUserStatus.append('user_status', status)

    $.ajax({
      url: this.domain + 'api/v1/user_status',
      type: 'POST',
      data: newUserStatus,
      processData: false, // important
      contentType: false, // important
      dataType: 'json',
      xhrFields: {
        withCredentials: true
      },
      success: _.bind(function (res) {
        console.log(res.errors)
      })
    })
  },
  getCurrentPermission (e) {
    this.currentPermission = $('#' + e.currentTarget.id + ' option:selected').text()
    console.log(this.currentPermission)
  },
  changeUserPermission (e) {
    this.newUserPermission = new FormData()
    const groupId = e.currentTarget[e.currentTarget.selectedIndex].value

    this.selectedUser_id = $(e.currentTarget).attr('user_id')
    const selectUser = this.users.models.filter(x => x.id === this.selectedUser_id)
    const selectUserName = selectUser[0].get('last_name') + ',' + selectUser[0].get('first_name')

    this.newUserPermission.append('user_id', this.selectedUser_id)
    this.newUserPermission.append('group_id', groupId)
    //  console.log("#"+e.currentTarget.id+" option:selected")
    $('#changeUserPermissionAlert').html(AlertTemplate({
      selectUserName: selectUserName,
      previousPermission: this.currentPermission,
      newPermission: $('#' + e.currentTarget.id + ' option:selected').text()
    }))
    $('#changeUserPermissionAlert').show()
    $('.close').on('click', _.bind(function () {
      this.render()
      $('#changeUserPermissionAlert').hide()
    }, this))
    $('.cancel').on('click', _.bind(function () {
      this.render()
      $('#changeUserPermissionAlert').hide()
    }, this))

    // $.ajax({
    //  url:this.domain+"api/v1/usersChangePermission",
    //  type:"POST",
    //  data:newUserPermission,
    //  processData: false, // important
    //  contentType: false, // important
    //  dataType : 'json',
    //  xhrFields: {
    //    withCredentials: true
    //  },
    //     success:_.bind(function(res){
    //          console.log(res.errors)
    //     })
    // });
  },
  changeUserPermissionRequest () {
    $.ajax({
      url: this.domain + 'api/v1/usersChangePermission',
      type: 'POST',
      data: this.newUserPermission,
      processData: false, // important
      contentType: false, // important
      dataType: 'json',
      xhrFields: {
        withCredentials: true
      },
      success: _.bind(function (res) {
        $('#changeUserPermissionAlert').hide()
        if (this.user_id === this.selectedUser_id) {
          location.reload()
        } else {
          this.render()
        }
      }, this)
    })
  },
  add_New_User () {
    console.log($('#newUser_firstName').val())
    console.log($('#newUser_lastName').val())
    console.log($('#newUser_userID').val())
    console.log($('#newUser_status').val())
    console.log($('#newUser_pi').val())
    console.log($('#newUser_group').val())
    console.log($('#newUser_position').val())
    console.log($('#newUser_phone_office').val())
    console.log($('#newUser_email').val())

    var newUserData = new FormData()

    newUserData.append('first_name', $('#newUser_firstName').val())
    newUserData.append('last_name', $('#newUser_lastName').val())
    newUserData.append('userID', $('#newUser_userID').val())
    newUserData.append('status', $('#newUser_status').val())

    newUserData.append('is_pi', $('#newUser_pi').val())
    newUserData.append('group', $('#newUser_group').val())
    newUserData.append('position', $('#newUser_position').val())
    newUserData.append('phone_office', $('#newUser_phone_office').val())
    newUserData.append('email', $('#newUser_email').val())

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
        console.log(res)
        if (!res.err) {
          $('#addNewUser').hide()
          eventsBus.trigger('addNewUserEvent')
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
      })
    })
  },
  edit_User_Dialog (e) {
    // window.test = $(e.currentTarget).attr('phone_office');
    this.currentEdit_user_id = $(e.currentTarget).attr('user_id')
    $('#EditUser').show()
    $('#editUser_lastName').val($(e.currentTarget).attr('last_name'))
    this.currentEdit_lastName = $(e.currentTarget).attr('last_name')

    $('#editUser_firstName').val($(e.currentTarget).attr('first_name'))
    this.currentEdit_firstName = $(e.currentTarget).attr('first_name')

    $('#editUser_userID').val($(e.currentTarget).attr('userID'))
    this.currentEdit_userID = $(e.currentTarget).attr('userID')

    $('#editUser_status').val($(e.currentTarget).attr('status'))
    this.currentEdit_status = $(e.currentTarget).attr('status')

    $('#editUser_pi').val($(e.currentTarget).attr('is_pi'))
    this.currentEdit_pi = $(e.currentTarget).attr('is_pi')

    if ($(e.currentTarget).attr('position') !== 'null') {
      $('#editUser_position').val($(e.currentTarget).attr('position'))
    } else {
      $('#editUser_position').val('')
    }
    if ($(e.currentTarget).attr('phone_office') !== 'null') {
      $('#editUser_phone_office').val($(e.currentTarget).attr('phone_office'))
    } else {
      $('#editUser_phone_office').val('')
    }
    if ($(e.currentTarget).attr('email') !== 'null') {
      $('#editUser_email').val($(e.currentTarget).attr('email'))
    } else {
      $('#editUser_email').val('')
    }

    $('.close').on('click', function () {
      $('#EditUser').hide()
    })
    $('.cancel').on('click', function () {
      $('#EditUser').hide()
    })
  },
  edit_User () {
    var editUserData = new FormData()

    editUserData.append('user_id', this.currentEdit_user_id)
    editUserData.append('first_name', $('#editUser_firstName').val())
    editUserData.append('last_name', $('#editUser_lastName').val())
    editUserData.append('userID', $('#editUser_userID').val())
    editUserData.append('status', $('#editUser_status').val())

    editUserData.append('is_pi', $('#editUser_pi').val())
    editUserData.append('email', $('#editUser_email').val())
    editUserData.append('position', $('#editUser_position').val())
    editUserData.append('phone_office', $('#editUser_phone_office').val())

    $.ajax({
      url: this.domain + 'api/v1/user_edit',
      type: 'PUT',
      data: editUserData,
      processData: false, // important
      contentType: false, // important
      dataType: 'json',
      xhrFields: {
        withCredentials: true
      },
      success: _.bind(function (res) {
        console.log(res)
        if (!res.err) {
          $('#addNewUser').hide()
          eventsBus.trigger('addNewUserEvent')
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
      })
    })
  }
})

export default users
