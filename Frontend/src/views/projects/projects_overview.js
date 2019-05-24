import $ from "jquery";
import _ from "underscore";
import Backbone from "backbone";
import 'datatables.net';
import 'datatables.net-buttons';
import Projects_overview_collection from '../../collections/projects/projects_overview';
import Projects_overview_model from '../../collections/projects/projects_overview';
import Projects_overview_templates from '../../templates/projects/projects_overview.pug';
import FieldsTemplates from '../../templates/projects/projects_overview_pi.pug'
//import Project_add_model from '../../models/projects/project_add';

import Experiments from '../experiments/experiments';
import '../../stylesheets/projects/projects_overview.styl';
import View from '../View';
import UsersCollection from '../../collections/users/users_overview';
import eventsBus from '../../eventsBus';

var projects = View.extend({
	events:{
		'click #create_project':'create_project'
	},
	initialize(setting){
		this.is_admin = setting.admin;
		this.LoginAdminUser = setting.LoginAdminUser;
		this.domain=setting.domain;
		this.domain_ws = setting.domain_ws;
		this.user_id=setting.user_id;
		this.users=setting.users;
		this.probes=setting.probes;
		this.mappingAttrReserve = setting.mappingAttrReserve;
		this.protocols = setting.protocols;
		this.projects_overview_collection = new Projects_overview_collection({
			domain:this.domain
		});
		this.PI=[];
		this.project_protocols=[];
		this.project_protocols_names=[];

		this.users_and_permissions=[];
		this.selectedUserIdAll = [];
		if(this.is_admin){
			_.each(this.users.toJSON(),_.bind(function(row){
				if(row.is_pi){
					this.PI.push(row);
				}
			},this));
			this.render();
		}else{
			this.endUserRender();
		}
		
	/*	this.project_add_model = new Project_add_model({
			domain:this.domain
		});
	*/	
	},
	render(){
		this.projects_overview_collection.fetch({
			data:$.param(this.user_id),
			xhrFields: {
				  withCredentials: true							// override ajax to send with credential
			},
			success:(_.bind(function(res){
				// console.log(this.users.toJSON().sort(this.dynamicSort("first_name")));

				if(this.is_admin){
					this.$el.html(Projects_overview_templates({
						admin:this.is_admin,
						PI:this.users.toJSON().sort(this.dynamicSort("first_name")),
						LoginAdminUser:this.LoginAdminUser,
						Probes:this.probes.toJSON()
					}));
				}else{
					this.$el.html(Projects_overview_templates({
						admin:this.is_admin
					}));
				}
				this.projects_overview_table = $('#projects_overview').DataTable({
					language: {
				        searchPlaceholder: "Project/PI/Short name"
				    },
				    data:res.toJSON(),
				    rowId: 'nci_projects_id',
				    'createdRow': function( row, data, dataIndex ) {
						$(row).attr('pid', data.nci_projects_pi_id);
						$(row).attr('status', data.projects_status);
						if(data.projects_status==='I'){
							$(row).addClass('hide');
						}
					},
				    columns: [
				    	{
				    		data:"nci_projects_id"	//	nci_projects_id
				    	},
				    	{
				    		data:'nci_projects_name'	//	nci_projects_name
				    	},	
				    	{
				    		"targets": 2,
				    		"render": function ( data, type, full, meta ) {
				            	return full.Pi_Last_name + ',' + full.Pi_First_name
				            }
				    	},
				    	{
				    		data:'number_of_experiments'	//	number_of_images
				    	},
				    	{
				    		data:'number_of_studies'	//	number_of_studies
				    	},
				    	{
				            "targets": -3,
				            "render": _.bind(function ( data, type, full, meta ) {
				            	if(typeof(full.short_name)=='string'){
				            		return full.short_name.replace(/null|[\[\]"]+/g,"");
				            	}
				            	else{
				            		return full.short_name
				            	}
				            },this)
				    	},
				    	{
				            "targets": -2,
				            "render": _.bind(function ( data, type, full, meta ) {
				            	if(typeof(full.nci_projects_created_at)=='string'){
				            		return full.nci_projects_created_at.slice(0,10);
				            	}
				            	else{
				            		return full.nci_projects_created_at
				            	}
				            },this)
				    	},
				    	{
			            	"orderable":false,
				            "targets": -1,
				            "render": _.bind(function ( data, type, full, meta ) {
				            	if (full.projects_status == "I")
				            	{
				            		return "<select id="+full.nci_projects_id+"><option value='I' selected>Inactive</option><option value='A'>Active</option></select>";
				            	}
				            	else{
				            		return "<select id="+full.nci_projects_id+"><option value='A' selected>Active</option><option value='I'>Inactive</option></select>";
				                }
				            },this)
				    	}
				    	
				    ],
				    "columnDefs": [
				        { "targets": [-1,4,3], "searchable": false }
				    ],
				    //"columnDefs": [ { "defaultContent": "-", "targets": "_all" } ]
				   // dom: 'Bfrtip',
    				buttons: [
    					{	
    						className:' btn btn-primary',
    						text: 'New Project',
    					 	action: _.bind(function (){
    					 		
    					 		console.log(this.protocols.toJSON());
    					 		$('#createProject').show();
    					 		$('#ProjectProtocolsTable').DataTable({
    					 			"drawCallback": function( settings ) {
									$("#ProjectProtocolsTable thead").remove(); },
    					 			data:this.protocols.toJSON(),
    					 			rowId:'id',
								    columns: [
								    	{
							            	data:'name'
								    	},
								    	{
							            	data:'short_name'
								    	},
								    ],
								    destroy: true,
									"lengthMenu":[[-1],['ALL']],
									"scrollY": "50vh",
									"scrollCollapse": true,
									"dom":'rt'
    					 		});
    					 		$('.close').on('click',function(){
    					 			$('#createProject').hide();
    					 		});
    					 		$('.cancel').on('click',function(){
    					 			$('#createProject').hide();
    					 		});
    					 		$('#ProjectProtocolsTable tbody').on('click','tr',_.bind(function(e){
    					 		//	window.test=e.currentTarget;
									if($(e.currentTarget).hasClass('selected')){
										console.log('has selected')
										$(e.currentTarget).removeClass('selected');
										this.project_protocols.splice(this.project_protocols.indexOf(e.currentTarget.id),1);
										this.project_protocols_names.splice(this.project_protocols_names.indexOf(e.currentTarget.cells[1].textContent),1);
									}else{
										console.log('no selected')
										$(e.currentTarget).addClass('selected');
										this.project_protocols.push(e.currentTarget.id);//make sure parent is not depulicate?
										this.project_protocols_names.push(e.currentTarget.cells[1].textContent);
									}
									console.log(this.project_protocols)
									console.log(this.project_protocols_names)
								},this));

								$('#ProjectUsersTable').DataTable({
    					 			"drawCallback": function( settings ) {
										$("#ProjectProtocolsTable thead").remove(); 
									},
    					 			data:this.users.toJSON(),
    					 			rowId:'id',
    					 			language: {
								        searchPlaceholder: "Name"
								    },
								    columns: [
								    	{
							            	"targets": 0,
							            	"render": _.bind(function ( data, type, full, meta ) {
							            		return full.last_name+','+full.first_name
							            	})
								    	},
								    	{
							            	"targets": 1,
							            	"orderable":false,
							            	"render": _.bind(function ( data, type, full, meta ) {
							            		return "<input type='checkbox' id='R_"+full.id+"'><a> </a>"//<input type='checkbox' id='W_"+full.id+"'>"	only give read premission
							            	})
								    	},
								    ],
								    "columnDefs": [
								        { "targets": [1], "searchable": false }
								    ],
								    destroy: true,
									"lengthMenu":[[-1],['ALL']],
									"scrollY": "35vh",
									"scrollCollapse": true,
									"dom":'<"datatable_search_userName col-md-12"f>rt'
    					 		});
    					 		$('#ProjectUsersTable tbody tr').on('click','input',_.bind(function(e){
    					 			
    					 			if(this.users_and_permissions.indexOf(e.currentTarget.id)!=-1)
    					 			{
    					 				this.users_and_permissions.splice(this.users_and_permissions.indexOf(e.currentTarget.id),1);
    					 				this.selectedUserTableRender(e.currentTarget.id);
    					 			}
    					 			else{
    					 				this.users_and_permissions.push(e.currentTarget.id);
    					 				//window.tt=e.currentTarget
    					 				this.selectedUserTableRender(e.currentTarget.id);
    					 			}
									console.log(this.users_and_permissions)
								},this));

								this.selectedUserTable = $('#ProjectSelectedUsersTable').DataTable({
									"dom":'rt',
									//"scrollY": "100%",
									"scrollY":"15vh",
									"scrollCollapse": true,
								});
							
    					 	},this)
    					},
    					{	
    						className:' btn btn-primary hide',
    						text: 'Active',
    						attr:  {
				                id: 'hideInactive'
				            },
    					 	action: _.bind(function (e,dt,index){
    					 		this.projects_overview_table.rows(function ( idx, data, node ) {
							        if(data.projects_status === 'I') 
							        {$(node).addClass('hide');}
							    });
    					 		// $.fn.dataTable.ext.search.push(
      							// 	function(settings, data, index) {
		    					// 		return $(dt.row(index).node()).attr('status') == "A";
		    					// 		//console.log($(dt.row(1).node()).attr('status'))
		    					// 	})
    					 		$('#showInactive').removeClass('hide');
    					 		$('#hideInactive').addClass('hide');
    					 	//	dt.draw();
    					 	},this)
    					},
    					{	
    						className:' btn btn-primary',
    						text: 'ALL',
    						attr:  {
				                id: 'showInactive'
				            },
    					 	action: _.bind(function (e,dt,index){
    					 		this.projects_overview_table.rows(function ( idx, data, node ) {
							        if($(node).hasClass('hide')) 
							        {$(node).removeClass('hide');}
							    });
    					 	//	$.fn.dataTable.ext.search.pop();
    					 		$('#hideInactive').removeClass('hide');
    					 		$('#showInactive').addClass('hide');
    							//dt.draw();
    					 	},this)
    					}
    				],
			        destroy: true,
					"lengthMenu":[[-1],['ALL']],
					"scrollY": "80vh",
					"scrollCollapse": true,
					"dom":' <"datatable_project_buttons col-md-6"B><"datatable_search_patient col-md-6"f>rt<"datatable_Information col-md-12"i>'//<"datatable_Length col-md-12"l><"datatable_Pagination col-md-12"p><"clear">'
		
				});
				$('#projects_overview tbody tr').on('change','select',_.bind(function(e){
					let newProjectStatus = new FormData();
					let status = e.currentTarget[e.currentTarget.selectedIndex].value;
					
					// if(status === 'I'){
					// 	$(e.currentTarget.parentElement.parentElement).addClass('hide');
					// }
					newProjectStatus.append('project_id',e.currentTarget.id);
					newProjectStatus.append('project_status',status);

					$.ajax({
						url:this.domain+"api/v1/project_status",
						type:"POST",
						data:newProjectStatus,
						processData: false, // important
						contentType: false, // important
						dataType : 'json',
						xhrFields: {
						  withCredentials: true
						},
					    success:_.bind(function(res){				
					    	console.log(res.errors);
					    	// this.render()	
					    },this)
					});
				},this));
				$('#projects_overview tbody').on('click','tr',_.bind(function(e){
					//window.tst=$(e.target);
					if(!$(e.target).is('select')){
						if(this.experiments){
							this.experiments.close();
						}
						this.experiments = new Experiments({
							users:this.users,
							admin:this.is_admin,
							domain:this.domain,
							domain_ws:this.domain_ws,
							project_id:e.currentTarget.id,
							probes:this.probes,
							pi_id:e.currentTarget.getAttribute('pid'),
							mappingAttrReserve:this.mappingAttrReserve
						});
						this.mappingAttrReserve.attr('preselectproject',e.currentTarget.id)
						this.mappingAttrReserve.removeAttr('preselectexp')
						$('#PUMA').html(this.experiments.el)
					}
				},this));
			},this))
		})
		return this;
	},
	selectedUserTableRender(selectedUser){
		console.log(selectedUser);
		let selectedUserId = parseInt(selectedUser.substr(2));
		// if(!this.selectedUserTable){
		// 	this.selectedUserTable = $('#ProjectSelectedUsersTable').DataTable({
		// 		"dom":'rt',
		// 		//"scrollY": "100%",
		// 		"scrollY":"15vh",
		// 		"scrollCollapse": true,
		// 	});
		// }
		
		let selectedUserRecord = this.users.toJSON().filter(x=>x.id===selectedUserId);
		if(this.selectedUserIdAll.indexOf(selectedUserId)!=-1)
		{
			this.selectedUserIdAll.splice(this.selectedUserIdAll.indexOf(selectedUserId),1);
			this.selectedUserTable.row("#selectedUser_"+selectedUserId).remove().draw(false);
			// unbind check event
			$('#selectedUser_R_'+selectedUserId).off();
		}
		else{
			this.selectedUserIdAll.push(selectedUserId);
			this.selectedUserTable.row.add([selectedUserRecord[0].last_name+','
				+selectedUserRecord[0].first_name,"<input type='checkbox' id='selectedUser_R_"+selectedUserId+"' checked><a> </a>"])
				.node().id = 'selectedUser_'+selectedUserId;
			this.selectedUserTable.draw( false );
			$('#selectedUser_R_'+selectedUserId).on('click',_.bind(function(e){
				console.log(e)
				// remove from selected user table
				this.selectedUserIdAll.splice(this.selectedUserIdAll.indexOf(selectedUserId),1);
				this.selectedUserTable.row("#selectedUser_"+selectedUserId).remove().draw(false);
				// remove from user selection table
				this.users_and_permissions.splice(this.users_and_permissions.indexOf('R_'+selectedUserId),1);
				$('#R_'+selectedUserId).prop("checked", false);

				// unbind check event
				$('#selectedUser_R_'+selectedUserId).off();
			},this))
		}
		this.selectedUserTable.columns.adjust();
	},
	create_project:function(){
		
		console.log($('#project_name').val());
		console.log($('#pi_id').val());
		console.log($('#status').val());
		// console.log($('#proposal').val());
		// console.log($('#requester').val());
		// console.log($('#authors').val());
		// console.log($('#collaborator').val());
		// console.log($('#collab_grant_num').val());
		// console.log($('#fund_project_id').val());
		// console.log($('#SRAC_number').val());
		//console.log($('#SRAC_file')[0].files);
		// console.log($('#SRAC_file')[0].files[0]);
		// console.log($('#est_costs').val());
		// console.log($('#probe_id').val());
		// console.log($('#miportal_id').val());
		console.log(this.users_and_permissions);
		console.log(this.project_protocols);
		console.log(this.project_protocols_names);
		//this.project_add_model.fetch()

		var newProjectData = new FormData();

		//newProjectData.append('SRAC_file',$('#SRAC_file')[0].files[0]);
		newProjectData.append('name',$('#project_name').val());
		newProjectData.append('pi_id',$('#pi_id').val());
		newProjectData.append('status',$('#status').val());
		// newProjectData.append('proposal',$('#proposal').val());

		// newProjectData.append('requester',$('#requester').val());
		// newProjectData.append('authors',$('#authors').val());
		// newProjectData.append('collaborator',$('#collaborator').val());
		// newProjectData.append('collab_grant_num',$('#collab_grant_num').val());
		// newProjectData.append('fund_project_id',$('#fund_project_id').val());
		// newProjectData.append('SRAC_number',$('#SRAC_number').val());
		// newProjectData.append('est_costs',$('#est_costs').val());
		//newProjectData.append('probe_id',$('#probe_id').val());

		//newProjectData.append('miportal_id',$('#miportal_id').val());
		newProjectData.append('users_and_permissions',JSON.stringify(this.users_and_permissions));
		newProjectData.append('protocol_category_id',JSON.stringify(this.project_protocols));
		newProjectData.append('project_protocols_names',JSON.stringify(this.project_protocols_names));

		$.ajax({
			url:this.domain+"api/v1/project_add",
			type:"POST",
			data:newProjectData,
			processData: false, // important
			contentType: false, // important
			dataType : 'json',
			xhrFields: {
			  withCredentials: true
			},
		    success:_.bind(function(res){
		    	if(!res.err){
		    		//console.log(res)
		    		$('#createProject').hide();
		    		eventsBus.trigger('addNewProject');
		    		$('.alert-success').empty();
		    		$('.alert-success').html(res.result);
		    		$('.alert-success').fadeTo('slow', 0.8).delay(5000).slideUp(500);
		    	}else{
		    		$('.alert-danger').empty();
		    		console.log(res.errors)
		    		for(let a=0;a<res.errors.length;a++){
		    			$('.alert-danger').append('<li>'+res.errors[a].msg+'</li>');
		    		}
		    		$('.alert-danger').fadeTo('slow', 0.8).delay(5000).slideUp(500);
		    	}
		    	
		    })
		});
		
	},
	dynamicSort(property) {
	    var sortOrder = 1;
	    if(property[0] === "-") {
	        sortOrder = -1;
	        property = property.substr(1);
	    }
	    return function (a,b) {
	        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
	        return result * sortOrder;
	    }
	},
	endUserRender(){
		this.projects_overview_collection.fetch({
			data:$.param(this.user_id),
			xhrFields: {
				  withCredentials: true							// override ajax to send with credential
			},
			success:(_.bind(function(res){
				console.log(res);
				
				this.$el.html(Projects_overview_templates({
					admin:this.is_admin
				}));
		
				this.projects_overview_table = $('#projects_overview').DataTable({
					language: {
				        searchPlaceholder: "Project/PI/Short name"
				    },
				    data:res.toJSON(),
				    rowId: 'nci_projects_id',
				    'createdRow': function( row, data, dataIndex ) {
					      $(row).attr('pid', data.nci_projects_pi_id);
					},
				    columns: [
				    	// {
				    	// 	data:"nci_projects_id"	//	nci_projects_id
				    	// },
				    	{
				    		data:'nci_projects_name'	//	nci_projects_name
				    	},	
				    	// {
				    	// 	"targets": 2,
				    	// 	"render": function ( data, type, full, meta ) {
				     //        	return full.Pi_Last_name + ',' + full.Pi_First_name
				     //        }
				    	// },
				    	{
				    		data:'number_of_experiments'	//	number_of_experiments
				    	},
				    	{
				    		data:'number_of_studies'	//	number_of_studies
				    	},
				    	{
				            "targets": -3,
				            "render": _.bind(function ( data, type, full, meta ) {
				            	if(typeof(full.short_name)=='string'){
				            		return full.short_name.replace(/null|[\[\]"]+/g,"");
				            	}
				            	else{
				            		return full.short_name
				            	}
				            },this)
				    	},
				    	{
				            "targets": -2,
				            "render": _.bind(function ( data, type, full, meta ) {
				            	if(typeof(full.nci_projects_created_at)=='string'){
				            		return full.nci_projects_created_at.slice(0,10);
				            	}
				            	else{
				            		return full.nci_projects_created_at
				            	}
				            },this)
				    	},
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
					"lengthMenu":[[-1],['ALL']],
					"scrollY": "80vh",
					"scrollCollapse": true,
					"dom":' <"datatable_search_patient col-md-12"f>rt<"datatable_Information col-md-12"i>'//<"datatable_Length col-md-12"l><"datatable_Pagination col-md-12"p><"clear">'
		
				});
				$('#projects_overview tbody').on('click','tr',_.bind(function(e){
					//window.tst=$(e.target);
					if(!$(e.target).is('select')){
						if(this.experiments){
							this.experiments.close();
						}
						this.experiments = new Experiments({
							admin:this.is_admin,
							domain:this.domain,
							domain_ws:this.domain_ws,
							project_id:e.currentTarget.id,
							probes:this.probes,
							pi_id:e.currentTarget.getAttribute('pid'),
							mappingAttrReserve:this.mappingAttrReserve
						});
						$('#PUMA').html(this.experiments.el)
					}
				},this));
			},this))
		})
		return this;
	}
});

export default projects;