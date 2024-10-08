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
    'click #update_permission': 'update_permission',
    'click .dataDownloadProgress': 'downloadSelected',
    'click #permissionSelected': 'permissionSelected',
    'click .group-breadcrumb li a': 'nav_folder'
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
    this.groups = setting.groups
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
        this.$el.html(Data_overview_templates({
            permission: this.permission
        }))
        this.data_overview_table = $('#data_overview').DataTable({
            language: {
                searchPlaceholder: 'Data name'
            },
            data: res.toJSON(),
            rowGroup: {
                dataSrc: 'source_group_name',
                startRender: _.bind(function(rows, group) {
                    if (!this.current_breadcrumb) {
                        return $('<ul class="group-breadcrumb '+ group +'_breadcrumb">').append( '<li>' + group + '</li>' )
                    } else {
                        let ulDom =$('<ul class="group-breadcrumb '+ group +'_breadcrumb">');
                        for (let a = 0; a < this.current_breadcrumb.length - 1; a++) {
                            ulDom.append(`<li><a source_id=${this.current_breadcrumb[a]['source_id']} source_type=${this.current_breadcrumb[a]['source_type']}  source_name=${this.current_breadcrumb[a]['source_name']}
                                is_admin=${this.current_breadcrumb[a]['is_admin']} source_group_id=${this.current_breadcrumb[a]['source_group_id']} 
                                source_group_name=${this.current_breadcrumb[a]['source_group_name']}>${this.current_breadcrumb[a]['source_name']}</a></li>`);
                        }
                        ulDom.append(`<li>${this.current_breadcrumb[this.current_breadcrumb.length-1]['source_name']}</li>`);
                        return ulDom;
                    }
                }, this)
            },
            createdRow: function (row, data, dataIndex) {
                $(row).attr('source_group_name', data.source_group_name);
                $(row).attr('source_id', data.source_id);
                $(row).attr('source_name', data.source_name);
                $(row).attr('source_group_id', data.source_group_id);
                $(row).attr('is_admin', data.is_admin);
                $(row).attr('source_type', data.source_type);
            },
            rowCallback: function (row, data) {
                $('td:eq(0)', row).css({'cursor':'pointer', 'background-color':'#F0FFF0'});
            },
            select: {
                style: 'os',
                selector: 'td:first-child',
            },        
            columns: [{
                orderable: false,
                targets: 0,
                render: _.bind(function (data, type, full, meta) {
                    return `<a class='fa fa-${full.source_type}' />`
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
                        return `<a class='fa fa-edit permission' style='cursor:pointer' source_group_name=${full.source_group_name} source_group_id=${full.source_group_id} source_id=${full.source_id} source_name='${full.source_name}' source_path='${full.source_path}' source_type=${full.source_type} /a>
                        <a class='fa fa-download dataDownloadProgress' style='cursor:pointer' location='${full.source_path}' /a>
                        <a class='fa fa-spinner.fa-spin' style='display:none;'></a>
                        <progress class='progress' value='0' style='display: none; margin-right: 5px; width: 16px; font-size: 5px; height: 5px; margin-bottom: 0px'></progress>`;
                    } else {
                        return `<a class='fa fa-download dataDownloadProgress' style='cursor:pointer' location='${full.source_path}' /a>
                        <a class='fa fa-spinner fa-spin' style='display:none;'></a>
                        <progress class='progress' value='0' style='display: none; margin-right: 5px; width: 16px; font-size: 5px; height: 5px; margin-bottom: 0px'></progress>`;
                    }
                }, this)
            }],
            buttons: [
                {
                  className: ' btn btn-primary',
                  text: 'Refresh archive',
                  action: _.bind(function () {
                    var updataGroupDB = new FormData();
                    updataGroupDB.append('group_id', this.groups[0]['id']);

                    $.ajax({
                        url: this.domain + 'api/v1/group/refresh',
                        type: 'POST',
                        data: updataGroupDB,
                        processData: false, // important
                        contentType: false, // important
                        dataType: 'json',
                        xhrFields: {
                            withCredentials: true
                        },
                        success: _.bind(function (res) {
                            if (!res.err) {
                                $('#EditGroup').hide();
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
                        }, this)
                    });
                  }, this)
                }
            ],
            destroy: true,
            lengthMenu: [[-1], ['ALL']],
            scrollY: '80vh',
            scroller: true,
            scrollCollapse: true,
            dom: '<"datatable_refresh_buttons col-md-6"B><"datatable_search_data col-md-6"f>rt<"datatable_Information col-md-12"i>'
        });

        if (this.permission !== 1) {
            $('.datatable_refresh_buttons').hide();
        }


        $('#data_overview tbody').on('click', 'tr', _.bind(function (e) {
            // window.tst=$(e.target);
            if (!$(e.target).hasClass('permission') && !$(e.target).hasClass('dataDownloadProgress') && !$(e.target).hasClass('sorting_1') && !$(e.target).hasClass('fa-folder')) {
                if ($(e.currentTarget).attr('source_type') !== 'folder') {
                    return this;
                }

                let params = {
                    'source_id': $(e.currentTarget).attr('source_id'),
                    'source_group_id': $(e.currentTarget).attr('source_group_id'),
                    'source_group_name': $(e.currentTarget).attr('source_group_name'),
                    'is_admin': $(e.currentTarget).attr('is_admin')
                }
                this.get_children(params, e, true);
            }
          }, this))
      }, this))
    });
    return this;
  },
  nav_folder(e) {console.log($(e.currentTarget))
    if ($(e.currentTarget).attr('source_type') === 'top') {
        this.render();
        this.current_breadcrumb = undefined
        return this;
    }
    let indexStartToRemove = this.current_breadcrumb.findIndex(folder => folder.source_group_id === $(e.currentTarget).attr('source_group_id') && folder.source_id === $(e.currentTarget).attr('source_id'));

    this.current_breadcrumb.splice(indexStartToRemove + 1);
    let params = {
        'source_id': $(e.currentTarget).attr('source_id'),
        'source_group_id': $(e.currentTarget).attr('source_group_id'),
        'source_group_name': $(e.currentTarget).attr('source_group_name'),
        'is_admin': $(e.currentTarget).attr('is_admin')
    }
    this.get_children(params, e, false);
  },
  get_children(params, e, onRowClick) {
    $.ajax({
        url: this.domain + 'api/v1/data_source_children',
        type: 'GET',
        data: params,
        xhrFields: {
            withCredentials: true
        },
        success: _.bind(function (res) {
            if (onRowClick) {
                let source_path = e.currentTarget.id;
                if (!this.current_breadcrumb) {
                    let top = {
                        'source_type': 'top',
                        'source_name': $(e.currentTarget).attr('source_group_name'),
                        'source_group_id': $(e.currentTarget).attr('source_group_id'),
                        'source_group_name': $(e.currentTarget).attr('source_group_name'),
                        'is_admin': $(e.currentTarget).attr('is_admin'),
                    }
                    this.current_breadcrumb = [top];
                }
                let next = {
                    'source_id': $(e.currentTarget).attr('source_id'),
                    'source_name': $(e.currentTarget).attr('source_name'),
                    'source_group_id': $(e.currentTarget).attr('source_group_id'),
                    'source_group_name': $(e.currentTarget).attr('source_group_name'),
                    'is_admin': $(e.currentTarget).attr('is_admin'),
                }
                this.current_breadcrumb.push(next);
            }

            this.data_overview_table.clear().draw();
            this.data_overview_table.rows.add(res); // Add new data
            this.data_overview_table.columns.adjust().draw();

        }, this)
    });
  },
  grantPermission (e) {
    let source_name = this.$(e.currentTarget).attr('source_name'),
        source_path = this.$(e.currentTarget).attr('source_path'),
        source_id = this.$(e.currentTarget).attr('source_id'),
        source_group_id = this.$(e.currentTarget).attr('source_group_id'),
        source_group_name = this.$(e.currentTarget).attr('source_group_name');

    this.sourceList = [{
        'source_id': source_id,
        'source_name': source_name,
        'source_path': source_path,
        'source_group_id': source_group_id,
        'source_group_name': source_group_name
    }]
    this.renderPermissionDialog(source_name)
  },
  renderPermissionDialog(name) {
    this.accessUserLists = [];
    $('#data_name').text(name);
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
    newUserData.append('source_list', JSON.stringify(this.sourceList))
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
  },
  downloadSelected(e) {
    const progressIcon = $(e.target).next('.fa-spinner').next('.progress');
    const downloadIcon = $(e.target);
    const spinnerIcon = $(e.target).next('.fa-spinner');

    let rand_id = Math.floor(Math.random() * 100) + Date.now();
    // Single download
    if ($(e.target).attr('location')) {
        this.paths = [$(e.target).attr('location')]
    } else {
        this.paths = this.data_overview_table.rows( ".selected" ).data().toArray().map(x=>x.source_path);
    }
    if (!this.paths.length) {
        $('.alert-warning').empty();
        $('.alert-warning').html('Please select a data.');
        $('.alert-warning').fadeTo('slow', 0.8).delay(5000).slideUp(500);
        return this;
    }
    var ws = new WebSocket(this.domain_ws + 'api/v1/pre_download');
    ws.onopen = function () {
        console.log(ws.readyState)
        console.log('websocket is connected ...');
        spinnerIcon.show('slow');
        downloadIcon.hide('slow');
        $('.progressAlert').append(`<li id=${rand_id} class="filesDownloadProgressDisplay">Batch data are preparing</li>`);
        $('.progressAlert').fadeTo('slow', 0.8).delay(5000);
        console.log(ws.readyState)
    }

    ws.onmessage = function (ev) {
        if (JSON.parse(ev.data).err === 5) {
            ws.send(JSON.stringify(this.paths));
        }
        $(`#${rand_id}`).text(JSON.parse(ev.data).msg);
        if (JSON.parse(ev.data).err === 3) {
            const zipFileLocation = JSON.parse(ev.data).filePath
              var xhr = new XMLHttpRequest()
              xhr.open('GET', this.domain + 'api/v1/post_download?absolutePath=' + zipFileLocation)
              xhr.responseType = 'blob'
              xhr.withCredentials = true

              xhr.onprogress = function (e) {
                if (e.lengthComputable) {
                  progressIcon.prop('max', e.total)
                  progressIcon.prop('value', e.loaded)
                }
              }
              xhr.onload = function (e) {
                var blob = xhr.response
                var fileName = xhr.getResponseHeader('Content-Disposition').match(/\sfilename="([^"]+)"/)[1];
                saveBlob(blob, fileName)
              }
              xhr.onloadstart = function (e) {
                progressIcon.prop('value', 0)
                progressIcon.show('slow')
                spinnerIcon.hide('slow')
                // $('.progressAlert').empty();
                // $('.progressAlert').append('<li>Experiment is downloading</li>');
                // $('.progressAlert').fadeTo('slow', 0.8);
                $(`#${rand_id}`).html('Data is downloading')
                // $('#doNotRefreshAlert').show('slow');
                // downloadIcon.hide('slow');
              }
              xhr.onloadend = function (e) {
                // $('.progressAlert').empty();
                // $('.progressAlert').slideUp(500);
                $(`#${rand_id}`).remove().slideUp(500)
                progressIcon.hide('slow')
                downloadIcon.show('slow')
              }
              xhr.send()
              function saveBlob (blob, fileName) {
                var a = document.createElement('a')
                a.href = window.URL.createObjectURL(blob)
                a.download = fileName
                document.body.appendChild(a)
                a.click()
                window.setTimeout(function () {
                  URL.revokeObjectURL(blob)
                  document.body.removeChild(a)
                }, 0)
              }
        }
        if (JSON.parse(ev.data).err === 4) {
            $(`#${rand_id}`).html(`<span class="close" style="font-size:18px">x</span> ${JSON.parse(ev.data).msg}.`).delay(5000);
            $('.close').on('click', function () {
              $(`#${rand_id}`).remove();
            })
            spinnerIcon.hide('slow');
            downloadIcon.show('slow');
        }
    }.bind(this);
  },
  permissionSelected(e) {
    this.sourceList = this.data_overview_table.rows( ".selected" ).data().toArray();
    this.renderPermissionDialog('Selected Data')
  }
})

export default data
