import $ from "jquery";
import _ from "underscore";
import Backbone from "backbone";
import Protocol_groups_collection from '../../collections/protocols/protocol_group';
import Protocol_category from './protocol_category';

import View from '../View';
import ProtocolGroupsTable from '../../templates/protocols/ProtocolGroupsTable.pug'
var protocol = View.extend({
	events:{
		'click #protocolGroup tbody tr':'protocalUnderGroup'
	},
	initialize(setting){
		this.$el.html(ProtocolGroupsTable());
		this.is_admin = setting.admin;
		this.domain=setting.domain;
		this.probes=setting.probes;
		this.users = setting.users;
		this.mappingAttrReserve = setting.mappingAttrReserve;
		this.protocol_groups_collection = new Protocol_groups_collection({
			domain:this.domain
		});
		this.render();
	},
	render(){
		this.protocol_groups_collection.fetch({
			xhrFields: {
				  withCredentials: true							// override ajax to send with credential
			},
			success:(_.bind(function(res){
				console.log(res.toJSON());
				this.protocolGroupTable = $('#protocolGroup').DataTable({
						data:res.toJSON(),
					    rowId: 'id',
					    columns: [
					    	/*{
					    		orderable:false,
					    		"targets": 0,
					            "render":_.bind(function ( data, type, full, meta ) {
					            	return "<div style='height:10px;width:10px;background:"+full.color+"'></div>"
					            },this)
					    	},*/
					    	{
					    		data:'name'
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
	protocalUnderGroup(e){
		console.log(e.currentTarget.id)
		$(e.currentTarget).parent().children().removeClass('selected');
		$(e.currentTarget).addClass('selected');
		if(this.protocol_category){
			this.protocol_category.close();
		}
		this.protocol_category = new Protocol_category({
			domain:this.domain,
			users:this.users,
			admin:this.is_admin,
			probes:this.probes,
			protocolGroupid: e.currentTarget.id,
			mappingAttrReserve:this.mappingAttrReserve
		});
		$('.protocolView').html(this.protocol_category.el);
		this.protocol_category.render();

	}
});

export default protocol;