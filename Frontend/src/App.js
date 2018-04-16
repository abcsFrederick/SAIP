import $ from 'jquery';
import _ from 'underscore';
import Backbone from 'backbone';
import HeaderLayout from './templates/headerLayout.pug';
import SearchList from './views/searchList';
import TableList from './templates/tableList.pug';
import uesrTemplate from './templates/uesrTemplate.pug';

import './stylesheets/headerLayout.styl';
import 'bootstrap';
var domin = 'http://localhost:3000/';
var VM = 'https://frsivg-mip01p.ncifcrf.gov/v0.1/';
var App = Backbone.View.extend({
	/*
	events:{
		'click #NCILogin':function(){
			window.location.replace('https://ncif-f5.ncifcrf.gov/SignIn/NihLoginIntegration.axd?returnUrl=http%3a%2f%2flocalhost:8888');
		}
	},
	*/
	//new button window.location.replace('https://ncif-f5.ncifcrf.gov/SignIn/NihLoginIntegration.axd?returnUrl=http%3a%2f%2flocalhost:8888')
	initialize(){
		this.render();
		$.ajax({
				url:VM+"",
				type:"GET",

				xhrFields: {
				  withCredentials: true
				},
			    success:function(res){
			    	console.log(res);
			    	if(res.status =='Authenticated')
			    	{
				    	this.user = res.msg;
				    	$('#NCIuser').html(res.FirstName+' '+res.LastName);
				    /*	$('.sub').hide();
				    	$('.sub2').show();
				    	$('.logout').on('click',function(){
								$.ajax({
									url:VM+"logout",
									type:"GET",

									xhrFields: {
									  withCredentials: true
									},
									success:function(res){
										if(res.code==0){
											$('.sub').show();
											$('.sub2').hide();
											$("#loginDialog").modal('show');
											window.location.replace('http://fr-s-ivg-ssr-d1:8080/')
										}
									}
								});
							});
					*/	

						console.log(res);
			    	}
			    	else{
			    	//	window.location.replace('https://authtest.nih.gov/siteminderagent/SmMakeCookie.ccc?NIHSMSESSION=QUERY&PERSIST=0&TARGET=-SM-HTTPS%3a%2f%2fncif--f5%2encifcrf%2egov%2fSignIn%2fNihLoginIntegration%2eaxd%3freturnUrl%3dhttp-%3a-%2f-%2flocalhost%3a8888');
			    		window.location.replace('https://authtest.nih.gov/siteminderagent/SmMakeCookie.ccc?NIHSMSESSION=QUERY&PERSIST=0&TARGET=-SM-HTTPS%3a%2f%2fncif--f5%2encifcrf%2egov%2fSignIn%2fNihLoginIntegration%2eaxd%3freturnUrl%3dhttps-%3a-%2f-%2ffrsivg%2dmip01p%2Encifcrf%2Egov%2f')
			    	/*	$("#loginDialog").modal('show');
						$('#login').on('click',function(){
							$.ajax({
								url:VM+"login",
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
						    			$('.sub2').show();
										$('.logout').on('click',function(){
											$.ajax({
												url:VM+"logout",
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
						var enter = document.getElementById("password");
						enter.addEventListener("keyup", function(event) {
					    event.preventDefault();
						    if (event.keyCode === 13) {
						        document.getElementById("login").click();
						    }
						});
			    	*/
			    	}
				}
		});
		/*
		$('.loginButton').on('click',function(){
			$("#loginDialog").modal('show');
			$('#login').on('click',function(){
				$.ajax({
					url:VM+"login",
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
			    			$('.sub2').show();
							$('.logout').on('click',function(){
								$.ajax({
									url:VM+"logout",
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
		
		});*/
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

