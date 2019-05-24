import View from '../View';
import _ from 'underscore';
import ExperimentDocContentTemplate from '../../templates/experiments/experimentDocContent.pug';
import ExperimentDocCollection from '../../collections/experiments/experimentDoc';
var experimentDocContent = View.extend({
	events:{
		'change #upload':'uploadSubmit'
	},
	initialize(setting){
		this.experiment_id=setting.experiment_id;
		this.is_admin=setting.admin;
		this.domain = setting.domain;
		this.$el.html(ExperimentDocContentTemplate({
			admin:this.is_admin
		}));
		this.experimentDocCollection =new ExperimentDocCollection({
			domain : this.domain,
			experiment_id : this.experiment_id
		});
	},
	render(){
		this.experimentDocCollection.fetch({
			xhrFields: {
				  withCredentials: true							// override ajax to send with credential
			},
			success:_.bind(function(res){
				console.log(res);
				this.experimentDocUnderExperimentTable = $('#experimentDocUnderExperiment').DataTable({
		 	
		 			data:res.toJSON(),
		 			rowId:'id',
				    columns: [
				    	{
			            	"targets": 0,
			            	"render": _.bind(function ( data, type, full, meta ) {
			            		return '<a href="'+full.path+'" >'+full.name+'</a>';
			            	})
				    	},
				    	{
			            	data:'created'
				    	},
				    	{
			            	data:'size'
				    	}

				    ],
				    destroy: true,
					"lengthMenu":[[-1],['ALL']],
					"scrollY": "400px",
					//"scrollX": "100px",
					"scrollCollapse": true,
					"dom":'rt',
					"autoWidth":true
		 		});
			},this)
		});
		
		return this;
	},
	uploadSubmit(){
		var uploadfile = new FormData();
		uploadfile.append('experiment_id',this.experiment_id)
		uploadfile.append('SRAC_file',$('#upload')[0].files[0])

		$.ajax({
				url:this.domain+"api/v1/experiment_doc/upload",
				type:"POST",
				data:uploadfile,
				processData: false, // important
				contentType: false, // important
				dataType : 'json',
				xhrFields: {
				  withCredentials: true
				},
			    success:_.bind(function(res){
			    	if(!res.err){
			    		this.render();
			    	}else{
			    		console.log(res.errors)
			    	}
			    	
			    },this)
			});
	}
});
export default experimentDocContent;