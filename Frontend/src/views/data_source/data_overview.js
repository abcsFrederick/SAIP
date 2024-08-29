import $ from 'jquery'
import _ from 'underscore'
import 'datatables.net'
// import DataTable from 'datatables.net-dt';

import 'datatables.net-select'
import 'datatables.net-buttons'
import 'datatables.net-rowgroup'
import Data_source_overview_collection from '../../collections/data_source/data_source_overview_collection'
import View from '../View'

import Data_overview_templates from '../../templates/data_source/data_overview.pug'

import '../../stylesheets/data_source/data_overview.styl'

var data = View.extend({
  events: {
    'click .permission': 'grantPermission',
    'click #update_permission': 'update_permission'
  },
  initialize (setting) {
    this.permission = setting.permission
    this.LoginAdminUser = setting.LoginAdminUser
    this.domain = setting.domain
    this.domain_ws = setting.domain_ws
    this.user_id = setting.user_id
    this.users = setting.users
    this.probes = setting.probes
    this.mappingAttrReserve = setting.mappingAttrReserve
    this.protocols = setting.protocols

    this.data_source_overview_collection = new Data_source_overview_collection({
      domain: this.domain
    })
    this.PI = []

    this.users_and_permissions = []
    this.selectedUserIdAll = []

    if (this.permission > 0) {
      _.each(this.users.toJSON(), _.bind(function (row) {
        if (row.is_pi) {
          this.PI.push(row);
        }
      }, this))
    }
    this.render()
  },
  render () {
    this.data_source_overview_collection.fetch({
      data: $.param(this.user_id),
      xhrFields: {
        withCredentials: true							// override ajax to send with credential
      },
      success: (_.bind(function (res) {
        console.log(this.permission)
        this.$el.html(Data_overview_templates({
            permission: this.permission
        }))
        console.log(res)
        this.data_overview_table = $('#data_overview').DataTable({
            language: {
                searchPlaceholder: 'Data name'
            },
            data: res.toJSON(),
            rowGroup: {
                dataSrc: 'source_group_name'
            },
            columns: [{
                orderable: false,
                targets: 0,
                render: _.bind(function (data, type, full, meta) {
                    return `<input type='checkbox'/>`
                }, this)
            }, {
                data: 'source_name'
            }, {
                data: 'source_group_name'
            }, {
                orderable: false,
                targets: -1,
                render: _.bind(function (data, type, full, meta) {
                    if (full.is_admin) {
                        return `<a class='fa fa-edit permission' style='cursor:pointer' source_group_name=${full.source_group_name} source_group_id=${full.source_group_id} source_id=${full.source_id} source_name=${full.source_name} source_path=${full.source_path} source_type=${full.source_type} /a>
                        <a class='fa fa-download dataDownloadProgress' style='cursor:pointer' location=${full.source_path} /a>`
                    } else {
                        return `<a class='fa fa-download dataDownloadProgress' style='cursor:pointer' location=${full.source_path} /a>`;
                    }
                }, this)
            }],
            dom: '<"datatable_search_data col-md-12"f>rt<"datatable_Information col-md-12"i>'
        });


        $('.dataDownloadProgress').on('click', _.bind(function (e) {
            const requestPath = '/Users/miaot2/test.txt' //$(e.currentTarget).attr('location');
            const progressIcon = $(e.target).next('.fa-spinner').next('.progress');
            const downloadIcon = $(e.target);
            const spinnerIcon = $(e.target).next('.fa-spinner');
            var xhr = new XMLHttpRequest();
            // Just regular file for now,
            // websocket can be added to download and pack the folder and multiple files
            xhr.open('GET', this.domain + 'api/v1/downloadData?absolutePath=' + requestPath);

            xhr.responseType = 'blob';
            xhr.withCredentials = true;

            xhr.onprogress = function (e) {
                if (e.lengthComputable) {
                    progressIcon.prop('max', e.total);
                    progressIcon.prop('value', e.loaded);
                }
            }
            xhr.onload = function (e) {
                var blob = xhr.response;
                var fileName = xhr.getResponseHeader('Content-Disposition').match(/\sfilename="([^"]+)"/)[1];
                saveBlob(blob, fileName);
            }
            xhr.onloadstart = function (e) {
                progressIcon.prop('value', 0);
                progressIcon.show('slow');
                spinnerIcon.hide('slow');
                // $('#stuDownloadProgressDisplay_' + stu_id).html('Study: <label>' + stu_name + '</label> is downloading');
            }
            xhr.onloadend = function (e) {
                // $('#stuDownloadProgressDisplay_' + stu_id).remove().slideUp(500);
                progressIcon.hide('slow');
                downloadIcon.show('slow');
            }
            xhr.send()
            function saveBlob (blob, fileName) {
                var a = document.createElement('a');
                a.href = window.URL.createObjectURL(blob);
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                window.setTimeout(function () {
                    URL.revokeObjectURL(blob);
                    document.body.removeChild(a);
                }, 0)
            }
        }, this))
      }, this))
    });
    return this;
  },
  grantPermission (e) {
    this.source_name = this.$(e.currentTarget).attr('source_name');
    this.source_path = this.$(e.currentTarget).attr('source_path');
    this.source_id = this.$(e.currentTarget).attr('source_id');
    this.source_group_id = this.$(e.currentTarget).attr('source_group_id');
    this.source_group_name = this.$(e.currentTarget).attr('source_group_name');

    this.accessUserLists = [];
    $('#data_name').text($(e.currentTarget).attr('source_name'));
    this.$('#grantPermission').show();

    if (this.usersTable) {
        this.usersTable.destroy();
    }
    this.usersTable = this.$('#usersTable').DataTable({
        rowId: 'id',
        data: this.users.toJSON(),
        columns: [{
            targets: 0,
            render: _.bind(function (data, type, full, meta) {
            return full.last_name + ',' + full.first_name
            }, this)
        }, {
            data: 'user_groups'
        }],
        dom: '<"datatable_search_user col-md-12"f>rt'
    });
    this.$('#usersTable tbody').off();
    this.$('#usersTable tbody').on('click', 'tr', _.bind(function (e) {
        if ($(e.currentTarget).hasClass('selected')) {
            $(e.currentTarget).removeClass('selected');
            this.accessUserLists.splice(this.accessUserLists.indexOf(e.currentTarget.id), 1);
        } else {
            this.accessUserLists.push(e.currentTarget.id);
            $(e.currentTarget).addClass('selected');
        }
    }, this));
    this.$('.close').on('click', _.bind(function () {
            this.$('#grantPermission').hide()
    }, this))
    this.$('.cancel').on('click', _.bind(function () {
        this.$('#grantPermission').hide()
    }, this))
  },
  update_permission: function () {
    var newUserData = new FormData()
    newUserData.append('source_id', this.source_id)
    newUserData.append('source_name', this.source_name)
    newUserData.append('source_path', this.source_path)
    newUserData.append('source_group_id', this.source_group_id)
    newUserData.append('source_group_name', this.source_group_name)
    newUserData.append('access_user_lists', this.accessUserLists)

    $.ajax({
        url: this.domain + 'api/v1/data_source/permission',
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
            $('#grantPermission').hide();
            $('.alert-success').empty();
            $('.alert-success').html(res.msg);
            $('.alert-success').fadeTo('slow', 0.8).delay(5000).slideUp(500);
        } else {
            $('.alert-danger').empty();
            $('.alert-danger').html(res.validate_errors);
            $('.alert-danger').fadeTo('slow', 0.8).delay(5000).slideUp(500);
        }
        })
    })
  }
})

export default data
