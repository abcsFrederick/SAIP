import $ from "jquery";
import _ from "underscore";
import Backbone from "backbone";
import View from '../View';

import participantsCollection from '../../collections/participants/participants';
import participantsTable from '../../templates/participants/participantsTable.pug';
import '../../stylesheets/participants/participants.styl'
var participants = View.extend({
	events:{
		'click #participantsTable tbody tr':'series',
		'click #backToParticipantsView':'backToParticipantsView'
	},
	initialize(setting){
		this.mntPath='/mnt/Scippy'
		this.$el.html(participantsTable());
		this.is_admin=setting.admin;
		this.domain = setting.domain;
		this.domain_ws = setting.domain_ws;
		this.experiment_id = setting.experiment_id;
		this.participants = new participantsCollection({
			domain : this.domain,
			experiment_id : this.experiment_id
		});
		$('.seriesView').hide();
		$('.participantsView').show();
	},
	render(){
		this.participants.fetch({
			xhrFields: {
				  withCredentials: true							// override ajax to send with credential
			},
			success:_.bind(function(res){
				console.log(res)
				if(res.toJSON()[0].error!='no patient exist'){
					let patientsWithStudies=[]
					for(let a=0;a<res.toJSON().length;a++){
						if(res.toJSON()[a].study_id){
							patientsWithStudies.push(res.toJSON()[a]);
						}
					}
					this.scippyInfo = patientsWithStudies;
					this.participantsTable = $('#participantsTable').DataTable({
						data:patientsWithStudies,
					    rowId: 'study_id',
					    'createdRow': function( row, data, dataIndex ) {
						      $(row).attr('pat_name', data.pat_name);
						},
					    columns: [
					    	{
					    		data:'pat_mrn'
					    	},
					    	{
					    		data:'pat_name'
					    	},
					    	{
					    		data:'studyid'
					    	},
					    	{
					    		data:'study_description'
					    	},
					    	{
					            "targets": -3,
					            "render": _.bind(function ( data, type, full, meta ) {
					            	var uniqueModality = [];
					            	$.each(full.modality, function(i, el){
									    if($.inArray(el, uniqueModality) === -1) uniqueModality.push(el);
									});
					            	return uniqueModality
					            },this)
					    	},
					    	{
					            "targets": -2,
					            "render": _.bind(function ( data, type, full, meta ) {
					            	if(full.study_mod_time){
					            		return full.study_mod_time.substr(0,10)
					            	}
					            	return ''
					            },this)
					    	},
					    	{
					            "targets": -1,
					            "render": _.bind(function ( data, type, full, meta ) {
					            	full.study_description = full.study_description||'None';
							//console.log(full.series_description);
					            	for(let i=0; i < full.series_description.length; i++) {
								full.series_description[i] = full.series_description[i].replace(/[%/]/g,'_');
							}
							return "<a class='fa fa-download studyDownloadProgress' style='cursor:pointer' stu_id='"+full.study_id+"' stu_name='"+full.study_description.replace(/[%/]/g,'_')+"' title='"+full.pat_path+'/'+full.study_path+'/'+full.pat_name+'/'+full.study_description.replace(/[%/]/g,'_')+'?series_path='+full.series_path+'&series_description='+full.series_description+'&modality='+full.modality+"'></a><a class='fa fa-spinner fa-spin' style='display:none;'></a><progress class=' progress' value='0' style='display:none;margin-right:5px;width:16px;font-size:5px;height:5px;margin-bottom:0px'></progress>"
					            },this)
					    	},
					    ],
					    destroy: true,
						"lengthMenu":[[-1],['ALL']],
						"scrollY": "500px",
						"scrollCollapse": true,
						"dom":'rt'
					});
					$('.studyDownloadProgress').on('click',_.bind(function(e){
				//	window.target=$(e.target);
				//	$('#showList').appendChild('<progress id="progress" value="0"></progress>');
						let requestPath = $(e.currentTarget).attr('title');
				//	$('#showList').appendChild('<progress id="progress" value="0"></progress>');
						let progressIcon=$(e.target).next('.fa-spinner').next('.progress');
					let downloadIcon=$(e.target);
					let spinnerIcon=$(e.target).next('.fa-spinner');

						let stu_name = $(e.currentTarget).attr('stu_name');
						let stu_id = $(e.currentTarget).attr('stu_id');
						var ws = new WebSocket(this.domain_ws+'api/v1/study_download/'+requestPath);

				    ws.onopen = function () {
				        spinnerIcon.show('slow');
			    			downloadIcon.hide('slow');
				        $('.progressAlert').append('<li class="stuDownloadProgressDisplay" id="stuDownloadProgressDisplay_'+stu_id+'">Study: <label>'+stu_name+'</label> is preparing<span id=stuDownloadProgressPercentageDisplay_'+stu_id+'></span></li>');
								$('.progressAlert').fadeTo('slow', 0.8);
				    }

				    ws.onmessage = function (ev) {
				        // console.log(JSON.parse(ev.data).err);
				        $('#stuDownloadProgressPercentageDisplay_'+stu_id).text(JSON.parse(ev.data).msg);
				        if(JSON.parse(ev.data).err == 3){

				        	let zipFileLocation = JSON.parse(ev.data).filePath
				        	console.log(zipFileLocation)
				        	var xhr = new XMLHttpRequest();
									xhr.open("GET", this.domain + 'api/v1/downloadZip?absolutePath='+zipFileLocation);

									xhr.responseType = "blob";
									xhr.withCredentials = true;

									xhr.onprogress = function(e) {
				              if (e.lengthComputable) {
				                  progressIcon.prop('max', e.total);
				                  progressIcon.prop('value', e.loaded);
				              }
				          };
									xhr.onload = function (e) {
									    var blob = xhr.response;
									    var fileName = xhr.getResponseHeader("Content-Disposition").match(/\sfilename="([^"]+)"/)[1];
									//    console.log(fileName);
									    saveBlob(blob, fileName);
									};
									xhr.onloadstart = function(e) {
											progressIcon.prop('value', 0);
									    progressIcon.show('slow');
									    spinnerIcon.hide('slow');
									    // $('.progressAlert').empty();
									    $('#stuDownloadProgressDisplay_'+stu_id).html('Study: <label>' +stu_name+'</label> is downloading');
									    // $('#doNotRefreshAlert').show('slow');
									    // downloadIcon.hide('slow');
									    // $('.alert-warning').empty();
							      //   $('.alert-warning').append('<li>Study is downloading</li>');
							      //   $('.alert-warning').fadeTo('slow', 0.8);
									};
									xhr.onloadend = function(e) {
											// $('.alert-warning').empty();
											// $('.alert-warning').slideUp(500);
											$('#stuDownloadProgressDisplay_'+stu_id).remove().slideUp(500); 
									    progressIcon.hide('slow');
              				downloadIcon.show('slow');
									};
									xhr.send();
									function saveBlob(blob, fileName) {
								    	var a = document.createElement("a");
									    a.href = window.URL.createObjectURL(blob);
									    a.download = fileName;
									    document.body.appendChild(a);
									    a.click();
									    window.setTimeout(function() {
									      URL.revokeObjectURL(blob);
									      document.body.removeChild(a);
									    }, 0);
									}
				        }
				    }.bind(this)
				},this));
				}else{
					
					this.participantsTable = $('#participantsTable').DataTable({
						data:res.toJSON(),
						columns: [
					    	{
					    		data:'error'
					    	},
					    	{
					    		data:'error'
					    	},
					    	{
					    		data:'error'
					    	},
					    	{
					    		data:'error'
					    	},
					    	{
					    		data:'error'
					    	},
					    	{
					    		data:'error'
					    	},
					    	{
					    		data:'error'
					    	},
					    	],
					    destroy: true,
						"lengthMenu":[[-1],['ALL']],
						"scrollY": "500px",
						"scrollCollapse": true,
						"dom":'rt'
					})
				}
				
			},this)
		});
		return this;
	},
	series(e){
		if(!$(e.target).hasClass('fa-download')){
			$('#backToParticipantsView').html(e.currentTarget.getAttribute('pat_name'));
			$('.seriesView').show();
			$('.participantsView').hide();
			this.study=[];
			for(let i=0;i<this.scippyInfo.length;i++)
			{
				if(this.scippyInfo[i].study_id == e.currentTarget.id)
				{
					console.log(this.scippyInfo[i]);
					var series_number=[];
					var series_description=[];
					var num_images=[];
					var series_path=[];
					var series_uid=[];
					var modality=[];
					this.patient_path = this.scippyInfo[i].pat_path;
					this.study_path = this.scippyInfo[i].study_path;
					for(let y = 0; y < this.scippyInfo[i].series_number.length; y++){
						var temp={};
					    temp.series_number=this.scippyInfo[i].series_number[y];
					    temp.series_description=this.scippyInfo[i].series_description[y];
					    temp.num_images=this.scippyInfo[i].num_images[y];
					    temp.series_path=this.scippyInfo[i].series_path[y];
					    temp.series_uid=this.scippyInfo[i].series_uid[y];
					    temp.modality=this.scippyInfo[i].modality[y];
					    this.study.push(temp);
					}
					break
				}
			}
			console.log(this.study);
			this.seriesTable = $('#seriesTable').DataTable({
						data:this.study,
						columns: [
							{
					            "targets": 0,
					            "render": _.bind(function ( data, type, full, meta ) {
					            	return "<img onerror='removeImg(this)' src='/mnt/scippy_images/"+this.patient_path+"/"+this.study_path+"/"+full.series_path+"/thmb_"+full.series_uid+".jpg'>\
										<script>function removeImg(e){e.setAttribute('style','display:none')}</script>";
					            },this)
					    	},
					    	{
					    		data:'series_description'
					    	},
					    	{
					    		data:'series_number'
					    	},
					    	{
					    		data:'num_images'
					    	},
					    	{
					            "targets": -1,
					            "render": _.bind(function ( data, type, full, meta ) {
					            	full.series_description = full.series_description||'None';
					            	return "<a class='fa fa-download seriesDownloadProgress' style='cursor:pointer' ser_id='"+full.series_path+"' ser_name='"+full.series_description.replace(/[%/]/g,'_')+"' title='"+this.patient_path+'/'+this.study_path+'/'+full.series_path+'/'+full.series_description.replace(/[%/]/g,'_')+'/'+full.modality +"'></a><a class='fa fa-spinner fa-spin' style='display:none;'></a><progress class=' progress' value='0' style='display:none;margin-right:5px;width:16px;font-size:5px;height:5px;margin-bottom:0px'></progress>"
					            },this)
					    	},
					    ],
					    destroy: true,
						"lengthMenu":[[-1],['ALL']],
						"scrollY": "400px",
						"scrollCollapse": true,
						"dom":'rt'
					});
			$('.seriesDownloadProgress').on('click',_.bind(function(e){
				//	window.target=$(e.target);
				//	$('#showList').appendChild('<progress id="progress" value="0"></progress>');

					let requestPath = $(e.currentTarget).attr('title');

					let ser_name = $(e.currentTarget).attr('ser_name');
					let ser_id = $(e.currentTarget).attr('ser_id');

					let progressIcon=$(e.target).next('.fa-spinner').next('.progress');
          let downloadIcon=$(e.target);
          let spinnerIcon=$(e.target).next('.fa-spinner');

					var ws = new WebSocket(this.domain_ws+'api/v1/series_download/'+requestPath);

					ws.onopen = function () {
			        console.log('websocket is connected ...');
			        spinnerIcon.show('slow');
			    		downloadIcon.hide('slow');
			        $('.progressAlert').append('<li class="serDownloadProgressDisplay" id="serDownloadProgressDisplay_'+ser_id+'">Series: <label>'+ser_name+'</label> is preparing<span id=serDownloadProgressPercentageDisplay_'+ser_id+'></span></li>');
							$('.progressAlert').fadeTo('slow', 0.8).delay(5000);
			    }

			    ws.onmessage = function (ev) {
			        // console.log(JSON.parse(ev.data).err);
			        $('#serDownloadProgressPercentageDisplay_'+ser_id).text(JSON.parse(ev.data).msg);

			        if(JSON.parse(ev.data).err == 3){
			       
			        	let zipFileLocation = JSON.parse(ev.data).filePath
			        	var xhr = new XMLHttpRequest();
								xhr.open("GET", this.domain + 'api/v1/downloadZip?absolutePath='+zipFileLocation);
								xhr.responseType = "blob";
								xhr.withCredentials = true;

								xhr.onprogress = function(e) {
								    if (e.lengthComputable) {
								        progressIcon.prop('max', e.total);
								        progressIcon.prop('value', e.loaded);
								    }
								};
								xhr.onload = function (e) {
								    var blob = xhr.response;
								    var fileName = xhr.getResponseHeader("Content-Disposition").match(/\sfilename="([^"]+)"/)[1];
								//    console.log(fileName);
								    saveBlob(blob, fileName);
								};
								xhr.onloadstart = function(e) {
										progressIcon.prop('value', 0);
								    progressIcon.show('slow');
								    spinnerIcon.hide('slow');
								    $('#serDownloadProgressDisplay_'+ser_id).html('Series: <label>' + ser_name+'</label> is downloading');
								    // $('#doNotRefreshAlert').show('slow');
								    // downloadIcon.hide('slow');
								};
								xhr.onloadend = function(e) {
								    $('#serDownloadProgressDisplay_'+ser_id).remove().slideUp(500); 
								    progressIcon.hide('slow');
              			downloadIcon.show('slow');
								};
								xhr.send();
								function saveBlob(blob, fileName) {
							    	var a = document.createElement("a");
								    a.href = window.URL.createObjectURL(blob);
								    a.download = fileName;
								    document.body.appendChild(a);
								    a.click();
								    window.setTimeout(function() {
								      URL.revokeObjectURL(blob);
								      document.body.removeChild(a);
								    }, 0);
								}
			        }
			    }.bind(this)
				},this));
		}
	},
	backToParticipantsView(){
		$('.seriesView').hide();
		$('.participantsView').show();
	}
});

export default participants;
