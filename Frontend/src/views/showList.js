import Backbone from 'backbone';
import _ from 'underscore';
import $ from 'jquery';

import Patient_studyCollection from '../collections/patient_study';
import Patient_studyModel from '../models/patient_study';

import Study_series from './study_series'
import '../stylesheets/showTable.styl';
import TableList from '../templates/tableList.pug';
import TableListHeader from '../templates/tableListHeader.pug';

import event from '../event';
import Router from '../router';
import 'datatables.net';

var domain = 'http://localhost:3000/';
var VM = 'https://frsivg-mip01p.ncifcrf.gov/v0.1/'
var showList = Backbone.View.extend({

	events:{
		"click .fa-folder":"showChild",
	
		"click .fa-folder-open":function(e){
			this.router.navigate('search/', true);
			$('.fa-folder-open').addClass('fa-folder');
			$('.fa-folder-open').removeClass('fa-folder-open');
			this.table2.destroy();
			this.table2.clear();
			$('#showList2').empty();
		},
	},
	initialize(setting){
		this.setting = setting || {};

		this.event = setting.event;
		this.router = new Router();
		this.searchName = setting.searchName || 'none';
		this.urlBase = VM+'api/v1/scippy';
		this.dateFrom = setting.dateFrom ; //for now a year 
		this.dateTo = setting.dateTo ; //for now a year 
		this.table;
		this.table2;
		this.patientCollection = new Patient_studyCollection({
			patientName: this.searchName,
			urlBase:this.urlBase,
			from:this.dateFrom,
			to:this.dateTo
		});

		this.render();
		
	},
	render(){ 
		this.$el.html(TableListHeader());
		
		return this;

	},
	patientStudyFetch(){
		event.trigger('loading');
		this.patientCollectionSave = new Patient_studyCollection();

		this.patientCollection.fetch({
		//	parse:false,
			xhrFields: {
				  withCredentials: true							// override ajax to send with credential
			},
			success:(_.bind(function(res){
				this.mergedStudyDescriptionArr = [];
				res.toJSON().forEach(function(sourceRow) {
					if(sourceRow['study_description']!=null){
						let image_name=sourceRow.image_name;
						let modality=sourceRow.modality;
						//window.series_mod_time=sourceRow.series_mod_time;
					//	console.log(sourceRow);
					//	if(sourceRow.series_mod_time!=null){	
						let series_mod_time=sourceRow.series_mod_time.substring(0,10);
					//	}
						let patient=sourceRow.patient;
						let patient_id=sourceRow.patient_id;
						let patient_path=sourceRow.patient_path;

						let serie_description=sourceRow.serie_description;
						let serie_id=sourceRow.serie_id;
						let serie_uid=sourceRow.serie_uid;
						let serie_path=sourceRow.serie_path;

						let study_id=sourceRow.study_id;
						let study_path=sourceRow.study_path;
					
						if(!this.mergedStudyDescriptionArr.some(function(row) { return row['study_description'] == sourceRow['study_description']; })) {

							sourceRow.image_name=[];
							sourceRow.modality=[];

							sourceRow.series_mod_time=[];
							sourceRow.patient=[];
							sourceRow.patient_id=[];
							sourceRow.patient_path=[];

							sourceRow.serie_description=[];
							sourceRow.serie_id=[];
							sourceRow.serie_uid=[];
							sourceRow.serie_path=[];

							sourceRow.study_id=[];
							sourceRow.study_path=[];

							sourceRow.studyLevelDownload=[];

							sourceRow.image_name.push(image_name);
							sourceRow.modality.push(modality);

							sourceRow.series_mod_time.push(series_mod_time);
							sourceRow.patient.push(patient);
							sourceRow.patient_id.push(patient_id);
							sourceRow.patient_path.push(patient_path);

							sourceRow.serie_description.push(serie_description);
							sourceRow.serie_id.push(serie_id);
							sourceRow.serie_uid.push(serie_uid);
							sourceRow.serie_path.push(serie_path);

							sourceRow.study_id.push(study_id);
							sourceRow.study_path.push(study_path);

							let studyLevelDownload = patient_path+'/'+study_path;
							sourceRow.studyLevelDownload.push(studyLevelDownload);

							this.mergedStudyDescriptionArr.push(sourceRow);

						} else {
							var targetRow = this.mergedStudyDescriptionArr.filter(function(targetRow) { return targetRow['study_description'] == sourceRow['study_description'] })[0];
							targetRow.serie_description.push(serie_description);

							targetRow.image_name.push(image_name);
							targetRow.modality.push(modality);

							targetRow.series_mod_time.push(series_mod_time);
							targetRow.patient.push(patient);
							targetRow.patient_id.push(patient_id);
							targetRow.patient_path.push(patient_path);

							targetRow.serie_description.push(serie_description);
							targetRow.serie_id.push(serie_id);
							targetRow.serie_uid.push(serie_uid);
							targetRow.serie_path.push(serie_path);

							targetRow.study_id.push(study_id);
							targetRow.study_path.push(study_path);

							let studyLevelDownload = patient_path+'/'+study_path;
							targetRow.studyLevelDownload.push(studyLevelDownload);
						}
					}
				}.bind(this));

				/*let mergedParentArr = [];
				res.toJSON().forEach(function(sourceRow){
				  let image_name=sourceRow.image_name;
				  let modality=sourceRow.modality;

				  let patient=sourceRow.patient;
				  let patient_id=sourceRow.patient_id;
				  let patient_path=sourceRow.patient_path;

				  let serie_description=sourceRow.serie_description;
				  let serie_id=sourceRow.serie_id;
				  let serie_uid=sourceRow.serie_uid;
				  let serie_path=sourceRow.serie_path;
				  
				  let study_id=sourceRow.study_id;
				  let study_path=sourceRow.study_path;
				  
				  if(!mergedParentArr.some(function(row) { return row['parent'] == sourceRow['parent']; })) {

				    sourceRow.image_name=[];
				    sourceRow.modality=[];

				    sourceRow.patient_id=[];
				    sourceRow.patient_path=[];

				    sourceRow.serie_description=[];
				    sourceRow.serie_id=[];
				    sourceRow.serie_uid=[];
				    sourceRow.serie_path=[];
				    
				    sourceRow.study_description=[];
				    sourceRow.study_id=[];
				    sourceRow.study_path=[];

				    sourceRow.parentLevelDownload=[];

					sourceRow.image_name.push(image_name);
					sourceRow.modality.push(modality);

				    sourceRow.patient_id.push(patient_id);
				    sourceRow.patient_path.push(patient_path);

				    sourceRow.serie_description.push(serie_description);
				    sourceRow.serie_id.push(serie_id);
				    sourceRow.serie_uid.push(serie_uid);
				    sourceRow.serie_path.push(serie_path);
				    
				    sourceRow.study_id.push(study_id);
				    sourceRow.study_path.push(study_path);

				    let parentLevelDownload = patient_path;
				    sourceRow.parentLevelDownload.push(parentLevelDownload);

				    mergedParentArr.push(sourceRow);

				  } else {
				    var targetRow = mergedParentArr.filter(function(targetRow) { return targetRow['patient'] == sourceRow['patient'] })[0];
				   	targetRow.serie_description.push(serie_description);
		
				    targetRow.image_name.push(image_name);
					targetRow.modality.push(modality);

				    targetRow.patient_id.push(patient_id);
				    targetRow.patient_path.push(patient_path);

				    targetRow.serie_description.push(serie_description);
				    targetRow.serie_id.push(serie_id);
				    targetRow.serie_uid.push(serie_uid);
				    targetRow.serie_path.push(serie_path);

				    targetRow.study_id.push(study_id);
				    targetRow.study_path.push(study_path);

				    let parentLevelDownload = patient_path;
				    targetRow.parentLevelDownload.push(parentLevelDownload);
				  }
				});
				*/
				//remove duplicate download url
				
				this.mergedStudyDescriptionArr.forEach(function(row) {
					let uniqueUrl = [];
					$.each(row.studyLevelDownload, function(i, el){
					    if($.inArray(el, uniqueUrl) === -1) uniqueUrl.push(el);
					});
					row.studyLevelDownload = uniqueUrl;
				});
//				console.log(this.mergedStudyDescriptionArr)
/*
				mergedParentArr.forEach(function(row) {
					let uniqueUrl = [];
					$.each(row.parentLevelDownload, function(i, el){
					    if($.inArray(el, uniqueUrl) === -1) uniqueUrl.push(el);
					});
					row.parentLevelDownload = uniqueUrl;
				});
*/			
//				console.log(mergedParentArr);
				event.trigger('loadingFinish');
				_.each(res.toJSON(),_.bind(function(eachPatient){
					
				/*	this.$('.showList').append(TableList({
						urlBase:this.urlBase,
						resoure:"downloadStudy",
						list: eachPatient
					}));
					*/
					this.patientCollectionSave.add(new Patient_studyModel({
						study_id:eachPatient.study_id,
						patient_name:eachPatient.patient,
						study_description:eachPatient.study_description,
						patient_path:eachPatient.patient_path,
						study_path:eachPatient.study_path
					}));
				},this));

				this.table = $('#showList').DataTable({
					language: {
				        searchPlaceholder: "Search study"
				    },
					"data": this.mergedStudyDescriptionArr,
					"columns" : [
			            { "data" : "study_description" },
			            {	
			            	"orderable":false,
				            "targets": -1,
				            "render": _.bind(function ( data, type, full, meta ) {
				            	let urlBase = VM+'api/v1/scippy';
				            	let patient_path = full.patient_path;
				            	let study_path = full.study_path;
				            	let study_description = full.study_description||'Non_study_description';
								let study_id = full.study_id||'none';
								let patient = full.patient;
								let resoure = 'downloadAllStudies';
								return "<a  class='fa fa-download studyDownloadProgress' style='margin-right:5px;width:20px;font-size:20px' value='"+urlBase+'/'+resoure+'/'+patient_path+'/'+study_path+'/'+patient+'/'+study_description+"'></a><progress class=' progress' value='0' style='display:none;margin-right:5px;width:20px;font-size:20px'></progress><a style='font-size:20px' class='fa fa-folder' id='"+study_id+"' value='"+study_description+"'></a></a>";
							
							},this),
				        }
			        ],
			        destroy: true,
					rowGroup: {dataSrc: 0},
					"lengthMenu":[[/*25,50,100,200,*/-1],[/*25,50,100,200,*/'ALL']],
					"scrollY": "500px",
        			"scrollCollapse": true,
					"dom":' <"datatable_Information col-md-6"i><"datatable_search col-md-6"f>t'//<"datatable_Length col-md-12"l><"datatable_Pagination col-md-12"p><"clear">'
				});

			//	var filterOr = createFilter(this.table, [0]);

				function createFilter(table, columns) {
					var input = $('.searchByName').on("keyup", function() {
						table.draw();
					});

					$.fn.dataTable.ext.search.push(function(
						settings,
						searchData,
						index,
						rowData,
						counter
					) {
						var val = input.val().toLowerCase();
				//		console.log(val);
						for (var i = 0, ien = columns.length; i < ien; i++) {
							if (searchData[columns[i]].toLowerCase().indexOf(val) !== -1) {
								return true;
							}
						}

						return false;
					});

					return input;
				}

			//	filterOr.appendTo("table-wrapper");
				$('.studyDownloadProgress').on('click',function(e){
				//	window.target=$(e.target);
				//	$('#showList').appendChild('<progress id="progress" value="0"></progress>');

					let progressIcon=$(e.target).next('.progress');
					let downloadIcon=$(e.target);
					var xhr = new XMLHttpRequest();
				//	console.log($(e.target).attr('value'));
					xhr.open("GET", $(e.target).attr('value'));
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
					    var fileName = xhr.getResponseHeader("Content-Disposition").match(/\sfilename="([^"]+)"(\s|$)/)[1];
					    saveBlob(blob, fileName);
					};
					xhr.onloadstart = function(e) {
						progressIcon.prop('value', 0);
					    progressIcon.show('slow');
					    downloadIcon.hide('slow');
					};
					xhr.onloadend = function(e) {
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
				});
				$('.datatable_search').on( 'keyup',  _.bind(function () {
				    this.table.columns(0).search( this.value ).draw();
				},this));
				this.table.draw();
			},this))
		});

		return this;
	},

	showChild(e){
		$('.fa-folder-open').addClass('fa-folder');
		$('.fa-folder-open').removeClass('fa-folder-open');
		$(e.target).addClass('fa-folder-open');
		$(e.target).removeClass('fa-folder');
		let studyDes = $(e.target).closest( "tr" )[0].cells[0].innerText;

		let study = this.mergedStudyDescriptionArr.find(e=>e['study_description']==studyDes)


		let individulStudy=[];
		var promises = [];
		for(let a=0;a<study['patient'].length;a++)
		{	
			let temp={};
			let src='/mnt/scippy_images/'+study['patient_path'][a]+'/'+study['study_path'][a]+'/'+study['serie_path'][a]+'/thmb_'+study['serie_uid'][a]+'.jpg'
	//		var request = $.get(src).done(function(){
					
					temp.image_name=study['image_name'][a];
					temp.modality=study['modality'][a];

					temp.series_mod_time=study['series_mod_time'][a];
					temp.patient=study['patient'][a];
					temp.patient_id=study['patient_id'][a];
					temp.patient_path=study['patient_path'][a];

					temp.serie_description=study['serie_description'][a];
					temp.serie_id=study['serie_id'][a];
					temp.serie_uid=study['serie_uid'][a];
					temp.serie_path=study['serie_path'][a];

					temp.study_id=study['study_id'][a];
					temp.study_path=study['study_path'][a];
					individulStudy.push(temp);
	//			}).fail(function(){
	//				individulStudy.push(temp);
	//				console.log(src+'404');
	//			});
	//		promises.push(request);
		}

		let mergedindividulStudy = [];
		let middleStudy=individulStudy;
		console.log(individulStudy);
		middleStudy.forEach(function(value) {
		  var existing = mergedindividulStudy.filter(function(v, i) {
		    return v.patient == value.patient;
		  });
		  if (existing.length) {
		    var existingIndex = mergedindividulStudy.indexOf(existing[0]);
		    mergedindividulStudy[existingIndex].image_name = mergedindividulStudy[existingIndex].image_name.concat(value.image_name);
		    mergedindividulStudy[existingIndex].modality = mergedindividulStudy[existingIndex].modality.concat(value.modality);

		//    mergedindividulStudy[existingIndex].series_mod_time = mergedindividulStudy[existingIndex].series_mod_time.concat(value.series_mod_time);
		//    mergedindividulStudy[existingIndex].patient_id = mergedindividulStudy[existingIndex].patient_id.concat(value.patient_id);
		//    mergedindividulStudy[existingIndex].patient_path = mergedindividulStudy[existingIndex].patient_path.concat(value.patient_path);

		    mergedindividulStudy[existingIndex].serie_description = mergedindividulStudy[existingIndex].serie_description.concat(value.serie_description);
		    mergedindividulStudy[existingIndex].serie_id = mergedindividulStudy[existingIndex].serie_id.concat(value.serie_id);
		    mergedindividulStudy[existingIndex].serie_uid = mergedindividulStudy[existingIndex].serie_uid.concat(value.serie_uid);
		    mergedindividulStudy[existingIndex].serie_path = mergedindividulStudy[existingIndex].serie_path.concat(value.serie_path);

		//    mergedindividulStudy[existingIndex].study_id = mergedindividulStudy[existingIndex].study_id.concat(value.study_id);
		//    mergedindividulStudy[existingIndex].study_path = mergedindividulStudy[existingIndex].study_path.concat(value.study_path);
		  } else {
				value.image_name = [value.image_name];
				value.modality = [value.modality];

		//		value.series_mod_time = [value.series_mod_time];
		//		value.patient_id = [value.patient_id];
		//		value.patient_path = [value.patient_path];

				value.serie_description = [value.serie_description];
				value.serie_id = [value.serie_id];
				value.serie_uid = [value.serie_uid];
				value.serie_path = [value.serie_path];

		//		value.study_id = [value.study_id];
		//		value.study_path = [value.study_path];
		    mergedindividulStudy.push(value);
		  }
		});
		console.log(mergedindividulStudy);
	//	console.log(this.table2);
	//	$.when.apply(null, promises).done(function(){
		    $('#showList2').append('<thead>\
										<tr>\
									      		<th> Patient</th>\
									      		<th> Date</th>\
												<th> Modality</th>\
												<th> Series</th>\
												<th> Option</th>\
										 </tr>\
									 </thead>')
			this.table2 = $('#showList2').DataTable({
				language: {
			        searchPlaceholder: "Search patient"
			    },
				"data": mergedindividulStudy,
				"columns" : [
		            { "data" : "patient","width": "20%"},
		            { 
		              "data" : "series_mod_time"
		        	},
		            { 
		              "data" : "modality"
		        	},
		            { 	"width": "20%",
		              	"orderable":false,
			            "targets": -2,
			            "render": function ( data, type, full, meta ) {
			            	let urlBase = VM+'api/v1/scippy';
			            	let patient_path = full.patient_path;
			            	let study_path = full.study_path;
							let study_id = full.study_id||'none';
							let serie_path = full.serie_path;
							let serie_uid = full.serie_uid
							let patient = full.patient;
							let resoure = 'downloadStudy';
							var imgDom = "";
							for (let i = 0;i< serie_path.length;i++) {
								imgDom += "<img onerror='removeImg(this)' src='/mnt/scippy_images/"+patient_path+"/"+study_path+"/"+serie_path[i]+"/thmb_"+serie_uid[i]+".jpg'>\
									<script>function removeImg(e){e.setAttribute('style','display:none')}</script>";
							}
							return imgDom;
						},
					},
		            {	
		            	"orderable":false,
			            "targets": -1,
			            "render": function ( data, type, full, meta ) {
			            	let urlBase = VM+'api/v1/scippy';
			            	let patient_path = full.patient_path;
			            	let study_path = full.study_path;
							let study_id = full.study_id||'none';
							let serie_path = full.serie_path;
							let patient = full.patient;
							let modality = full.modality;
							let resoure_1 = 'downloadStudy';
							let resoure = 'downloadSeries';
							return "<!--<a class='fa fa-download' style='width:25px;font-size:20px' href='"+urlBase+'/'+resoure_1+'/'+patient_path+'/'+study_path+"' data-toggle='tooltip' data-placement='right' title='Patient download'></a>--><progress class='progress' value='0' style='display:none;margin-right:5px;width:20px;font-size:20px'></progress><a style='font-size:20px' class='fa fa-download seriesDownloadProgress' value='"+urlBase+'/'+resoure+'/'+patient_path+'/'+study_path+'/'+serie_path+'/'+patient+'/'+modality+"' data-toggle='tooltip' data-placement='right' title='Series download'></a>";
						
						},
			        }
		        ],
		        destroy: true,
				rowGroup: {dataSrc: 0},
				"autoWidth": false,
				"lengthMenu":[[/*25,50,100,200,*/-1],[/*25,50,100,200,*/'ALL']],
				"scrollY": "500px",
				"scrollCollapse": true,
				"dom":' <"datatable_Information col-md-6"i><"datatable_search_patient col-md-6"f>rt'//<"datatable_Length col-md-12"l><"datatable_Pagination col-md-12"p><"clear">'
			});
			$('.seriesDownloadProgress').on('click',function(e){
			    let progressIcon=$(e.target).prev('.progress');
				let downloadIcon=$(e.target);
				var xhr = new XMLHttpRequest();

				xhr.open("GET", $(e.target).attr('value'));
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
				    var fileName = xhr.getResponseHeader("Content-Disposition").match(/\sfilename="([^"]+)"(\s|$)/)[1];
				    saveBlob(blob, fileName);
				};
				xhr.onloadstart = function(e) {
					progressIcon.prop('value', 0);
				    progressIcon.show('slow');
				    downloadIcon.hide('slow');
				};
				xhr.onloadend = function(e) {
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
			});

			$('[data-toggle="tooltip"]').tooltip();
			$('.datatable_search_patient').on( 'keyup', _.bind(function () {

				    this.table2.columns(0).search( this.value ).draw();
			},this));
	//	});
	},
	format(d){
		console.log(d);
	    let all='';
	    for (let i = 0; i < d['patient'].length; i++) {
	    	let a = '<tr>'+'<td>'+'</td>'+'<td>'+d.patient[i]+'</td>'+'<td>'+d.serie_description[i]+'</td>'+'<td>'+d.modality[i]+'</td>'+'</tr>';
	    	all+=a;
	    }
	    return '<table cellpadding="0" cellspacing="0" border="0" style="padding-left:50px;">'+all+'</table>';
	}

});

export default showList;
