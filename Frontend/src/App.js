import $ from 'jquery';
import _ from 'underscore';
import Backbone from 'backbone';
import HeaderLayout from './templates/headerLayout.pug';
import SearchList from './views/searchList';
import TableList from './templates/tableList.pug';
import uesrTemplate from './templates/uesrTemplate.pug';

import './stylesheets/headerLayout.styl';
import 'bootstrap';
var App = Backbone.View.extend({

	initialize(){
		this.render();
		$.ajax({
				url:"http://fr-s-ivg-ssr-d1:3000/",
				type:"GET",

				xhrFields: {
				  withCredentials: true
				},
			    success:function(res){
			    	if(res.code == 1)
			    	{
				    	this.user = res.msg;
			    	}
			    	else{
			    		$("#loginDialog").modal('show');
						$('#login').on('click',function(){
							$.ajax({
								url:"http://fr-s-ivg-ssr-d1:3000/login",
								type:"POST",
								data: {
							        name: $("#name").val(),
							        password: $("#password").val()
							    },
							    xhrFields: {
								  withCredentials: true				//it is needed to cross port domin(server side need to set cors to credentials:true, origin:"request url")
								},
							    success:function(res){
							    	if(res.code==1){
						    			$("#loginDialog").modal('hide');
						    			this.user = res.msg;
						    			$('.sub').hide();
						    			$('.sub2').html(uesrTemplate({user:'this.user'})).show();
										$('.logout').on('click',function(){
											$.ajax({
												url:"http://fr-s-ivg-ssr-d1:3000/logout",
												type:"GET",

												xhrFields: {
												  withCredentials: true
												},
												success:function(res){
													if(res.code==0){
														$('.sub').show();
														$('.sub2').hide();
														$("#loginDialog").modal('show');
													}
												}
											});
										});
						    		}
							    	else{
							    		$('.noUser').css("visibility",'visible');
							    	}
							    }
							});
						});
			    	}
				}
		});
		$('.loginButton').on('click',function(){
			$("#loginDialog").modal('show');
						$('#login').on('click',function(){
							$.ajax({
								url:"http://fr-s-ivg-ssr-d1:3000/login",
								type:"POST",
								data: {
							        name: $("#name").val(),
							        password: $("#password").val()
							    },
							    xhrFields: {
								  withCredentials: true				//it is needed to cross port domin(server side need to set cors to credentials:true, origin:"request url")
								},
							    success:function(res){
							    	if(res.code==1){
						    			$("#loginDialog").modal('hide');
						    			this.user = res.msg;
						    			$('.sub').hide();
						    			$('.sub2').html(uesrTemplate({user:'this.user'})).show();
										$('.logout').on('click',function(){
											$.ajax({
												url:"http://fr-s-ivg-ssr-d1:3000/logout",
												type:"GET",

												xhrFields: {
												  withCredentials: true
												},
												success:function(res){
													if(res.code==0){
														$('.sub').show();
														$('.sub2').hide();
														$("#loginDialog").modal('show');
													}
												}
											});
										});
						    		}
							    	else{
							    		$('.noUser').css("visibility",'visible');
							    	}
							    }
							});
						});
		});
		this.searchList = new SearchList({
			el:'.searchList'
		});
	},
	render(){
		this.$el.html(HeaderLayout());

		return this;
	},
	
});

Backbone.View.prototype.close = function () {
  console.log('abcc Unbinding events for ' + this.cid);
    this.remove();
    this.unbind();

    if (this.onClose) {
        this.onClose();
    }
};

export default App;

