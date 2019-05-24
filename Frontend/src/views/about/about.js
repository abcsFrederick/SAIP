import $ from "jquery";
import _ from "underscore";
import Backbone from "backbone";
import aboutTemplate from '../../templates/about/about.pug';
import '../../stylesheets/about/about.styl';
var about = Backbone.View.extend({
	events:{
		'click #Projects-instruction':'projects',
		'click #Mapping-instruction':'mapping',
		'click #Users-instruction':'users',
		'click #Protocols-instruction':'protocols',
		'click #Probes-instruction':'probes'
	},
	initialize(setting){
		this.admin = setting.admin
		this.$el.html(aboutTemplate({admin:this.admin}));
		//$('.projectsContent').show();
	},
	projects(){
		$('.projectsContent').show();
		$('.mappingContent').hide();
		$('.usersContent').hide();
		$('.protocolsContent').hide();
		$('.probesContent').hide();
	},
	mapping(){
		$('.projectsContent').hide();
		$('.mappingContent').show();
		$('.usersContent').hide();
		$('.protocolsContent').hide();
		$('.probesContent').hide();
	},
	users(){
		$('.projectsContent').hide();
		$('.mappingContent').hide();
		$('.usersContent').show();
		$('.protocolsContent').hide();
		$('.probesContent').hide();
	},
	protocols(){
		$('.projectsContent').hide();
		$('.mappingContent').hide();
		$('.usersContent').hide();
		$('.protocolsContent').show();
		$('.probesContent').hide();
	},
	probes(){
		$('.projectsContent').hide();
		$('.mappingContent').hide();
		$('.usersContent').hide();
		$('.protocolsContent').hide();
		$('.probesContent').show();
	}
});

export default about;