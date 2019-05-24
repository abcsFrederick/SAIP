import $ from "jquery";
import _ from "underscore";
import Backbone from "backbone";
import Protocol_projects_collection from '../../collections/protocols/Protocol_projects';
import eventsBus from '../../eventsBus';
import View from '../View';
import ProtocolProjectsTable from '../../templates/protocols/ProtocolProjectsTable.pug';
import Experiments from '../experiments/experiments';
var protocol = View.extend({

	initialize(setting){
		this.$el.html(ProtocolProjectsTable());
		this.is_admin = setting.admin;
		this.domain=setting.domain;
		this.probes=setting.probes;
		this.users = setting.users;
		this.protocolid = setting.protocolid;
		this.mappingAttrReserve = setting.mappingAttrReserve;
		this.Protocol_projects_collection = new Protocol_projects_collection({
			domain:this.domain,
			protocolid:this.protocolid
		});
	},
	render(){
		this.Protocol_projects_collection.fetch({
			xhrFields: {
				  withCredentials: true							// override ajax to send with credential
			},
			success:(_.bind(function(res){
				console.log(res.toJSON());
				this.protocolProjects = $('#protocolProjects').DataTable({
						data:res.toJSON(),
					    rowId: 'project_id',
					    'createdRow': function( row, data, dataIndex ) {
					      $(row).attr('pid', data.pi_id);
					},
					    columns: [
					    	{
					    		data:'project_id'
					    	},
					    	{
					    		data:'protocol_name'
					    	}
					    ],
					    destroy: true,
						"lengthMenu":[[-1],['ALL']],
						"scrollY": "500px",
						"scrollCollapse": true,
						"dom":'rt'
				});
				$('#protocolProjects tbody').on('click','tr',_.bind(function(e){
    			//	eventsBus.trigger('ShowExperiments',e.currentTarget.id);
    			//	console.log(this.$el.parent().parent().parent());
    			//	window.test22=this.$el.parent().parent().parent();
    			///* !!Do Element before close!! *///
    				this.playground=this.$el.parent().parent().parent().parent().parent();
    				$(this.playground.children().children().children()[0]).children().addClass('active')
		 			$(this.playground.children().children().children()[3]).children().removeClass('active')	//index 3 is protocol
    				if(this.experiments){
						this.experiments.close();
					}
					this.experiments = new Experiments({
						pi_id:e.currentTarget.getAttribute('pid'),
						users:this.users,
						probes:this.probes,
						admin:this.is_admin,
						domain:this.domain,
						project_id:e.currentTarget.id,
						mappingAttrReserve:this.mappingAttrReserve
					});

					this.$el.parent().parent().parent().html(this.experiments.el)
					
		 			this.mappingAttrReserve.attr('preselectproject',e.currentTarget.id)
					this.mappingAttrReserve.removeAttr('preselectexp')
		 		//	window.test22=$(this.playground.children().children().children()[4]);
		 			
				},this));
			},this))
		})
	}
});

export default protocol;