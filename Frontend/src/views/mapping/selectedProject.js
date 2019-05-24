import $ from "jquery";
import _ from "underscore";
import View from '../View';
import ExperimentsCollection from '../../collections/experiments/experiments_overview';
import selectedProjectTemplate from "../../templates/mapping/SelectedProject.pug";

import participantsCollection from '../../collections/participants/participants';
import SelectedExperiment from './selectedExperiment';

import eventsBus from '../../eventsBus';
var selectedProject = View.extend({
	events:{
		'click #selectedExperiment tbody tr':'selectedExperimentRender',
		'click #NewExperiments':'NewExperiments',
		'click #create_experiment_mapping':'create_experiment'
	},
	initialize(setting){
		this.pi_id=setting.pi_id;
		this.probes=setting.probes;
		
		this.$el.html(selectedProjectTemplate({
			Probes:this.probes.toJSON()
		}));
		this.preSelectExp=setting.preSelectExp;
		this.selectedProjectId = setting.selectedProjectId;
		this.domain = setting.domain;
		this.experimentsCollection =new ExperimentsCollection({
			domain : this.domain,
			project_id : this.selectedProjectId
		});
		this.participantsViewel = setting.participantsViewel;
		this.mapping = setting.parent;
		this.unmappedParentElement = setting.unmappedParentElement;
		this.allParentElement = setting.allParentElement;
		//console.log(this.parentUnmappedElement);
		
		this.render();

	},
	render(){
		this.experimentsCollection.fetch({
			xhrFields: {
				  withCredentials: true							// override ajax to send with credential
			},
			success:_.bind(function(res){

				this.selectedProject_table = $('#selectedExperiment').DataTable({

				    data:res.toJSON(),
				    rowId: 'id',
				    columns: [
				    	{
				    		data:"id"	
				    	},
				    	{
				    		data:"title"	
				    	}
				    ],
				    destroy: true,
					"lengthMenu":[[-1],['ALL']],
					"scrollY": "40vh",
					"scrollCollapse": true,
					"dom":' rt'
				});
				console.log('haha')
				console.log(this.preSelectExp)
				if(this.selectedExperiment){
					this.selectedExperiment.close();
				}
				if(this.preSelectExp){
					$('#selectedExperiment #'+this.preSelectExp).addClass('selected');
					
					$('#experimentsCollapseTitle').html('Experiments ('+$('#selectedExperiment #'+this.preSelectExp)[0].innerText+')')
					
					if(this.selectedExperiment){
						this.selectedExperiment.close();
					}
					this.selectedExperiment = new SelectedExperiment({
						users:this.users,
						domain:this.domain,
						experiment_id:this.preSelectExp,
						parent:this.mapping,
						allParentElement:this.allParentElement
					});
					this.participantsViewel.html(this.selectedExperiment.el);
				}
				$('#experimentsCollapse').on('show.bs.collapse', function () {
					$('#experimentsCollapseHeader').addClass('active');
				});

				$('#experimentsCollapse').on('hide.bs.collapse', function () {
					$('#experimentsCollapseHeader').removeClass('active');
				});
			},this)
		});
		return this;
	},
	selectedExperimentRender(e){

		this.unmappedParentElement.children().children().removeClass('selected');
		this.allParentElement.children().children().removeClass('selected');
		//window.tst=$(e.currentTarget)
		$(e.currentTarget).parent().children().removeClass('selected');
		$(e.currentTarget).addClass('selected');
	
		$('#experimentsCollapseTitle').html('Experiments ('+e.currentTarget.innerText+')')
		if(this.selectedExperiment){
			this.selectedExperiment.close();
		}
		this.selectedExperiment = new SelectedExperiment({
			users:this.users,
			domain:this.domain,
			experiment_id:e.currentTarget.id,
			parent:this.mapping,
			allParentElement:this.allParentElement
		});
		this.participantsViewel.html(this.selectedExperiment.el);
	},
	NewExperiments(e){
		$('#createExperiment_mapping').show();
		$('#experiment_name_mapping').val("");
		$('#probe_id_mapping').val("");
		$('#description_mapping').val("");
 		$('.close').on('click',function(){
 			$('#createExperiment_mapping').hide();
 		});
 		$('.cancel').on('click',function(){
 			$('#createExperiment_mapping').hide();
 		});
	},
	create_experiment(){
		var newExperimentData = new FormData();
		newExperimentData.append('project_id',this.selectedProjectId);
		newExperimentData.append('title',$('#experiment_name_mapping').val());
		newExperimentData.append('description',$('#description_mapping').val());
		newExperimentData.append('pi_id',this.pi_id);
		newExperimentData.append('probe_id',$('#probe_id_mapping').val());
		//console.log(this.pi_id)

		$.ajax({
			url:this.domain+"api/v1/experiment_add",
			type:"POST",
			data:newExperimentData,
			processData: false, // important
			contentType: false, // important
			dataType : 'json',
			xhrFields: {
			  withCredentials: true
			},
		    success:_.bind(function(res){
		    	if(!res.err){
		    		$('#createExperiment_mapping').hide();
		    		this.render();
		    	}else{
		    		console.log(res.errors)
		    	}
		    	
		    },this)
		});
	},
	onClose: function(){			// Delete children view events from bus
		eventsBus.off("needMapParents");
		eventsBus.off("DeLink");
		eventsBus.off("Link");
	}
	
});

export default selectedProject;