import $ from 'jquery';
import _ from 'underscore';
import Backbone from 'backbone';
import eventsBus from '../../eventsBus';
import GroupsTemplate from '../../templates/groups/GroupsTemplate.pug';
import AlertTemplate from '../../templates/users/AlertTemplate.pug';
import GroupsCollection from '../../collections/groups/groups_overview';

var groups = Backbone.View.extend({
  events: {
    'click #add_New_Group': 'add_New_Group',
    'click .group_edit': 'edit_Group_Dialog',
    'click #edit_Group': 'edit_Group'
  },
  initialize (setting) {
    this.domain = setting.domain;
    this.users = setting.users;
    this.admin = setting.admin;

    this.$el.html(GroupsTemplate({
      admin: this.admin,
      users: this.users.toJSON()
    }));
    this.groupsCollection = new GroupsCollection({
      domain: this.domain
    });
    this.render();
  },
  render () {
    $.fn.dataTable.ext.order['dom-select'] = function (settings, col) {
      return this.api().column(col, { order: 'index' }).nodes().map(function (td, i) {
        return $('select', td).val()
      })
    }

    this.groupsCollection.fetch({
      xhrFields: {
        withCredentials: true // override ajax to send with credential
      },
      success: (_.bind(function (res) {
        this.groupsTable = $('#groupsTable').DataTable({
          language: {
            searchPlaceholder: 'Search Group'
          },
          data: res.toJSON(),
          columns: [
            {
              targets: 0,
              render: _.bind(function (data, type, full, meta) {
                return full.name;
              }, this)
            },
            {
              targets: 1,
              render: _.bind(function (data, type, full, meta) {
                return full.number_of_admin;
              }, this),
              orderDataType: 'dom-select'
            },
            {
              orderable: false,
              targets: -2,
              render: _.bind(function (data, type, full, meta) {
                return full.number_of_users
                ;
              }, this)
            }, {
              orderable: false,
              targets: -1,
              render: _.bind(function (data, type, full, meta) {
                return '<a name=' + full.name + ' group_id=' + full.id + ' class=\'fa fa-edit group_edit\' style=\'cursor:pointer\'></a>'
              }, this)
            }
          ],
          buttons: [
            {
              className: ' btn btn-primary',
              text: 'Add New Group',
              action: _.bind(function () {
                $('#addNewGroup').show();
                $('.close').on('click', function () {
                  $('#addNewGroup').hide();
                })
                $('.cancel').on('click', function () {
                  $('#addNewGroup').hide();
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
          dom: '<"datatable_addGroup_buttons col-md-6"B><"datatable_search_group col-md-6"f>rt'
        })
      }, this))
    })

    return this
  },
  changeGroupStatus (e) {
    const newGroupStatus = new FormData()
    const status = e.currentTarget[e.currentTarget.selectedIndex].value

    newGroupStatus.append('group_id', e.currentTarget.id)
    newGroupStatus.append('group_status', status)

    $.ajax({
      url: this.domain + 'api/v1/group_status',
      type: 'POST',
      data: newGroupStatus,
      processData: false, // important
      contentType: false, // important
      dataType: 'json',
      xhrFields: {
        withCredentials: true
      },
      success: _.bind(function (res) {
        return this;
      })
    })
  },
  getCurrentPermission (e) {
    this.currentPermission = $('#' + e.currentTarget.id + ' option:selected').text();
  },
  changeGroupPermission (e) {
    this.newUserPermission = new FormData()
    const groupId = e.currentTarget[e.currentTarget.selectedIndex].value

    this.selectedUser_id = $(e.currentTarget).attr('user_id')
    const selectUser = this.users.models.filter(x => x.id == this.selectedUser_id)
    window.models = this.users.models
    window.selectedUser_id = this.selectedUser_id


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
  add_New_Group () {
    var newGroupData = new FormData()

    newGroupData.append('name', $('#newGroup_Name').val());
    newGroupData.append('admin', $('#admin_id').val());

    $.ajax({
      url: this.domain + 'api/v1/group',
      type: 'POST',
      data: newGroupData,
      processData: false, // important
      contentType: false, // important
      dataType: 'json',
      xhrFields: {
        withCredentials: true
      },
      success: _.bind(function (res) {
        if (!res.err) {
          $('#addNewGroup').hide();
          eventsBus.trigger('addNewGroupEvent');
          $('.alert-success').empty();
          $('.alert-success').html(res.msg);
          $('.alert-success').fadeTo('slow', 0.8).delay(3000).slideUp(500);
        } else {
          $('.alert-danger').empty();
          if (typeof (res.errors) === 'object') {
            for (let a = 0; a < res.errors.length; a++) {
              $('.alert-danger').append('<li>' + res.errors[a].msg + '</li>');
            }
          } else if (typeof (res.errors) === 'string') {
            $('.alert-danger').append('<li>' + res.errors + '</li>');
          }
          $('.alert-danger').fadeTo('slow', 0.8).delay(3000).slideUp(500);
        }
      })
    })
  },
  edit_Group_Dialog (e) {
    this.currentEdit_group_id = $(e.currentTarget).attr('group_id');
    $('#EditGroup').show();
    $('#editGroup_Name').val($(e.currentTarget).attr('name'));
    this.currentEdit_Name = $(e.currentTarget).attr('name');


    $('.close').on('click', function () {
      $('#EditGroup').hide();
    })
    $('.cancel').on('click', function () {
      $('#EditGroup').hide();
    })
  },
  edit_Group () {
    var editGroupData = new FormData()
    editGroupData.append('group_id', this.currentEdit_group_id)
    editGroupData.append('name', $('#editGroup_Name').val())

    $.ajax({
      url: this.domain + 'api/v1/group_edit',
      type: 'PUT',
      data: editGroupData,
      processData: false, // important
      contentType: false, // important
      dataType: 'json',
      xhrFields: {
        withCredentials: true
      },
      success: _.bind(function (res) {
        if (!res.err) {
          $('#EditGroup').hide();
          eventsBus.trigger('addNewGroupEvent');
          $('.alert-success').empty();
          $('.alert-success').html(res.msg);
          $('.alert-success').fadeTo('slow', 0.8).delay(3000).slideUp(500);
        } else {
          $('.alert-danger').empty();
          if (typeof (res.errors) === 'object') {
            for (let a = 0; a < res.errors.length; a++) {
              $('.alert-danger').append('<li>' + res.errors[a].msg + '</li>');
            }
          } else if (typeof (res.errors) === 'string') {
            $('.alert-danger').append('<li>' + res.errors + '</li>');
          }
          $('.alert-danger').fadeTo('slow', 0.8).delay(3000).slideUp(500);
        }
      })
    })
  }
})

export default groups
