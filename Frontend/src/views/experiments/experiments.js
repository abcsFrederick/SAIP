import View from '../View'
import _ from 'underscore'
import $ from 'jquery'
import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.css'
import experimentsTemplate from '../../templates/experiments/experiments_overview.pug'
import ProjectCollection from '../../collections/projects/project'
import ProjectInfoTemplate from '../../templates/experiments/ProjectInfo.pug'
import ExperimentInfoTemplate from '../../templates/experiments/ExperimentInfo.pug'
import ExperimentsCollection from '../../collections/experiments/experiments_overview'
// import experimentsTable from '../../templates/experiments/ExperimentTable.pug';
import ExperimentDocContent from './experimentDocContent'
import ExperimentInfoDetailsContent from './experimentInfoDetailsContent'
import UsersCollection from '../../collections/users/user_under_project'
import Participants from '../participants/participants'
import eventsBus from '../../eventsBus'
import '../../stylesheets/experiments/experiments.styl'
import 'datatables.net'

var experiments = View.extend({
  events: {
    'click #ProjectInfo': 'showProjectInfo',
    'click #UsersInfo': 'showUsersInfo',
    'click #ParticipantsContent': 'showParticipantsContent',
    'click #ExperimentDoc': 'showExperimentDoc',
    'click #ProtocolInfo': 'showProtocolInfo',
    'click #experimentsUnderProject tbody tr ': 'participantsInfo',
    'click #userUnderProject tbody tr input': 'changeUserPermission',
    'click #create_experiment': 'create_experiment',
    'click .icon-trash': 'removeExperiment',
    'click #add_users': 'add_users',
    'click .experiment_edit': 'edit_experiment',
    'click #edit_experiment': '_edit_experiment'
  },
  initialize (setting) {
    this.probes = setting.probes
    this.users = setting.users
    this.pi_id = setting.pi_id
    this.is_admin = setting.admin
    this.domain = setting.domain
    this.domain_ws = setting.domain_ws
    this.mappingAttrReserve = setting.mappingAttrReserve
    this.project_id = setting.project_id
    this.projectCollection = new ProjectCollection({
      domain: this.domain,
      project_id: this.project_id
    })
    this.experimentsCollection = new ExperimentsCollection({
      domain: this.domain,
      project_id: this.project_id
    })

    this.usersCollection = new UsersCollection({
      domain: this.domain,
      project_id: this.project_id
    })
    this.render()
    if (this.is_admin) {
      this.$el.html(experimentsTemplate({
        Probes: this.probes.toJSON(),
        admin: this.is_admin
      }))
      this.experimentsTableRender()
      this.userUnderProjectRender()
    } else {
      this.$el.html(experimentsTemplate({
        admin: this.is_admin
      }))
      this.endUserExperimentsTableRender()
      this.endUserUserUnderProjectRender()
    }
  },
  render () {
    this.projectCollection.fetch({
      xhrFields: {
        withCredentials: true // override ajax to send with credential
      },
      success: _.bind(function (res) {
        this.projectInfo = res.toJSON()['0']
        if (typeof (this.projectInfo.name) === 'string') {
          this.projectInfo.name = this.projectInfo.name.replace(/null|[\[\]"]+/g, '')
        } else {
          this.projectInfo.name = this.projectInfo.name
        }
        $('.projectInfoContent').html(ProjectInfoTemplate({
          admin: this.is_admin,
          domain: this.domain,
          project_id: this.project_id,
          nci_project_name: this.projectInfo.nci_project_name,
          PI_first_name: this.projectInfo.first_name,
          PI_last_name: this.projectInfo.last_name,
          requester: this.projectInfo.requester,
          collaborator: this.projectInfo.collaborator,
          collab_grant_num: this.projectInfo.collab_grant_num,
          fund_project_id: this.projectInfo.fund_project_id,
          SRAC_file: this.projectInfo.SRAC_file,
          SRAC_number: this.projectInfo.SRAC_number,
          status: this.projectInfo.status,
          authors: this.projectInfo.authors,
          category: this.projectInfo.name
        }))
      }, this)
    })

    return this
  },
  userUnderProjectRender () {
    this.users_and_permissions = []
    this.usersCollection.fetch({
      xhrFields: {
        withCredentials: true // override ajax to send with credential
      },
      success: _.bind(function (res) {
        //  $('.usersInfoContent').html(UsersTable({}));
        this.userUnderProject = $('#userUnderProject').DataTable({
          data: res.toJSON(),
          rowId: 'user_id',
          columns: [
            {
              targets: 0,
              render: _.bind(function (data, type, full, meta) {
                return full.first_name + ' ' + full.last_name
              }, this)
            },
            {
              orderable: false,
              targets: 0,
              render: _.bind(function (data, type, full, meta) {
                if (this.is_admin) {
                  if (full.permissions == 'RW') {
                    return '<input type=\'checkbox\' id=\'R_' + full.user_id + '\' checked><input type=\'checkbox\' id=\'W_' + full.user_id + '\' checked>'
                  } else if (full.permissions == 'R') {
                    return '<input type=\'checkbox\' id=\'R_' + full.user_id + '\' checked><input type=\'checkbox\' id=\'W_' + full.user_id + '\'>'
                  } else if (full.permissions == 'W') {
                    return '<input type=\'checkbox\' id=\'R_' + full.user_id + '\' ><input type=\'checkbox\' id=\'W_' + full.user_id + '\' checked>'
                  } else {
                    return '<input type=\'checkbox\' id=\'R_' + full.user_id + '\'><input type=\'checkbox\' id=\'W_' + full.user_id + '\'>'
                  }
                } else {
                  if (full.permissions == 'RW') {
                    return '<input type=\'checkbox\' id=\'R_' + full.user_id + '\' checked disabled><input type=\'checkbox\' id=\'W_' + full.user_id + '\' checked disabled>'
                  } else if (full.permissions == 'R') {
                    return '<input type=\'checkbox\' id=\'R_' + full.user_id + '\' checked disabled><input type=\'checkbox\' id=\'W_' + full.user_id + '\' disabled>'
                  } else if (full.permissions == 'W') {
                    return '<input type=\'checkbox\' id=\'R_' + full.user_id + '\' disabled><input type=\'checkbox\' id=\'W_' + full.user_id + '\' checked disabled>'
                  } else {
                    return '<input type=\'checkbox\' id=\'R_' + full.user_id + '\' disabled><input type=\'checkbox\' id=\'W_' + full.user_id + '\' disabled>'
                  }
                }

                //  return "<input type='checkbox' id='"+full.user_id+"' checked><input type='checkbox' id='"+full.user_id+"' checked>"
              }, this)
            }
          ],
          buttons: [
            {
              className: ' btn btn-primary',
              text: 'Add Users',
              action: _.bind(function () {
                $('#addUsersToProject').show()
                this.addUsersToProjectTable.columns.adjust()
                $('.close').on('click', function () {
                  $('#addUsersToProject').hide()
                })
                $('.cancel').on('click', function () {
                  $('#addUsersToProject').hide()
                })
              }, this)
            }
          ],
          destroy: true,
          lengthMenu: [[-1], ['ALL']],
          scrollY: '500px',
          scrollCollapse: true,
          dom: '<"datatable_addUsers_button col-md-6"B>rt'// <"datatable_Length col-md-12"l><"datatable_Pagination col-md-12"p><"clear">'
        })

        this.addUsersToProjectTable = $('#addUsersToProjectTable').DataTable({

          data: this.users.toJSON(),
          rowId: 'id',
          columns: [
            {
              targets: 0,
              render: _.bind(function (data, type, full, meta) {
                return full.last_name + ',' + full.first_name
              })
            },
            {
              targets: 1,
              orderable: false,
              render: _.bind(function (data, type, full, meta) {
                return '<input type=\'checkbox\' id=\'R_' + full.id + '\'><a> </a>'// <input type='checkbox' id='W_"+full.id+"'>" only give read premission
              })
            }
          ],
          destroy: true,
          lengthMenu: [[-1], ['ALL']],
          scrollY: '400px',
          // "scrollX": "100px",
          scrollCollapse: true,
          dom: 'rt',
          autoWidth: true
        })
        $('#addUsersToProjectTable tbody tr').on('click', 'input', _.bind(function (e) {
          if (this.users_and_permissions.indexOf(e.currentTarget.id) != -1) {
            this.users_and_permissions.splice(this.users_and_permissions.indexOf(e.currentTarget.id), 1)
          } else {
            this.users_and_permissions.push(e.currentTarget.id)
          }
          console.log(this.users_and_permissions)
        }, this))
        // header trick
        //  $("#addUsersToProjectTable_wrapper").children().children().children().css('width', '100%');
        // $("#addUsersToProjectTable_wrapper").children().children().children().children().css('width','100%')
        // $('.dataTables_scrollHeadInner').css('width', '100%');
        // $('.dataTables_scrollHeadInner').children().css('width', '100%');
      }, this)
    })
    return this
  },
  endUserUserUnderProjectRender () {
    this.users_and_permissions = []
    this.usersCollection.fetch({
      xhrFields: {
        withCredentials: true // override ajax to send with credential
      },
      success: _.bind(function (res) {
        //  $('.usersInfoContent').html(UsersTable({}));
        this.userUnderProject = $('#userUnderProject').DataTable({
          data: res.toJSON(),
          rowId: 'user_id',
          columns: [
            {
              targets: 0,
              render: _.bind(function (data, type, full, meta) {
                return full.first_name + ' ' + full.last_name
              }, this)
            },
            {
              orderable: false,
              targets: 0,
              render: _.bind(function (data, type, full, meta) {
                if (this.is_admin) {
                  if (full.permissions == 'RW') {
                    return '<input type=\'checkbox\' id=\'R_' + full.user_id + '\' checked><input type=\'checkbox\' id=\'W_' + full.user_id + '\' checked>'
                  } else if (full.permissions == 'R') {
                    return '<input type=\'checkbox\' id=\'R_' + full.user_id + '\' checked><input type=\'checkbox\' id=\'W_' + full.user_id + '\'>'
                  } else if (full.permissions == 'W') {
                    return '<input type=\'checkbox\' id=\'R_' + full.user_id + '\' ><input type=\'checkbox\' id=\'W_' + full.user_id + '\' checked>'
                  } else {
                    return '<input type=\'checkbox\' id=\'R_' + full.user_id + '\'><input type=\'checkbox\' id=\'W_' + full.user_id + '\'>'
                  }
                } else {
                  if (full.permissions == 'RW') {
                    return '<input type=\'checkbox\' id=\'R_' + full.user_id + '\' checked disabled><input type=\'checkbox\' id=\'W_' + full.user_id + '\' checked disabled>'
                  } else if (full.permissions == 'R') {
                    return '<input type=\'checkbox\' id=\'R_' + full.user_id + '\' checked disabled><input type=\'checkbox\' id=\'W_' + full.user_id + '\' disabled>'
                  } else if (full.permissions == 'W') {
                    return '<input type=\'checkbox\' id=\'R_' + full.user_id + '\' disabled><input type=\'checkbox\' id=\'W_' + full.user_id + '\' checked disabled>'
                  } else {
                    return '<input type=\'checkbox\' id=\'R_' + full.user_id + '\' disabled><input type=\'checkbox\' id=\'W_' + full.user_id + '\' disabled>'
                  }
                }

                //  return "<input type='checkbox' id='"+full.user_id+"' checked><input type='checkbox' id='"+full.user_id+"' checked>"
              }, this)
            }
          ],
          destroy: true,
          lengthMenu: [[-1], ['ALL']],
          scrollY: '500px',
          scrollCollapse: true,
          dom: 'rt'// <"datatable_Length col-md-12"l><"datatable_Pagination col-md-12"p><"clear">'
        })
        // $('.dataTables_scrollHeadInner').css('width', '100%');
        // $('.dataTables_scrollHeadInner').children().css('width', '100%');
      }, this)

    })
    return this
  },
  experimentsTableRender () {
    this.experimentsCollection.fetch({
      xhrFields: {
        withCredentials: true // override ajax to send with credential
      },
      success: _.bind(function (res) {
        this.experimentsAllInfo = res.toJSON()
        /*  console.log(res.toJSON());
                $('#experimentInfoContent').html(experimentsTable({
                    data:res.toJSON()
                }));
                */
        this.experimentsUnderProject = $('#experimentsUnderProject').DataTable({
          data: res.toJSON(),
          rowId: 'id',
          columns: [{
            data: 'title'
          }, {
            targets: 1,
            render: _.bind(function (data, type, full, meta) {
              return full.last_name + ',' + full.first_name
            }, this)
          }, {
            targets: 2,
            render: _.bind(function (data, type, full, meta) {
              return full.updated_at.substr(0, 10)
            }, this)
          }, {
            orderable: false,
            data: 'number_of_images'
          }, {
            orderable: false,
            targets: -1,
            render: _.bind(function (data, type, full, meta) {
              // http://localhost:3001/api/v1/experiment_download/1/xzs
              if (full.number_of_images) {
                return '<a experiment_id=' + full.id + ' probe_id=' + full.probe_id + ' class=\'fa fa-edit experiment_edit\' style=\'font-size:16px; cursor:pointer\'></a> \
                                       <a class=\'fa fa-download expDownloadProgress\' style=\'cursor:pointer\' exp_id=\'' + full.id + '\' exp_name=\'' + full.title.replace(/[%/]/g, '_') + '\' title=\'' + full.id + '/' + full.title.replace(/[%/]/g, '_') + '\'></a><a class=\'fa fa-spinner fa-spin\' style=\'display:none;\'></a><progress class=\' progress\' value=\'0\' style=\'display:none;margin-right:5px;width:16px;font-size:5px;height:5px;margin-bottom:0px\'></progress>  </a> \
                                       <a class=\'fa icon-trash\' style=\'cursor: pointer;color:red;font-size:18px\'></a>'
              } else {
                return '<a experiment_id=' + full.id + ' probe_id=' + full.probe_id + ' class=\'fa fa-edit experiment_edit\' style=\'font-size:16px; cursor:pointer\'></a> \
                                       <a class=\'fa icon-trash\' style=\'cursor: pointer;color:red;font-size:18px\'></a>'
              }
            }, this)
          }],
          buttons: [
            {
              className: ' btn btn-primary',
              text: 'New Experiment',
              action: _.bind(function () {
                $('#createExperiment').show()
                $('#experiment_name').val('')
                $('#description').val('')
                $('#probe_id').val('')
                $('.close').on('click', function () {
                  $('#createExperiment').hide()
                })
                $('.cancel').on('click', function () {
                  $('#createExperiment').hide()
                })
              }, this)
            }
          ],
          destroy: true,
          lengthMenu: [[-1], ['ALL']],
          scrollY: '500px',
          scrollCollapse: true,
          dom: '<"datatable_addExp_button col-md-6"B>rt'
        })

        $('.expDownloadProgress').on('click', _.bind(function (e) {
          const requestPath = $(e.currentTarget).attr('title')
          const progressIcon = $(e.target).next('.fa-spinner').next('.progress')
          const downloadIcon = $(e.target)
          const spinnerIcon = $(e.target).next('.fa-spinner')

          const exp_name = $(e.currentTarget).attr('exp_name')
          const exp_id = $(e.currentTarget).attr('exp_id')

          var ws = new WebSocket(this.domain_ws + 'api/v1/experiment_download/' + requestPath)

          ws.onopen = function () {
            console.log('websocket is connected ...')
            spinnerIcon.show('slow')
            downloadIcon.hide('slow')
            // $('.progressAlert').empty();
            // $('.progressAlert').append('<li>Experiment is preparing <span id=expDownloadProgressDisplay></span></li>');
            $('.progressAlert').append('<li class="expDownloadProgressDisplay" id="expDownloadProgressDisplay_' + exp_id + '">Experiment: <label>' + exp_name + '</label> is preparing<span id=expDownloadProgressPercentageDisplay_' + exp_id + '></span></li>')
            $('.progressAlert').fadeTo('slow', 0.8).delay(5000)
          }

          ws.onmessage = function (ev) {
            // console.log(JSON.parse(ev.data).err);
            $('#expDownloadProgressPercentageDisplay_' + exp_id).text(JSON.parse(ev.data).msg)

            if (JSON.parse(ev.data).err == 3) {
              const zipFileLocation = JSON.parse(ev.data).filePath
              var xhr = new XMLHttpRequest()
              xhr.open('GET', this.domain + 'api/v1/downloadZip?absolutePath=' + zipFileLocation)
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
                var fileName = xhr.getResponseHeader('Content-Disposition').match(/\sfilename="([^"]+)"/)[1]
                //    console.log(fileName);
                saveBlob(blob, fileName)
              }
              xhr.onloadstart = function (e) {
                progressIcon.prop('value', 0)
                progressIcon.show('slow')
                spinnerIcon.hide('slow')
                // $('.progressAlert').empty();
                // $('.progressAlert').append('<li>Experiment is downloading</li>');
                // $('.progressAlert').fadeTo('slow', 0.8).delay(5000);
                $('#expDownloadProgressDisplay_' + exp_id).html('Experiment: <label>' + exp_name + '</label> is downloading')
                // $('#doNotRefreshAlert').show('slow');
                // downloadIcon.hide('slow');
              }
              xhr.onloadend = function (e) {
                // $('.progressAlert').empty().slideUp(500);
                $('#expDownloadProgressDisplay_' + exp_id).remove().slideUp(500)
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
            if (JSON.parse(ev.data).err == 4) {
              $('#expDownloadProgressDisplay_' + exp_id).html('<span class="close" style="font-size:18px">x</span> Experiment: <label>' + exp_name + '</label> is too large, please contact Admin user to enlarge disk or separate your experiment into multiple ').delay(5000)
              // $('#expDownloadProgressDisplay_'+exp_id).remove().slideUp(500);
              $('.close').on('click', function () {
                $('#expDownloadProgressDisplay_' + exp_id).remove()
              })
              spinnerIcon.hide('slow')
              downloadIcon.show('slow')
            }
          }.bind(this)
        }, this))
      }, this)
    })
  },
  showProjectInfo (e) {
    $(e.currentTarget).parent().parent().children().children().removeClass('active')
    $(e.currentTarget).addClass('active')
    $('.projectInfoContent').show()
    $('.usersInfoContent').hide()
  },
  showUsersInfo (e) {
    $(e.currentTarget).parent().parent().children().children().removeClass('active')
    $(e.currentTarget).addClass('active')
    $('.usersInfoContent').show()
    $('.projectInfoContent').hide()
    this.userUnderProject.columns.adjust()
  },
  showParticipantsContent (e) {
    $(e.currentTarget).parent().parent().children().children().removeClass('active')
    $(e.currentTarget).addClass('active')
    $('#PUMA_Participants').show()
    if (this.participants) {
      this.participants.participantsTable.columns.adjust()
    }
    $('.experimentDocContent').hide()
  },
  showExperimentDoc (e) {
    $(e.currentTarget).parent().parent().children().children().removeClass('active')
    $(e.currentTarget).addClass('active')
    $('.experimentDocContent').show()
    if (this.experimentDocContent) {
      this.experimentDocContent.experimentDocUnderExperimentTable.columns.adjust()
    }
    $('#PUMA_Participants').hide()
  },
  showProtocolInfo (e) {
    $(e.currentTarget).parent().parent().children().children().removeClass('active')
    $(e.currentTarget).addClass('active')
    $('.protocolInfoContent').show()
    $('#experimentInfoContent').hide()
  },
  participantsInfo (e) {
    if (!$(e.target).hasClass('fa-download') && !$(e.target).hasClass('icon-trash') && !$(e.target).hasClass('experiment_edit')) {
      $(e.currentTarget).parent().children().removeClass('selected')
      $(e.currentTarget).addClass('selected')
      if (this.participants) {
        this.participants.close()
      }
      this.participants = new Participants({
        admin: this.is_admin,
        domain: this.domain,
        domain_ws: this.domain_ws,
        experiment_id: e.currentTarget.id
      })
      this.mappingAttrReserve.attr('preselectexp', e.currentTarget.id)
      $('#PUMA_Participants').html(this.participants.el)
      this.participants.render()

      if (this.experimentDocContent) {
        this.experimentDocContent.close()
      }
      this.experimentDocContent = new ExperimentDocContent({
        admin: this.is_admin,
        domain: this.domain,
        experiment_id: e.currentTarget.id
      })
      $('.experimentDocContent').html(this.experimentDocContent.el)
      this.experimentDocContent.render()

      if (this.experimentInfoDetailsContent) {
        this.experimentInfoDetailsContent.close()
      }
      this.experimentInfoDetailsContent = new ExperimentInfoDetailsContent({
        admin: this.is_admin,
        domain: this.domain,
        probes: this.probes,
        experiment_id: e.currentTarget.id,
        experimentInfo: this.experimentsAllInfo
      })
      $('.experimentInfoDetailsContent').html(this.experimentInfoDetailsContent.el)
      this.experimentInfoDetailsContent.render()
    }
  },
  changeUserPermission (e) {
    // console.log(this.project_id);
    const user_id = e.currentTarget.parentElement.parentElement.id
    let permissions
    if (e.currentTarget.parentElement.children[0].checked) {
      permissions = 'R'
    } else {
      permissions = ''
    }
    if (e.currentTarget.parentElement.children[1].checked) {
      permissions = permissions + 'W'
    }
    // console.log(e);
    const newUserPermissions = new FormData()
    newUserPermissions.append('user_id', user_id)
    newUserPermissions.append('permissions', permissions)
    newUserPermissions.append('project_id', this.project_id)
    $.ajax({
      url: this.domain + 'api/v1/project_permissions',
      type: 'POST',
      data: newUserPermissions,
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
  create_experiment () {
    var newExperimentData = new FormData()
    newExperimentData.append('project_id', this.project_id)
    newExperimentData.append('title', $('#experiment_name').val())
    newExperimentData.append('description', $('#description').val())
    newExperimentData.append('pi_id', this.pi_id)
    newExperimentData.append('probe_id', $('#probe_id').val())
    $.ajax({
      url: this.domain + 'api/v1/experiment_add',
      type: 'POST',
      data: newExperimentData,
      processData: false, // important
      contentType: false, // important
      dataType: 'json',
      xhrFields: {
        withCredentials: true
      },
      success: _.bind(function (res) {
        if (!res.err) {
          $('.alert-success').empty()
          $('#createExperiment').hide()
          this.experimentsTableRender()
          for (let a = 0; a < res.result.length; a++) {
            $('.alert-success').append('<li>' + res.result[a] + '</li>')
          }
          $('.alert-success').fadeTo('slow', 0.8).delay(5000).slideUp(500)
        } else {
          $('.alert-danger').empty()
          for (let a = 0; a < res.errors.length; a++) {
            $('.alert-danger').append('<li>' + res.errors[a].msg + '</li>')
          }
          $('.alert-danger').fadeTo('slow', 0.8).delay(5000).slideUp(500)
        }
      }, this)
    })
  },
  endUserExperimentsTableRender () {
    this.experimentsCollection.fetch({
      xhrFields: {
        withCredentials: true // override ajax to send with credential
      },
      success: _.bind(function (res) {
        console.log(res.toJSON())
        this.experimentsAllInfo = res.toJSON()
        /*  console.log(res.toJSON());
                $('#experimentInfoContent').html(experimentsTable({
                    data:res.toJSON()
                }));
                */
        this.experimentsUnderProject = $('#experimentsUnderProject').DataTable({
          data: res.toJSON(),
          rowId: 'id',
          columns: [
            {
              data: 'title'
            },
            {
              targets: 1,
              render: _.bind(function (data, type, full, meta) {
                return full.last_name + ',' + full.first_name
              }, this)
            },
            {
              targets: 2,
              render: _.bind(function (data, type, full, meta) {
                return full.updated_at.substr(0, 10)
              }, this)
            },
            {
              orderable: false,
              data: 'number_of_images'
            },
            {
              orderable: false,
              targets: -1,
              render: _.bind(function (data, type, full, meta) {
                if (full.number_of_images) {
                  return '<a class=\'fa fa-download expDownloadProgress\' style=\'cursor:pointer\' exp_id=\'' + full.id + '\' exp_name=\'' + full.title.replace(/[%/]/g, '_') + '\' title=\'' + full.id + '/' + full.title.replace(/[%/]/g, '_') + '\'></a><a class=\'fa fa-spinner fa-spin\' style=\'display:none;\'></a><progress class=\' progress\' value=\'0\' style=\'display:none;margin-right:5px;width:16px;font-size:5px;height:5px;margin-bottom:0px\'></progress>  </a>'
                } else {
                  return ''
                }
              }, this)
            }
          ],

          destroy: true,
          lengthMenu: [[-1], ['ALL']],
          scrollY: '500px',
          scrollCollapse: true,
          dom: 'rt'
        })

        $('.expDownloadProgress').on('click', _.bind(function (e) {
          const requestPath = $(e.currentTarget).attr('title')
          const progressIcon = $(e.target).next('.fa-spinner').next('.progress')
          const downloadIcon = $(e.target)
          const spinnerIcon = $(e.target).next('.fa-spinner')

          const exp_name = $(e.currentTarget).attr('exp_name')
          const exp_id = $(e.currentTarget).attr('exp_id')
          var ws = new WebSocket(this.domain_ws + 'api/v1/experiment_download/' + requestPath)

          ws.onopen = function () {
            console.log('websocket is connected ...')
            spinnerIcon.show('slow')
            downloadIcon.hide('slow')
            // $('.progressAlert').empty();
            // $('.progressAlert').append('<li>Experiment is preparing <span id=expDownloadProgressDisplay></span></li>');
            $('.progressAlert').append('<li class="expDownloadProgressDisplay" id="expDownloadProgressDisplay_' + exp_id + '">Experiment: <label>' + exp_name + '</label> is preparing<span id=expDownloadProgressPercentageDisplay_' + exp_id + '></span></li>')
            $('.progressAlert').fadeTo('slow', 0.8)
          }

          ws.onmessage = function (ev) {
            // console.log(JSON.parse(ev.data).err);
            $('#expDownloadProgressPercentageDisplay_' + exp_id).text(JSON.parse(ev.data).msg)

            if (JSON.parse(ev.data).err == 3) {
              const zipFileLocation = JSON.parse(ev.data).filePath
              var xhr = new XMLHttpRequest()
              xhr.open('GET', this.domain + 'api/v1/downloadZip?absolutePath=' + zipFileLocation)
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
                var fileName = xhr.getResponseHeader('Content-Disposition').match(/\sfilename="([^"]+)"/)[1]
                //    console.log(fileName);
                saveBlob(blob, fileName)
              }
              xhr.onloadstart = function (e) {
                progressIcon.prop('value', 0)
                progressIcon.show('slow')
                spinnerIcon.hide('slow')
                // $('.progressAlert').empty();
                // $('.progressAlert').append('<li>Experiment is downloading</li>');
                // $('.progressAlert').fadeTo('slow', 0.8);
                $('#expDownloadProgressDisplay_' + exp_id).html('Experiment: <label>' + exp_name + '</label> is downloading')
                // $('#doNotRefreshAlert').show('slow');
                // downloadIcon.hide('slow');
              }
              xhr.onloadend = function (e) {
                // $('.progressAlert').empty();
                // $('.progressAlert').slideUp(500);
                $('#expDownloadProgressDisplay_' + exp_id).remove().slideUp(500)
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
            if (JSON.parse(ev.data).err == 4) {
              $('#expDownloadProgressDisplay_' + exp_id).html('<span class="close" style="font-size:18px">x</span> Experiment: <label>' + exp_name + '</label> is too large, please contact Admin user to enlarge disk or separate your experiment into multiple ').delay(5000)
              // $('#expDownloadProgressDisplay_'+exp_id).remove().slideUp(500);
              $('.close').on('click', function () {
                $('#expDownloadProgressDisplay_' + exp_id).remove()
              })
              spinnerIcon.hide('slow')
              downloadIcon.show('slow')
            }
          }.bind(this)
        }, this))
      }, this)
    })
  },
  removeExperiment (e) {
    console.log(e.currentTarget.parentElement.parentElement.id)
    $.ajax({
      url: this.domain + 'api/v1/experiment_remove/' + e.currentTarget.parentElement.parentElement.id,
      type: 'DELETE',
      xhrFields: {
        withCredentials: true
      },
      success: _.bind(function (res) {
        if (!res.err) {
          //  $('#createExperiment').hide();
          this.experimentsTableRender()
          this.experimentDocContent.close()
          this.participants.close()
        } else {
          $('.removeErr').tooltip('enable')
          $('.removeErr').tooltip('show')
          setTimeout(function () { $('.removeErr').tooltip('hide') }, 3000)
          $('.removeErr').tooltip('disable')
        }
      }, this)
    })
  },
  add_users () {
    if (this.users_and_permissions.length) {
      var newAddUsers = new FormData()
      newAddUsers.append('project_id', this.project_id)
      newAddUsers.append('users_and_permissions', JSON.stringify(this.users_and_permissions))

      $.ajax({
        url: this.domain + 'api/v1/project_add_users',
        type: 'POST',
        data: newAddUsers,
        processData: false, // important
        contentType: false, // important
        dataType: 'json',
        xhrFields: {
          withCredentials: true
        },
        success: _.bind(function (res) {
          if (!res.err) {
            $('#addUsersToProject').hide()
            this.userUnderProjectRender()
            $('.alert-success').empty()
            $('.alert-success').html(res.msg)
            $('.alert-success').fadeTo('slow', 0.8).delay(5000).slideUp(500)
          } else {
            $('.alert-danger').empty()
            $('.alert-danger').append('<li>' + res.msg + '</li>')
            $('.alert-danger').fadeTo('slow', 0.8).delay(5000).slideUp(500)
          }
        }, this)
      })
    }
  },
  edit_experiment: function (e) {
    this.currentEdit_exp_id = parseInt($(e.currentTarget).attr('experiment_id'))
    const currentEditingExp = this.experimentsAllInfo.find((x) => x.id === this.currentEdit_exp_id)
    $('#editExperiment_name').val(currentEditingExp.title)
    $('#editProbe_id').val($(e.currentTarget).attr('probe_id'))
    $('#editDescription').val(currentEditingExp.description)
    this.$('#editExperiment').show()
    this.$('.close').on('click', _.bind(function () {
      this.$('#editExperiment').hide()
    }, this))
    this.$('.cancel').on('click', _.bind(function () {
      this.$('#editExperiment').hide()
    }, this))
  },
  _edit_experiment: function (e) {
    var newExperimentData = new FormData()
    newExperimentData.append('experiment_id', this.currentEdit_exp_id)
    newExperimentData.append('title', $('#editExperiment_name').val())
    newExperimentData.append('probe_id', $('#editProbe_id').val())
    newExperimentData.append('description', $('#editDescription').val())

    $.ajax({
      url: this.domain + 'api/v1/experiments/edit',
      type: 'PUT',
      data: newExperimentData,
      processData: false, // important
      contentType: false, // important
      dataType: 'json',
      xhrFields: {
        withCredentials: true
      },
      success: _.bind(function (res) {
        if (!res.err) {
          const indexToModify = this.experimentsAllInfo.findIndex((x) => x.id === this.currentEdit_exp_id)
          this.experimentsAllInfo[indexToModify].probe_id = parseInt(newExperimentData.get('probe_id'))
          this.experimentsAllInfo[indexToModify].description = newExperimentData.get('description')
          this.experimentsAllInfo[indexToModify].title = newExperimentData.get('title')
          $('.alert-success').empty()
          $('#editExperiment').hide()
          this.experimentsTableRender()
          if (this.experimentInfoDetailsContent &&
                        this.experimentInfoDetailsContent.experiment_id === this.currentEdit_exp_id) {
            if (this.experimentInfoDetailsContent) {
              this.experimentInfoDetailsContent.close()
            }
            this.experimentInfoDetailsContent = new ExperimentInfoDetailsContent({
              admin: this.is_admin,
              domain: this.domain,
              probes: this.probes,
              experiment_id: this.currentEdit_exp_id,
              experimentInfo: this.experimentsAllInfo
            })
            $('.experimentInfoDetailsContent').html(this.experimentInfoDetailsContent.el)
          }
          for (let a = 0; a < res.result.length; a++) {
            $('.alert-success').append('<li>' + res.result[a] + '</li>')
          }
          $('.alert-success').fadeTo('slow', 0.8).delay(5000).slideUp(500)
        } else {
          $('.alert-danger').empty()
          for (let a = 0; a < res.errors.length; a++) {
            $('.alert-danger').append('<li>' + res.errors[a].msg + '</li>')
          }
          $('.alert-danger').fadeTo('slow', 0.8).delay(5000).slideUp(500)
        }
      }, this)
    })
  }
})

export default experiments
