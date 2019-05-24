import $ from "jquery";
import _ from "underscore";
import View from '../View';
import MappingTemplate from "../../templates/mapping/MappingTemplate.pug";
import UnmapCollection from "../../collections/mapping/unmapCollection";
import AllPatientsCollection from "../../collections/mapping/allPatientsCollection";

import Projects_overview_collection from '../../collections/projects/projects_overview';
import '../../stylesheets/mapping/mapping.styl';
import SelectedProject from './selectedProject';
import eventsBus from '../../eventsBus';
var mapping = View.extend({
	events:{
		'click #unmapped tbody tr':'unmappedRender',
		'click #allpatients tbody tr':'allpatientsRender',
		'click #switchToAllPatients':'switchToAllPatients',
		'click #Link':function(){eventsBus.trigger('Link')},
		'click #DeLink':function(){eventsBus.trigger('DeLink')},
		'click #switchToUnmappedPatients':'switchToUnmappedPatients'
	},
	initialize(setting){
		this.domain=setting.domain;
		this.$el.html(MappingTemplate());
		this.probes=setting.probes;
		this.preSelectProject=setting.preSelectProject;
		this.preSelectExp=setting.preSelectExp;
		
		this.unmapCollection = new UnmapCollection({
			domain: this.domain
		});
		this.allPatientsCollection = new AllPatientsCollection({
			domain: this.domain
		});
		this.projects_overview_collection = new Projects_overview_collection({
			domain:this.domain
		});
		this.unmappedTableRender();
		this.allPatientsTableRender();
		this.projectsTableRender();
		console.log('eventsBus:');
		console.log(eventsBus._events);
	},
	unmappedTableRender(){

		this.unmapCollection.fetch({
			xhrFields: {
				  withCredentials: true							// override ajax to send with credential
			},
			success:_.bind(function(res){
			//	console.log(res.toJSON());
			this.needMapParents=[];
			if(res.toJSON()[0].error!='No more new patients'){
				this.unmapped_table = $('#unmapped').DataTable({
					language:{
				        searchPlaceholder: "Search patient"
				    },
				    data:res.toJSON(),
				    rowId: 'id',
				    columns: [
				    	{
				    		data:"pat_name"	
				    	},
				    	{
				    		data:"pat_mrn"	
				    	}
				    ],
				    destroy: true,
					"lengthMenu":[[-1],['ALL']],
					"scrollY": "80vh",
					"scrollCollapse": true,
					"dom":'<"umppat"f>rt'//<"datatable_addUnMapped_button col-md-6"B>'
				});
			}else{
				this.participantsTable = $('#unmapped').DataTable({
						data:res.toJSON(),
						columns: [
					    	{
					    		data:'error'
					    	},
					    	{
					    		data:'error'
					    	}
					    	],
					    destroy: true,
						"lengthMenu":[[-1],['ALL']],
						"scrollY": "80vh",
						"scrollCollapse": true,
						"dom":'rt'
					})
			}

			},this)
		});
		return this;
	},
	allPatientsTableRender(){
		this.allPatientsCollection.fetch({
			xhrFields: {
				  withCredentials: true							// override ajax to send with credential
			},
			success:_.bind(function(res){
			//	console.log(res.toJSON());
			this.allMapped_table = $('#allpatients').DataTable({
				language:{
			        searchPlaceholder: "Search patient"
			    },
			    data:res.toJSON(),
			    rowId: 'id',
			    columns: [
			    	{
			    		data:"pat_name"	
			    	},
			    	{
			    		data:"pat_mrn"	
			    	}
			    ],
			    destroy: true,
				"lengthMenu":[[-1],['ALL']],
				"scrollY": "80vh",
				"scrollCollapse": true,
				"dom":'<"allpat"f>rt'//<"datatable_addUnMapped_button col-md-6"B>'
			});
			// $('.dataTables_scrollHeadInner').css('width', '100%');
			// $('.dataTables_scrollHeadInner').children().css('width', '100%');

			},this)
		});
		
		return this;
	},
	projectsTableRender(){
		this.projects_overview_collection.fetch({
			xhrFields: {
				  withCredentials: true							// override ajax to send with credential
			},
			success:(_.bind(function(res){
				console.log(res.toJSON())
				this.selectedProject_table = $('#selectedProject').DataTable({
					language:{
				        searchPlaceholder: "Search projects/pi"
				    },
				    data:res.toJSON(),
				    rowId: 'nci_projects_id',
				    'createdRow': function( row, data, dataIndex ) {
					      $(row).attr('pid', data.nci_projects_pi_id);
					},
				    columns: [
				    	{
				    		data:"nci_projects_id"	
				    	},
				    	{
				    		data:"nci_projects_name"	
				    	},
				    	{
				    		"targets": 0,
				    		"render": function ( data, type, full, meta ) {
				            	return full.Pi_Last_name + ',' + full.Pi_First_name
				            }
				    	}
				    ],
				    destroy: true,
					"lengthMenu":[[-1],['ALL']],
					"scrollY": "35vh",
					"scrollCollapse": true,
					"dom":'<"pi"f>rt'
				});
				if(this.preSelectProject){
					//window.test=$('#selectedProject #'+this.preSelectProject)
					$('#selectedProject #'+this.preSelectProject).addClass('selected');
					if(this.selectedProject){
						this.selectedProject.close();
					}
					this.selectedProject = new SelectedProject({
						users:this.users,
						domain:this.domain,
						selectedProjectId:this.preSelectProject,
						participantsViewel:$('.experientParticipants'),
						parent:this,
						probes:this.probes,
						pi_id:$('#selectedProject #'+this.preSelectProject).attr('pid'),
						unmappedParentElement:$('#unmapped'),
						allParentElement:$('#allpatients'),
						preSelectExp:this.preSelectExp
					});
					$('.selectedExperiment').html(this.selectedProject.el);	
					$('#projectsCollapseTitle').html('Projects ('+$('#selectedProject #'+this.preSelectProject)[0].innerText+')')
					$('.experientParticipants').empty();
				}
				$('#selectedProject tbody').on('click','tr',_.bind(function(e){
					$(e.currentTarget).parent().children().removeClass('selected');
					$(e.currentTarget).addClass('selected');
					
					if(this.selectedProject){
						this.selectedProject.close();
					}
					
					$('#projectsCollapseTitle').html('Projects ('+e.currentTarget.innerText+')')
					this.selectedProject = new SelectedProject({
						users:this.users,
						domain:this.domain,
						selectedProjectId:e.currentTarget.id,
						participantsViewel:$('.experientParticipants'),
						parent:this,
						probes:this.probes,
						pi_id:e.currentTarget.getAttribute('pid'),
						unmappedParentElement:$('#unmapped'),
						allParentElement:$('#allpatients')
					});
					$('.selectedExperiment').html(this.selectedProject.el);	
					$('.experientParticipants').empty();
				},this));
				$('#projectsCollapse').on('show.bs.collapse', function () {
					$('#projectsCollapseHeader').addClass('active');
				});

				$('#projectsCollapse').on('hide.bs.collapse', function () {
					$('#projectsCollapseHeader').removeClass('active');
				});
			},this))
		});

		return this;
	},
	unmappedRender(e){
		if($(e.currentTarget).hasClass('selected')){
			$(e.currentTarget).removeClass('selected');
			this.needMapParents.splice(this.needMapParents.indexOf(e.currentTarget.id),1);
		}else{
			$(e.currentTarget).addClass('selected');
			this.needMapParents.push(e.currentTarget.id);//make sure parent is not depulicate?
		}
		//console.log(this.needMapParents);
		//console.log('from mapping');
		eventsBus.trigger('needMapParents',this.needMapParents);
	},
	allpatientsRender(e){
		if($(e.currentTarget).hasClass('selected')){
			$(e.currentTarget).removeClass('selected');
			this.needMapParents.splice(this.needMapParents.indexOf(e.currentTarget.id),1);
		}else{
			$(e.currentTarget).addClass('selected');
			this.needMapParents.push(e.currentTarget.id);//make sure parent is not depulicate?
		}
		//console.log(this.needMapParents);
		//console.log('from mapping');
		eventsBus.trigger('needMapParents',this.needMapParents);
	},
	switchToAllPatients(){

		$('#unmapped').children().children().removeClass('selected');
		this.needMapParents=[];
		eventsBus.trigger('needMapParents',this.needMapParents);
		$('.allpatients').show();
		$('.diff').hide();
		this.allMapped_table.columns.adjust();
	},
	switchToUnmappedPatients(){

		$('#allpatients').children().children().removeClass('selected');
		this.needMapParents=[];
		eventsBus.trigger('needMapParents',this.needMapParents);
		$('.diff').show();
		$('.allpatients').hide();
		this.unmapped_table.columns.adjust();
	},
	onClose: function(){			// Delete children view events from bus
		eventsBus.off("needMapParents");
		eventsBus.off("DeLink");
		eventsBus.off("Link");
	}
});

export default mapping;