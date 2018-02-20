import Backbone from 'backbone';
import _ from 'underscore';
import $ from 'jquery';

import Patient_studyCollection from '../collections/patient_study';
import Patient_studyModel from '../models/patient_study';

import Study_series from './study_series'
import '../stylesheets/showTable.styl';
import TableList from '../templates/tableList.pug';
import TableListHeader from '../templates/tableListHeader.pug';

import Router from '../router';

var showList = Backbone.View.extend({

	events:{
		
		"click .fa-folder":function(e){

			this.router.navigate('search/patient_name='+$(e.currentTarget).attr('value')+"/series", true);

			$('.fa-folder-open').addClass('fa-folder');
			$('.fa-folder-open').removeClass('fa-folder-open');
			
			$(e.currentTarget).removeClass('fa-folder');
			$(e.currentTarget).addClass('fa-folder-open');
			console.log($(e.currentTarget).attr('value'));
			if(e.currentTarget.id=="none"){
				this.$('.series').empty();
				$('.footerAlter').css("visibility",'visible');
				$('.footerAlter').html("No study for this Patient");
			}
			else{
				$('.footerAlter').css("visibility",'hidden');
				this.patientCollectionSave.findWhere({study_id:parseInt(e.currentTarget.id)}).get('patient_path');
				this.patientCollectionSave.findWhere({study_id:parseInt(e.currentTarget.id)}).get('study_path');
				this.study_series = new Study_series({
					urlBase:this.urlBase,
					study_id:e.currentTarget.id,
					patient_path:this.patientCollectionSave.findWhere({study_id:parseInt(e.currentTarget.id)}).get('patient_path'),
					study_path:this.patientCollectionSave.findWhere({study_id:parseInt(e.currentTarget.id)}).get('study_path')
				});
				this.$('.series').empty();
				$('.series').html(this.study_series.render().el);
			}
		}
	},
	initialize(setting){
		this.setting = setting || {};

		this.event = setting.event;
		this.router = new Router();
		this.searchName = setting.searchName || 'none';
		this.urlBase = 'http://fr-s-ivg-ssr-d1:3000/api/v1/scippy';
		this.dateFrom = setting.dateFrom ; //for now a year 
		this.dateTo = setting.dateTo ; //for now a year 

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
		
		this.patientCollectionSave = new Patient_studyCollection();

		this.patientCollection.fetch({
		//	parse:false,
			xhrFields: {
				  withCredentials: true							// override ajax to send with credential
			},
			success:(_.bind(function(res){
				console.log(res);
				_.each(res.toJSON(),_.bind(function(eachPatient){
					
					this.$('.showList').append(TableList({
						urlBase:this.urlBase,
						resoure:"downloadStudy",
						list: eachPatient
					}));
					this.patientCollectionSave.add(new Patient_studyModel({
						study_id:eachPatient.study_id,
						patient_name:eachPatient.patient,
						study_description:eachPatient.study_description,
						patient_path:eachPatient.patient_path,
						study_path:eachPatient.study_path
					}));
				},this));
			},this))
		});

		return this;
	},

});

export default showList;
