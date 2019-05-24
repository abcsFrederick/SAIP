import $ from "jquery";
import _ from "underscore";
import Backbone from "backbone";
import Protocol_category_collection from '../../collections/protocols/protocol_category';

import Protocol_projects from './protocol_projects';

import View from '../View';
import ProtocolsTable from '../../templates/protocols/ProtocolsTable.pug'
var protocol = View.extend({
	events:{
		'click #protocol tbody tr':'projectsUnderProtocol'
	},
	initialize(setting){
		this.$el.html(ProtocolsTable());
		this.is_admin = setting.admin;
		this.domain=setting.domain;
		this.probes=setting.probes;
		this.users = setting.users;
		this.mappingAttrReserve = setting.mappingAttrReserve;
		this.protocolGroupid = setting.protocolGroupid;
		this.protocol_category_collection = new Protocol_category_collection({
			domain:this.domain,
			protocolGroupid:this.protocolGroupid
		});
	},
	render(){
		this.protocol_category_collection.fetch({
			xhrFields: {
				  withCredentials: true							// override ajax to send with credential
			},
			success:(_.bind(function(res){
				console.log(res.toJSON());
				this.protocol = $('#protocol').DataTable({
						data:res.toJSON(),
					    rowId: 'id',
					    columns: [
					    	/*{
					    		orderable:false,
					    		"targets": 0,
					            "render":_.bind(function ( data, type, full, meta ) {
					            	return "<div style='width:10px;height:10px;background:"+full.color+"'></div>"
					            },this)
					    	},*/
					    	{
					    		data:'name'
					    	},
					    	{
					    		data:'short_name'
					    	}
					    ],
					    destroy: true,
						"lengthMenu":[[-1],['ALL']],
						"scrollY": "500px",
						"scrollCollapse": true,
						"dom":'rt'
				})
			},this))
		})
	},
	projectsUnderProtocol(e){
		$(e.currentTarget).parent().children().removeClass('selected');
		$(e.currentTarget).addClass('selected');
		if(this.protocol_projects){
			this.protocol_projects.close();
		}
		this.protocol_projects = new Protocol_projects({
			probes:this.probes,
			domain:this.domain,
			admin:this.is_admin,
			users:this.users,
			protocolid: e.currentTarget.id,
			mappingAttrReserve:this.mappingAttrReserve
		});
		$('.protocolProjectsView').html(this.protocol_projects.el);
		this.protocol_projects.render();
	}
});

export default protocol;