import _ from 'underscore';
import Backbone from 'backbone';
import SearchListTemplate from '../templates/searchListTamplate.pug';
import '../stylesheets/searchListTamplate.styl';
import ShowList from './showList';
import Router from '../router';


var searchList = Backbone.View.extend({
	events:{
		'input .searchByName': function(){
			this.router.navigate('search/patient_name='+$('.searchByName').val(), true);
			this.render();
		},

		'click #submit':function(event){
			
			this.router.navigate('search', true);
			this.render()
		}
	
	},
	initialize(){
	//	this.event = _.extend({},Backbone.Events);
		this.today = new Date();
		this.month = this.today.getMonth() + 1; 
		if (this.month < 10) 
		    this.month = "0" + this.month;
		this.year = this.today.getFullYear();
		this.lastYear = this.year - 1;
		this.date = this.today.getDate();
		if (this.date < 10) 
		    this.date = "0" + this.date;
		this.showList = new ShowList({event:this.event});
		this.$el.html(SearchListTemplate({
				dateFrom: this.lastYear + '-' + this.month + '-' + this.date,
				dateTo: this.year + '-' + this.month + '-' + this.date
			}));
		this.router = new Router();
	
	//	this.listenTo(this.showList,'s:searchAgain',function(){
	//		console.log('should render');
	//	});
	//	this.listenTo(this.showList,'s:searchAgainss',function(){
	//		console.log('triggered from childview');
	//	});

	//	this.showList.trigger('s:searchAgain');
	},
	render(){
	//	console.log("render");

		this.showList = new ShowList({

			searchName: $('.searchByName').val(),
			dateFrom:$('#dateFrom').val(),
			dateTo:$('#dateTo').val()
		});

		this.$('.showList').empty();
		$('.showList').html(this.showList.patientStudyFetch().el);
		
		return this;
	},


});
export default searchList;