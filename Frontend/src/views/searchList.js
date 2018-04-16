import _ from 'underscore';
import Backbone from 'backbone';
import SearchListTemplate from '../templates/searchListTamplate.pug';
import UpdateAndSelect from '../templates/updateAndSelect.pug';
import '../stylesheets/searchListTamplate.styl';
import ShowList from './showList';
import Router from '../router';
import event from '../event';

var searchList = Backbone.View.extend({
	events:{
		'change #timeRange': 'rangeSelect',

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
	//	this.lastYear = this.year - 1;
		this.date = this.today.getDate();

		this.weekAgo = new Date();
		this.weekAgo.setDate(this.weekAgo.getDate() - 7);

		this.weekAgoMonth = this.weekAgo.getMonth() + 1; 
		if (this.weekAgoMonth < 10) 
		    this.weekAgoMonth = "0" + this.weekAgoMonth;
		this.weekAgoYear = this.weekAgo.getFullYear();
		this.weekAgoDate = this.weekAgo.getDate();

		console.log(this.weekAgoYear+'-'+this.weekAgoMonth+'-'+this.weekAgoDate);
		if (this.date < 10) 
		    this.date = "0" + this.date;
		if (this.weekAgoDate < 10) 
		    this.weekAgoDate = "0" + this.weekAgoDate;

		this.showList = new ShowList({event:this.event});
	/*	this.$el.html(SearchListTemplate({
				dateFrom: this.weekAgoYear+'-'+this.weekAgoMonth+'-'+this.weekAgoDate,
				dateTo: this.year + '-' + this.month + '-' + this.date
			}));*/
		this.$el.html(UpdateAndSelect({
				dateFrom: this.weekAgoYear+'-'+this.weekAgoMonth+'-'+this.weekAgoDate,
				dateTo: this.year + '-' + this.month + '-' + this.date
			}));
		this.router = new Router();
		this.listenTo(event,'loading',this.loading);
		this.listenTo(event,'loadingFinish',this.loadingFinish);
	//	this.listenTo(this.showList,'s:searchAgain',function(){
	//		console.log('should render');
	//	});
	//	this.listenTo(this.showList,'s:searchAgainss',function(){
	//		console.log('triggered from childview');
	//	});

	//	this.showList.trigger('s:searchAgain');
	},
	rangeSelect(e){
		this.today = new Date();
		this.month = this.today.getMonth() + 1; 
		if (this.month < 10) 
		    this.month = "0" + this.month;
		this.year = this.today.getFullYear();
	//	this.lastYear = this.year - 1;
		this.date = this.today.getDate();

		this.weekAgo = new Date();
		this.weekAgo.setDate(this.weekAgo.getDate() - e.target.value);

		this.weekAgoMonth = this.weekAgo.getMonth() + 1; 
		if (this.weekAgoMonth < 10) 
		    this.weekAgoMonth = "0" + this.weekAgoMonth;
		this.weekAgoYear = this.weekAgo.getFullYear();
		this.weekAgoDate = this.weekAgo.getDate();

		console.log(this.weekAgoYear+'-'+this.weekAgoMonth+'-'+this.weekAgoDate);
		if (this.date < 10) 
		    this.date = "0" + this.date;
		if (this.weekAgoDate < 10) 
		    this.weekAgoDate = "0" + this.weekAgoDate;
		this.showList = new ShowList({event:this.event});
		window.child=this.$el.children().children().eq(0);
		this.$el.html(UpdateAndSelect({
				dateFrom: this.weekAgoYear+'-'+this.weekAgoMonth+'-'+this.weekAgoDate,
				dateTo: this.year + '-' + this.month + '-' + this.date
			}));
		$("#timeRange").val(e.target.value);
	},
	render(){
	//	console.log("render");
		this.showList = new ShowList({

			searchName: 'none'||$('.searchByName').val(),
			dateFrom:$('#dateFrom').val(),
			dateTo:$('#dateTo').val()
		});

		this.$('.showList').empty();

		$('.showList').html(this.showList.patientStudyFetch().el);
		return this;
	},

	loading:function(){
		$('.loading').css('visibility','visible');
	},
	loadingFinish:function(){
		$('.loading').css('visibility','hidden');
	}
});
export default searchList;