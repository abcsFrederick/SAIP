import $ from 'jquery'
import _ from 'underscore'
import Backbone from 'backbone'
import 'datatables.net'
// import DataTable from 'datatables.net-dt';
import 'datatables.net-buttons'
import Projects_overview_collection from '../../collections/projects/projects_overview'
import Projects_overview_model from '../../collections/projects/projects_overview'
import Projects_overview_templates from '../../templates/projects/projects_overview.pug'
import FieldsTemplates from '../../templates/projects/projects_overview_pi.pug'
import AlertTemplate from '../../templates/projects/deleteProjectAlert.pug'
// import Project_add_model from '../../models/projects/project_add';

import Experiments from '../experiments/experiments'
import '../../stylesheets/projects/projects_overview.styl'
import View from '../View'
import UsersCollection from '../../collections/users/users_overview'
import eventsBus from '../../eventsBus'

var projects = View.extend({
  events: {
    'click #create_project': 'create_project',
    'click #edit_project': '_edit_project',
    'click .icon-trash': 'renderDeletionAlert',
    'click .project_edit': 'editProject',
    'click #deleteProjectSubmit': 'removeProject'
  },
  initialize (setting) {
    this.is_admin = setting.admin
    this.LoginAdminUser = setting.LoginAdminUser
    this.domain = setting.domain
    this.domain_ws = setting.domain_ws
    this.user_id = setting.user_id
    this.users = setting.users
    this.probes = setting.probes
    this.mappingAttrReserve = setting.mappingAttrReserve
    this.protocols = setting.protocols
    this.projects_overview_collection = new Projects_overview_collection({
      domain: this.domain
    })
    this.PI = []

    this.users_and_permissions = []
    this.selectedUserIdAll = []
    if (this.is_admin) {
      _.each(this.users.toJSON(), _.bind(function (row) {
        if (row.is_pi) {
          this.PI.push(row)
        }
      }, this))
      this.render()
    } else {
      this.endUserRender()
    }

    /*	this.project_add_model = new Project_add_model({
			domain:this.domain
		});
	*/
  },
  render () {
    this.projects_overview_collection.fetch({
      data: $.param(this.user_id),
      xhrFields: {
        withCredentials: true							// override ajax to send with credential
      },
      success: (_.bind(function (res) {
        if (this.is_admin) {
          this.$el.html(Projects_overview_templates({
            admin: this.is_admin,
            PI: this.users.toJSON().sort(this.dynamicSort('first_name')),
            LoginAdminUser: this.LoginAdminUser,
            Probes: this.probes.toJSON()
          }))
        } else {
          this.$el.html(Projects_overview_templates({
            admin: this.is_admin
          }))
        }
        
        this.projects_overview_table = 
        // new DataTable('#projects_overview', {
        $('#projects_overview').DataTable({
          language: {
            searchPlaceholder: 'Project/PI/Short name'
          },
          data: res.toJSON(),
          rowId: 'nci_projects_id',
          createdRow: function (row, data, dataIndex) {
            $(row).attr('pid', data.nci_projects_pi_id);
            $(row).attr('status', data.projects_status);
            if (data.projects_status === 'I') {
              $(row).css('display', 'none')
            }
          },
          columns: [{
            data: 'nci_projects_id'	//	nci_projects_id
          }, {
            data: 'nci_projects_name'	//	nci_projects_name
          }, {
            targets: 2,
            render: function (data, type, full, meta) {
              return full.Pi_Last_name + ',' + full.Pi_First_name
            }
          }, {
            data: 'number_of_experiments'	//	number_of_images
          }, {
            data: 'number_of_studies'	//	number_of_studies
          }, {
            targets: -4,
            render: _.bind(function (data, type, full, meta) {
              if (typeof (full.short_name) === 'string') {
                return full.short_name.replace(/null|[\[\]"]+/g, '')
              } else {
                return full.short_name
              }
            }, this)
          }, {
            targets: -3,
            render: _.bind(function (data, type, full, meta) {
              if (typeof (full.nci_projects_created_at) === 'string') {
                return full.nci_projects_created_at.slice(0, 10)
              } else {
                return full.nci_projects_created_at
              }
            }, this)
          }, {
            orderable: false,
            targets: -2,
            render: _.bind(function (data, type, full, meta) {
              if (full.projects_status == 'I') {
                return '<select id=' + full.nci_projects_id + '><option value=\'I\' selected>Inactive</option><option value=\'A\'>Active</option></select>'
              } else {
                return '<select id=' + full.nci_projects_id + '><option value=\'A\' selected>Active</option><option value=\'I\'>Inactive</option></select>'
                }
            }, this)
          }, {
            orderable: false,
            targets: -1,
            render: _.bind(function (data, type, full, meta) {
              return '<a project_id=' + full.nci_projects_id + ' project_name="' + full.nci_projects_name +
                    '" pi_id=' + full.nci_projects_pi_id + ' protocol_category_id=' + full.protocol_category_id +
                    ' protocol_category_name=' + full.short_name + ' class=\'fa fa-edit project_edit\' style=\'cursor:pointer\'></a>' +
                    '<a class=\'fa icon-trash\' style=\'cursor: pointer;color:red;font-size:18px\'></a>'
            }, this)
          }],
          columnDefs: [
            { targets: [-1, 4, 3], searchable: false }
          ],
          // "columnDefs": [ { "defaultContent": "-", "targets": "_all" } ]
          // dom: 'Bfrtip',
          buttons: [
            {
              className: ' btn btn-primary',
              text: 'New Project',
              action: _.bind(function () {
              this.project_protocols = []
              this.project_protocols_names = []
                $('#createProject').show()
                $('#ProjectProtocolsTable').DataTable({
                  drawCallback: function (settings) {
                    $('#ProjectProtocolsTable thead').remove()
                  },
                  data: this.protocols.toJSON(),
                  rowId: 'id',
                  columns: [
                    {
                          data: 'name'
                    },
                    {
                          data: 'short_name'
                    }
                  ],
                  destroy: true,
                lengthMenu: [[-1], ['ALL']],
                scrollY: '50vh',
                scrollCollapse: true,
                dom: 'rt'
                })
                $('.close').on('click', function () {
                  $('#createProject').hide()
                })
                $('.cancel').on('click', function () {
                  $('#createProject').hide()
                })
                $('#ProjectProtocolsTable tbody').off()
                $('#ProjectProtocolsTable tbody').on('click', 'tr', _.bind(function (e) {
                //	window.test=e.currentTarget;
                if ($(e.currentTarget).hasClass('selected')) {
                  console.log('has selected')
                  $(e.currentTarget).removeClass('selected')
                  this.project_protocols.splice(this.project_protocols.indexOf(e.currentTarget.id), 1)
                  this.project_protocols_names.splice(this.project_protocols_names.indexOf(e.currentTarget.cells[1].textContent), 1)
                } else {
                  console.log('no selected')
                  $(e.currentTarget).addClass('selected')
                  this.project_protocols.push(e.currentTarget.id)// make sure parent is not depulicate?
                  this.project_protocols_names.push(e.currentTarget.cells[1].textContent)
                }
                console.log(this.project_protocols)
                console.log(this.project_protocols_names)
              }, this))

              $('#ProjectUsersTable').DataTable({
                  drawCallback: function (settings) {
                  $('#ProjectProtocolsTable thead').remove()
                },
                  data: this.users.toJSON(),
                  rowId: 'id',
                  language: {
                      searchPlaceholder: 'Name'
                  },
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
                            return '<input type=\'checkbox\' id=\'R_' + full.id + '\'><a> </a>'// <input type='checkbox' id='W_"+full.id+"'>"	only give read premission
                          })
                    }
                  ],
                  columnDefs: [
                      { targets: [1], searchable: false }
                  ],
                  destroy: true,
                lengthMenu: [[-1], ['ALL']],
                scrollY: '35vh',
                scrollCollapse: true,
                dom: '<"datatable_search_userName col-md-12"f>rt'
                })
                $('#ProjectUsersTable tbody tr').on('click', 'input', _.bind(function (e) {
                  if (this.users_and_permissions.indexOf(e.currentTarget.id) != -1) {
                    this.users_and_permissions.splice(this.users_and_permissions.indexOf(e.currentTarget.id), 1)
                    this.selectedUserTableRender(e.currentTarget.id)
                  } else {
                    this.users_and_permissions.push(e.currentTarget.id)
                    // window.tt=e.currentTarget
                    this.selectedUserTableRender(e.currentTarget.id)
                  }
                console.log(this.users_and_permissions)
              }, this))
                if (!this.selectedUserTable) {
                  this.selectedUserTable = $('#ProjectSelectedUsersTable').DataTable({
                  dom: 'rt',
                  // "scrollY": "100%",
                  scrollY: '15vh',
                  scrollCollapse: true
                })
                }
              }, this)
            },
            {
              className: ' btn btn-primary hide',
              text: 'Active',
              attr: {
                id: 'hideInactive'
              },
              action: _.bind(function (e, dt, index) {
                this.projects_overview_table.rows(function (idx, data, node) {
                  // if (data.projects_status === 'I') { $(node).addClass('hide') }
                  if ($(node).attr('status') === 'I') { $(node).css('display', 'none') }
                })
                $('#showInactive').removeClass('hide');
                $('#hideInactive').addClass('hide');
              }, this)
            },
            {
              className: ' btn btn-primary',
              text: 'ALL',
              attr: {
                id: 'showInactive'
              },
              action: _.bind(function (e, dt, index) {
                this.projects_overview_table.rows(function (idx, data, node) {
                  // if ($(node).hasClass('hide')) { $(node).removeClass('hide') }
                  if ($(node).attr('status') === 'I') { $(node).css('display', 'revert') }
                })
                $('#hideInactive').removeClass('hide');
                $('#showInactive').addClass('hide');
              }, this)
            }
          ],
          destroy: true,
          lengthMenu: [[-1], ['ALL']],
          scrollY: '80vh',
          scroller: true,
          scrollCollapse: true,
          // initComplete: _.bind(function () {
          //   console.log(this)
          //   this.projects_overview_table.columns.adjust()
          // }, this),
          dom: ' <"datatable_project_buttons col-md-6"B><"datatable_search_patient col-md-6"f>rt<"datatable_Information col-md-12"i>'// <"datatable_Length col-md-12"l><"datatable_Pagination col-md-12"p><"clear">'
        });
        window.test = this.projects_overview_table;
        $('#projects_overview tbody tr').on('change', 'select', _.bind(function (e) {
          const newProjectStatus = new FormData()
          const status = e.currentTarget[e.currentTarget.selectedIndex].value

          newProjectStatus.append('project_id', e.currentTarget.id)
          newProjectStatus.append('project_status', status)

          $.ajax({
            url: this.domain + 'api/v1/project_status',
            type: 'POST',
            data: newProjectStatus,
            processData: false, // important
            contentType: false, // important
            dataType: 'json',
            xhrFields: {
						    withCredentials: true
            },
					    success: _.bind(function (res) {
					    	$(e.currentTarget).parent().parent().attr('status', $(e.currentTarget).val())
					    }, this)
          })
        }, this))
        $('#projects_overview tbody').on('click', 'tr', _.bind(function (e) {
          // window.tst=$(e.target);
          if (!$(e.target).is('select') && !$(e.target).hasClass('icon-trash') && !$(e.target).hasClass('project_edit')) {
            if (this.experiments) {
              this.experiments.close()
            }
            this.experiments = new Experiments({
              users: this.users,
              admin: this.is_admin,
              domain: this.domain,
              domain_ws: this.domain_ws,
              project_id: e.currentTarget.id,
              probes: this.probes,
              pi_id: e.currentTarget.getAttribute('pid'),
              mappingAttrReserve: this.mappingAttrReserve
            })
            this.mappingAttrReserve.attr('preselectproject', e.currentTarget.id)
            this.mappingAttrReserve.removeAttr('preselectexp')
            $('#PUMA').html(this.experiments.el)
          }
        }, this))
      }, this))
    })
    return this
  },
  selectedUserTableRender (selectedUser) {
    const selectedUserId = parseInt(selectedUser.substr(2))
    // if(!this.selectedUserTable){
    // 	this.selectedUserTable = $('#ProjectSelectedUsersTable').DataTable({
    // 		"dom":'rt',
    // 		//"scrollY": "100%",
    // 		"scrollY":"15vh",
    // 		"scrollCollapse": true,
    // 	});
    // }

    const selectedUserRecord = this.users.toJSON().filter(x => x.id === selectedUserId)
    if (this.selectedUserIdAll.indexOf(selectedUserId) != -1) {
      this.selectedUserIdAll.splice(this.selectedUserIdAll.indexOf(selectedUserId), 1)
      this.selectedUserTable.row('#selectedUser_' + selectedUserId).remove().draw(false)
      // unbind check event
      $('#selectedUser_R_' + selectedUserId).off()
    } else {
      this.selectedUserIdAll.push(selectedUserId)
      this.selectedUserTable.row.add([selectedUserRecord[0].last_name + ',' +
				selectedUserRecord[0].first_name, '<input type=\'checkbox\' id=\'selectedUser_R_' + selectedUserId + '\' checked><a> </a>'])
        .node().id = 'selectedUser_' + selectedUserId
      this.selectedUserTable.draw(false)
      $('#selectedUser_R_' + selectedUserId).on('click', _.bind(function (e) {
        console.log(e)
        // remove from selected user table
        this.selectedUserIdAll.splice(this.selectedUserIdAll.indexOf(selectedUserId), 1)
        this.selectedUserTable.row('#selectedUser_' + selectedUserId).remove().draw(false)
        // remove from user selection table
        this.users_and_permissions.splice(this.users_and_permissions.indexOf('R_' + selectedUserId), 1)
        $('#R_' + selectedUserId).prop('checked', false)

        // unbind check event
        $('#selectedUser_R_' + selectedUserId).off()
      }, this))
    }
    this.selectedUserTable.columns.adjust()
  },
  create_project: function () {
    var newProjectData = new FormData()

    // newProjectData.append('SRAC_file',$('#SRAC_file')[0].files[0]);
    newProjectData.append('name', $('#project_name').val())
    newProjectData.append('pi_id', $('#pi_id').val())
    newProjectData.append('status', $('#status').val())
    newProjectData.append('users_and_permissions', JSON.stringify(this.users_and_permissions))
    newProjectData.append('protocol_category_id', JSON.stringify(this.project_protocols))
    newProjectData.append('project_protocols_names', JSON.stringify(this.project_protocols_names))

    $.ajax({
      url: this.domain + 'api/v1/project_add',
      type: 'POST',
      data: newProjectData,
      processData: false, // important
      contentType: false, // important
      dataType: 'json',
      xhrFields: {
			  withCredentials: true
      },
		    success: _.bind(function (res) {
		    	if (!res.err) {
		    		// console.log(res)
		    		$('#createProject').hide()
		    		eventsBus.trigger('addNewProject')
		    		$('.alert-success').empty()
		    		$('.alert-success').html(res.result)
		    		$('.alert-success').fadeTo('slow', 0.8).delay(5000).slideUp(500)
		    	} else {
		    		$('.alert-danger').empty()
		    		console.log(res.errors)
		    		for (let a = 0; a < res.errors.length; a++) {
		    			$('.alert-danger').append('<li>' + res.errors[a].msg + '</li>')
		    		}
		    		$('.alert-danger').fadeTo('slow', 0.8).delay(5000).slideUp(500)
		    	}
		    })
    })
  },
  dynamicSort (property) {
	    var sortOrder = 1
	    if (property[0] === '-') {
	        sortOrder = -1
	        property = property.substr(1)
	    }
	    return function (a, b) {
	        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0
	        return result * sortOrder
	    }
  },
  endUserRender () {
    this.projects_overview_collection.fetch({
      data: $.param(this.user_id),
      xhrFields: {
				  withCredentials: true							// override ajax to send with credential
      },
      success: (_.bind(function (res) {
        console.log(res)

        this.$el.html(Projects_overview_templates({
          admin: this.is_admin
        }))

        this.projects_overview_table = $('#projects_overview').DataTable({
            language: {
				        searchPlaceholder: 'Project/PI/Short name'
				    },
				    data: res.toJSON(),
				    rowId: 'nci_projects_id',
				    createdRow: function (row, data, dataIndex) {
					      $(row).attr('pid', data.nci_projects_pi_id)
            },
				    columns: [
				    	// {
				    	// 	data:"nci_projects_id"	//	nci_projects_id
				    	// },
				    	{
				    		data: 'nci_projects_name'	//	nci_projects_name
				    	},
				    	// {
				    	// 	"targets": 2,
				    	// 	"render": function ( data, type, full, meta ) {
				     //        	return full.Pi_Last_name + ',' + full.Pi_First_name
				     //        }
				    	// },
				    	{
				    		data: 'number_of_experiments'	//	number_of_experiments
				    	},
				    	{
				    		data: 'number_of_studies'	//	number_of_studies
				    	},
				    	{
				            targets: -3,
				            render: _.bind(function (data, type, full, meta) {
				            	if (typeof (full.short_name) === 'string') {
				            		return full.short_name.replace(/null|[\[\]"]+/g, '')
				            	} else {
				            		return full.short_name
				            	}
				            }, this)
				    	},
				    	{
				            targets: -2,
				            render: _.bind(function (data, type, full, meta) {
				            	if (typeof (full.nci_projects_created_at) === 'string') {
				            		return full.nci_projects_created_at.slice(0, 10)
				            	} else {
				            		return full.nci_projects_created_at
				            	}
				            }, this)
				    	}
				    	// {
			      //       	"orderable":false,
				     //        "targets": -1,
				     //        "render": _.bind(function ( data, type, full, meta ) {
				     //        	if (full.projects_status == "I")
				     //        	{
				     //        		return "<select id="+full.nci_projects_id+"><option value='I' selected>Inactive</option><option value='A'>Active</option></select>";
				     //        	}
				     //        	else{
				     //        		return "<select id="+full.nci_projects_id+"><option value='A' selected>Active</option><option value='I'>Inactive</option></select>";
				     //            }
				     //        },this)
				    	// }

				    ],

			        destroy: true,
          lengthMenu: [[-1], ['ALL']],
          scrollY: '80vh',
          scrollCollapse: true,
          dom: ' <"datatable_search_patient col-md-12"f>rt<"datatable_Information col-md-12"i>'// <"datatable_Length col-md-12"l><"datatable_Pagination col-md-12"p><"clear">'

        })
        $('#projects_overview tbody').on('click', 'tr', _.bind(function (e) {
          // window.tst=$(e.target);
          if (!$(e.target).is('select')) {
            if (this.experiments) {
              this.experiments.close()
            }
            this.experiments = new Experiments({
              admin: this.is_admin,
              domain: this.domain,
              domain_ws: this.domain_ws,
              project_id: e.currentTarget.id,
              probes: this.probes,
              pi_id: e.currentTarget.getAttribute('pid'),
              mappingAttrReserve: this.mappingAttrReserve
            })
            $('#PUMA').html(this.experiments.el)
          }
        }, this))
      }, this))
    })
    return this
  },
  renderDeletionAlert: function (e) {
    $('#deleteProjectAlert').html(AlertTemplate({
      deleteProject: e.currentTarget.parentElement.parentElement.id
    }))
    $('#deleteProjectAlert').show();
    $('.close').on('click', _.bind(function () {
      $('#deleteProjectAlert').hide();
    }, this));
    $('.cancel').on('click', _.bind(function () {
      $('#deleteProjectAlert').hide();
    }, this));
  },
  removeProject: function (e) {
    $.ajax({
      url: this.domain + 'api/v1/projects/delete/' +
			     e.currentTarget.getAttribute('project-id'),
      type: 'DELETE',
      xhrFields: {
			    withCredentials: true
      },
	    success: _.bind(function (res) {
	    	if (!res.err) {
          $('.alert-success').empty();
          $('.alert-success').append('<li>' + res.msg + '</li>');
          $('.alert-success').fadeTo('slow', 0.8).delay(5000).slideUp(500)
	    		this.render();
	    	} else {
          $('#deleteProjectAlert .error').empty();
          $('#deleteProjectAlert .error').append('Please delete all experiments under this project first.');
	    		// this.$('.removeErr').tooltip('enable')
       //    this.$('.removeErr').tooltip('show')
       //    setTimeout(_.bind(function () {
       //      this.$('.removeErr').tooltip('hide')
       //    }, this), 3000)
       //    this.$('.removeErr').tooltip('disable')
	    	}
	    }, this)
    })
  },
  editProject: function (e) {
    this.editProject_protocols = [];
    this.editProject_protocols_names = [];
    $('#editProject_name').val($(e.currentTarget).attr('project_name'));
    $('#editStatus').val($(e.currentTarget).parent().parent().attr('status'));
    $('#editPi_id').val($(e.currentTarget).attr('pi_id'));
    this.editProjectProtocolsTable = $('#editProjectProtocolsTable').DataTable({
 			drawCallback: function (settings) {
        $('#editProjectProtocolsTable thead').remove()
      },
 			data: this.protocols.toJSON(),
 			rowId: 'id',
		    columns: [{
            	data: 'name'
	    	}, {
            	data: 'short_name'
	    	}],
		    destroy: true,
      lengthMenu: [[-1], ['ALL']],
      scrollY: '50vh',
      scrollCollapse: true,
      dom: 'rt'
 		})
    this.currentEdit_project_id = $(e.currentTarget).attr('project_id')
    this.currentEdit_project_name = $(e.currentTarget).attr('project_name')
    this.currentEdit_project_pi_id = $(e.currentTarget).attr('pi_id')
    this.currentEdit_project_status = $(e.currentTarget).attr('status')
    if ($(e.currentTarget).attr('protocol_category_id') === 'null') {
      this.editProject_protocols = []
    } else {
      this.editProject_protocols = $(e.currentTarget).attr('protocol_category_id').split(',')
      for (let a = 0; a < this.editProject_protocols.length; a++) {
        this.editProjectProtocolsTable.$('#' + this.editProject_protocols[a]).addClass('selected')
      }
    }
    if ($(e.currentTarget).attr('protocol_category_name') === 'null') {
      this.editProject_protocols_names = []
    } else {
      this.editProject_protocols_names = $(e.currentTarget).attr('protocol_category_name').split(',')
    }
    $('#editProjectProtocolsTable tbody').off()
    $('#editProjectProtocolsTable tbody').on('click', 'tr', _.bind(function (e) {
      if ($(e.currentTarget).hasClass('selected')) {
        $(e.currentTarget).removeClass('selected')
        this.editProject_protocols.splice(this.editProject_protocols.indexOf(e.currentTarget.id), 1)
        this.editProject_protocols_names.splice(this.editProject_protocols_names.indexOf(e.currentTarget.cells[1].textContent), 1)
      } else {
        $(e.currentTarget).addClass('selected')
        this.editProject_protocols.push(e.currentTarget.id)// make sure parent is not depulicate?
        this.editProject_protocols_names.push(e.currentTarget.cells[1].textContent)
      }
      console.log(this.editProject_protocols)
      console.log(this.editProject_protocols_names)
    }, this))
    // this.currentEdit_project_protocol_category_id = $(e.currentTarget).attr('status');
    // this.currentEdit_project_project_protocols_names = $(e.currentTarget).attr('status');

    this.$('#editProject').show()
    this.$('.close').on('click', _.bind(function () {
 			this.$('#editProject').hide()
 		}, this))
 		this.$('.cancel').on('click', _.bind(function () {
 			this.$('#editProject').hide()
 		}, this))
  },
  _edit_project: function () {
    var newProjectData = new FormData()
    newProjectData.append('project_id', this.currentEdit_project_id)
    newProjectData.append('name', $('#editProject_name').val())
    newProjectData.append('pi_id', $('#editPi_id').val())
    newProjectData.append('status', $('#editStatus').val())
    newProjectData.append('protocol_category_id', JSON.stringify(this.editProject_protocols))
    newProjectData.append('project_protocols_names', JSON.stringify(this.editProject_protocols_names))

    $.ajax({
      url: this.domain + 'api/v1/projects/edit',
      type: 'PUT',
      data: newProjectData,
      processData: false, // important
      contentType: false, // important
      dataType: 'json',
      xhrFields: {
			  withCredentials: true
      },
		    success: _.bind(function (res) {
		    	if (!res.err) {
		    		// console.log(res)
		    		$('#editProject').hide()
		    		eventsBus.trigger('addNewProject')
		    		$('.alert-success').empty()
		    		$('.alert-success').html(res.result)
		    		$('.alert-success').fadeTo('slow', 0.8).delay(5000).slideUp(500)
		    	} else {
		    		$('.alert-danger').empty()
		    		for (let a = 0; a < res.errors.length; a++) {
		    			$('.alert-danger').append('<li>' + res.errors[a].msg + '</li>')
		    		}
		    		$('.alert-danger').fadeTo('slow', 0.8).delay(5000).slideUp(500)
		    	}
		    })
    })
  }
})

export default projects
