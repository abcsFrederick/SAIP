import $ from "jquery";
import 'jquery-ui/themes/base/core.css';
import 'jquery-ui/themes/base/theme.css';
import 'jquery-ui/themes/base/slider.css';
import 'jquery-ui/ui/core';
import 'jquery-ui/ui/widgets/slider';
import _ from "underscore";
import Backbone from "backbone";
import StatisticsCollection from '../../collections/statistics/statistics';

import View from '../View';
import StatisticsTable from '../../templates/statistics/statistics.pug';
import * as d3 from 'd3';
var protocol = View.extend({
	
	initialize(setting){
		this.$el.html(StatisticsTable());
		this.is_admin = setting.admin;
		this.domain=setting.domain;
		this.statisticsCollection = new StatisticsCollection({
			domain:this.domain
		});
		
		this.render();
	},
	render(){
		this.statisticsCollection.fetch({
			xhrFields: {
				  withCredentials: true							// override ajax to send with credential
			},
			success:(_.bind(function(res){
				console.log(res.toJSON());

				this.svg = d3.select(".pieChart")
								.append("svg").style("width",$(".pieChart").width()+'px').style("height",$(".pieChart").width()+'px')
								.append("g")
				this.svg_event = d3.select(".pieChartEvent")
								.append("svg").style("width",$(".pieChartEvent").width()+'px').style("height",$(".pieChartEvent").width()+'px')
								.append("g")
				this.pieChartRenderUser(res.toJSON());
				this.pieChartRenderEvent(res.toJSON());
				this.statisticsTable = $('#statisticsTable').DataTable({
					data:res.toJSON(),
					rowId:'id',
					'createdRow': function( row, data, dataIndex ) {
						$(row).attr('user_id', data.user_id);
						$(row).attr('event', data.event);
					},
					columns: [
			
				    	{
				    		data:"event"
				    	},
				    	{
				    		data:"type"
				    	},
				    	{
				    		"orderable":false,
				            "targets": -2,
				            "render": _.bind(function ( data, type, full, meta ) {
				            	return full.first_name+' '+full.last_name;
				            },this)
				    	},
				    	{
		            "targets": -1,
		            "render": _.bind(function ( data, type, full, meta ) {
		     
		            	if(typeof(full.timestamp)=='string'){
		            		return full.timestamp.slice(0,10);
		            	}
		            	else{
		            		return full.timestamp
		            	}
		            },this)
				    	},
			    	],
			    	destroy: true,
					"lengthMenu":[[-1],['ALL']],
					"scrollY": "80vh",
					"scrollCollapse": true,
					"dom":'rt'
				});
				let today = new Date();
				let fromdate = new Date('2018-01-01');

				let today_month = today.getUTCMonth() + 1; 
      	today_month = (parseInt(today_month) > 9) ? today_month:"0"+today_month;
				let today_day = today.getUTCDate();
				today_day = (parseInt(today_day) > 9) ? today_day:"0"+today_day;
				let today_year = today.getUTCFullYear();
				let today_string = today_year + "-" + today_month + "-" + today_day;

        let fromdate_month = fromdate.getUTCMonth() + 1; 
      	fromdate_month = (parseInt(fromdate_month) > 9) ? fromdate_month:"0"+fromdate_month;
				let fromdate_day = fromdate.getUTCDate();
				fromdate_day = (parseInt(fromdate_day) > 9) ? fromdate_day:"0"+fromdate_day;
				let fromdate_year = fromdate.getUTCFullYear();
				let fromdate_string = fromdate_year + "-" + fromdate_month + "-" + fromdate_day;
				$( "#slider-range" ).slider({
		      range: true,
		      min: fromdate.getTime(),
		      max: today.getTime(),
		      values:[fromdate.getTime(),today.getTime()],
		      step: 60 * 60 * 24 * 1000,
		      slide: _.bind(function( event, ui ) {
		      	this.fromDate = new Date(ui.values[0]);
		      	this.endDate = new Date(ui.values[1]);

		      	this.fromDate_month = this.fromDate.getUTCMonth() + 1; 
		      	this.fromDate_month = (this.fromDate_month > 9) ? this.fromDate_month:"0"+this.fromDate_month;
						this.fromDate_day = this.fromDate.getUTCDate();
						this.fromDate_day = (this.fromDate_day > 9) ? this.fromDate_day:"0"+this.fromDate_day;
						this.fromDate_year = this.fromDate.getUTCFullYear();
						this.fromDate_string = this.fromDate_year + "-" + this.fromDate_month + "-" + this.fromDate_day;

		        this.endDate_month = this.endDate.getUTCMonth() + 1; 
		      	this.endDate_month = (this.endDate_month > 9) ? this.endDate_month:"0"+this.endDate_month;
						this.endDate_day = this.endDate.getUTCDate();
						this.endDate_day = (this.endDate_day > 9) ? this.endDate_day:"0"+this.endDate_day;
						this.endDate_year = this.endDate.getUTCFullYear();
						this.endDate_string = this.endDate_year + "-" + this.endDate_month + "-" + this.endDate_day;

		        $( "#range" ).val( this.fromDate_string + " ----- " + this.endDate_string );

		        this.statisticsTable.rows(function ( idx, data, node ) {
			      	// console.log($(node).attr('user_id'))
			      	$(node).removeClass('hide');
				    }).draw();
		        this.filterTable(res.toJSON(),ui.values[0],ui.values[1])
		      },this)
		    });
		    $( "#range" ).val( fromdate_string + " ----- " + today_string );
		    // $( "#amount" ).val( "$" + $( "#slider-range" ).slider( "values", 0 ) +
		    //   " - $" + $( "#slider-range" ).slider( "values", 1 ) );
				$.fn.dataTable.ext.search.push(
				    _.bind(function( settings, data, dataIndex ) {
              // console.log(settings.nTable.id)
              if(settings.nTable.id == 'statisticsTable')
              {
                var min = this.fromDate;
                var max = this.endDate;
                // console.log(min,max)
                var time = new Date(data[3]).getTime()
         
                if ( ( isNaN( min ) && isNaN( max ) ) ||
                     ( isNaN( min ) && time <= max ) ||
                     ( min <= time   && isNaN( max ) ) ||
                     ( min <= time   && time <= max ) )
                {
                    return true;
                }
                return false;
              }else{
                return true;
              }
				    },this)
				);

				// $('#min, #max').keyup( _.bind(function() {
		  //       // this.statisticsTable.draw();
		  //       this.filterTable(res.toJSON());
		  //   },this));
			},this))
		});
		return this;
	},
	filterTable(data,min,max){
		// let min = min.getTime();
  //   let max = max.getTime();
    // let time = new Date(data[3]).getTime()
    let newdata = data.filter(function(x){
    	let time = new Date(x.timestamp).getTime()
			return (time<max && min<time)
		})
		this.pieChartRenderUser(newdata);
		this.pieChartRenderEvent(newdata);
	},
	pieChartRenderUser(data) {

		let pieChartDisplay = [];
		this.uniqueUser = [...new Set(data.map(user => user.user_id))];
		console.log(this.uniqueUser);
		this.randomColor=[];
		// for (let a=0;a<this.uniqueUser.length;a++){
		// 	let randomColor = "#"+((1<<24)*Math.random()|0).toString(16);

		// 	let hue = heatmapPercent  * 0.45 / 360;
		// 	let heatmapColor = hslToRgb(,1,.5)
		// 	this.randomColor.push(heatmapColor);
		// }
		this.uniqueUser.forEach(_.bind(function(userId,index){
			let record={};
			record['id'] = index
			record['user_id'] = userId
			record['num_of_actions'] = data.filter(function(x){
				return x.user_id==userId
			}).length
			record['user_name'] = data.filter(function(x){
				return x.user_id==userId
			})[0].first_name + ' ' + data.filter(function(x){
				return x.user_id==userId
			})[0].last_name
			pieChartDisplay.push(record);

			let heatmapPercent = record['num_of_actions']/data.length * 100;
			console.log(record['num_of_actions']);
			let hue = (50-heatmapPercent  * .5) / 360;
			let heatmapColor = this.hslToRgb(hue,1,.5)
			this.randomColor.push(heatmapColor);

		},this));
											
		// console.log($(".pieChart").width());
		let width = $(".pieChart").width(),
		    height = $(".pieChart").width(),
				radius = Math.min(width * 0.8, height) / 2;	

		let g = this.svg.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

		var color = d3.scaleOrdinal(this.randomColor);

		let pie = d3.pie()
								.sort(null)
								.value(function(d) {
									return d.num_of_actions;
								});
		let path = d3.arc()
        .outerRadius(radius - 20)
        .innerRadius(0)
        .cornerRadius(5);

    let label = d3.arc()
        .outerRadius(radius - 40)
        .innerRadius(radius - 40);
    // console.log(pieChartDisplay);
    g.selectAll(".arc").remove()
    // g = this.svg.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
    let arc = g.selectAll(".arc")
        .data(pie(pieChartDisplay))
        .enter().append("g")
        .classed("arc", true);
    let pathArea = arc.append("path")
        .attr("d", path)
        .attr("id", function(d, i) {
        		// console.log(i)
            return "arc-" + i
        })
        .attr("style", "fill-opacity: 0.65;")
        .attr("fill", function(d) {
            return color(d.data.id);
        })
        .attr("data", function(d) {
            d.data["percentage"] = (d.endAngle - d.startAngle) / (2 * Math.PI) * 100;
            return JSON.stringify(d.data);
        }); 
    g.selectAll('#tooltip_pieChart').remove();
    let tooltipg = g.append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .attr("text-anchor", "end")
        .attr("id", "tooltip_pieChart")
        .attr("style", "opacity:0")
        .attr("transform", "translate(-500,-500)");

    tooltipg.append("rect")
        .attr("id", "tooltipRect_pieChart")
        .attr("x", 0)
        .attr("width", 120)
        .attr("height", 80)
        .attr("opacity", 0.8)
        .style("fill", "#000000");

    tooltipg
        .append("text")
        .attr("id", "tooltipText_pieChart")
        .attr("x", 30)
        .attr("y", 15)
        .attr("fill", "#fff")
        .style("font-size", 10)
        .style("font-family", "arial")
        .text(function(d, i) {
            return "";
        });

    // arc.append("text")
    //     .attr("transform", function(d) {
    //         return "translate(" + label.centroid(d) + ")";
    //     })
    //     .attr("dy", "0.35em")
    //     .text(function(d) {
    //         return d.data.num_of_actions;
    //     });

    arc.append("text")
        .attr("dx", 30)
        .attr("dy", -5)
        .append("textPath")
        .attr("xlink:href", function(d, i) {
            return "#arc-" + i;
        })
        .text(function(d) {
            return d.data.user_name.toString();
        });
    let helpers = {
		    getDimensions: function(id) {
		        var el = document.getElementById(id);
		        var w = 0,
		            h = 0;
		        if (el) {
		            var dimensions = el.getBBox();
		            w = dimensions.width;
		            h = dimensions.height;
		        } else {
		            console.log("error: getDimensions() " + id + " not found.");
		        }
		        return {
		            w: w,
		            h: h
		        };
		    }
		}
    pathArea.on("mouseover", function(d) {
        var currentEl = d3.select(this);
        currentEl.attr("style", "fill-opacity:1;");

        var fadeInSpeed = 120;
        d3.select("#tooltip_" + "pieChart")
            .transition()
            .duration(fadeInSpeed)
            .style("opacity", function() {
            		// console.log($("#tooltip_" + "pieChart"))
                return 1;
            });
        d3.select("#tooltip_" + "pieChart")
            .attr("transform", function(d) {
                var mouseCoords = d3.mouse(this.parentNode);
                var xCo = mouseCoords[0] + 10;;
                var yCo = mouseCoords[0] + 10;
                return "translate(" + xCo + "," + yCo + ")";
            });
        //CBT:calculate tooltips text
        var tooltipData = JSON.parse(currentEl.attr("data"));
        var tooltipsText = "";
        d3.selectAll("#tooltipText_" + "pieChart").text("");
        var yPos = 0;
        d3.selectAll("#tooltipText_" + "pieChart").append("tspan").attr("x", 0).attr("y", yPos * 10).attr("dy", "1.9em").text(tooltipData["user_name"]).html(tooltipData["user_name"]+"  Actions:  " + d3.format("0.2f")(tooltipData["percentage"]) + "%");
        var dims = helpers.getDimensions("tooltipText_" + "pieChart");
        d3.selectAll("#tooltipText_" + "pieChart" + " tspan")
            .attr("x", dims.w + 2);

        d3.selectAll("#tooltipRect_" + "pieChart")
            .attr("width", dims.w + 10)
            .attr("height", dims.h + 20);
    });
    pathArea.on("mousemove", function(d) {
        var currentEl = d3.select(this);
        // console.log($("#tooltip_" + "pieChart"))
        d3.selectAll("#tooltip_" + "pieChart")
            .attr("transform", function(d) {
                var mouseCoords = d3.mouse(this.parentNode);
                var xCo = mouseCoords[0] + 10;
                var yCo = mouseCoords[1] + 10;
                return "translate(" + xCo + "," + yCo + ")";
            });
    });
    pathArea.on("mouseout", _.bind(function(d) {
        // var currentEl = d3.select(this);
        // console.log(this);
        // console.log(pathArea);
        // currentEl.attr("style", "fill-opacity:0.65;");

        if($('#arc-'+d.index).hasClass('lock')){

        }else{
        	$('#arc-'+d.index).css('fill-opacity',0.65);
        }
        d3.select("#tooltip_" + "pieChart")
            .style("opacity", function() {
                return 0;
            });
        d3.select("#tooltip_" + "pieChart").attr("transform", function(d, i) {
            var x = -500;
            var y = -500;
            return "translate(" + x + "," + y + ")";
        });
    },this));
    pathArea.on("click", _.bind(function(d) {
  		
  		// window.js = d3.selectAll('.arc')
  		 
  		if($('#arc-'+d.index).hasClass('lock')){
  			$('#arc-'+d.index).removeClass('lock');
  		}else{
  			for(let a=0;a<d3.selectAll('.arc')._groups[0].length;a++){
	  			$('#arc-'+a).removeClass('lock')
	  			$('#arc-'+a).css('fill-opacity',0.65);
	  		}
	  		$('#arc-'+d.index).css('fill-opacity',1);
  			$('#arc-'+d.index).addClass('lock');
  		}
  		
  		// removeClass('lock')
      // var currentEl = d3.select(this);
      // var tooltipData = JSON.parse(currentEl.attr("data"));
      // currentEl.attr("style", "fill-opacity:1;");
      this.statisticsTable.rows(function ( idx, data, node ) {
      	// console.log($(node).attr('user_id'))
      	$(node).attr('hideFromUser',0)
      	if($('#arc-'+d.index).hasClass('lock')){
      		if(!parseInt($(node).attr('hideFromEvent'))&&!parseInt($(node).attr('hideFromUser'))){
      			$(node).removeClass('hide');
      		}
	        if($(node).attr('user_id')!=d.data.user_id) 
	        {
	        	$(node).attr('hideFromUser',1)
	        	$(node).addClass('hide');
	        }
	      }else{
	      	// $(node).removeClass('hide');
	      	$(node).attr('hideFromUser',0)
	      	if(!parseInt($(node).attr('hideFromEvent'))&&!parseInt($(node).attr('hideFromUser'))){
      			$(node).removeClass('hide');
      		}
	      }
	    });
    },this));
	},
	pieChartRenderEvent(data) {

		let pieChartDisplay = [];
		this.uniqueEvent = [...new Set(data.map(user => user.event))];
		console.log(this.uniqueEvent);
		this.randomColor_event=[];
		this.uniqueEvent.forEach(_.bind(function(event,index){
			let record={};
			record['id'] = index
			record['event'] = event
			record['num_of_actions'] = data.filter(function(x){
				return x.event==event
			}).length
			record['user_name'] = data.filter(function(x){
				return x.event==event
			})[0].first_name + ' ' + data.filter(function(x){
				return x.event==event
			})[0].last_name
			pieChartDisplay.push(record);

			let heatmapPercent = record['num_of_actions']/data.length * 100;

			let hue = (190 + heatmapPercent  * 0.5)/ 360;
			console.log(hue)
			let heatmapColor = this.hslToRgb(hue,1,.5);
			this.randomColor_event.push(heatmapColor);

		},this));

		let width = $(".pieChartEvent").width(),
		    height = $(".pieChartEvent").width(),
				radius = Math.min(width * 0.8, height) / 2;	

		let g = this.svg_event.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

		var color = d3.scaleOrdinal(this.randomColor_event);

		let pie = d3.pie()
								.sort(null)
								.value(function(d) {
									return d.num_of_actions;
								});
		let path = d3.arc()
        .outerRadius(radius - 20)
        .innerRadius(0)
        .cornerRadius(5);

    let label = d3.arc()
        .outerRadius(radius - 40)
        .innerRadius(radius - 40);
    // console.log(pieChartDisplay);
    g.selectAll(".arcEvent").remove()
    // g = this.svg.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
    let arc = g.selectAll(".arcEvent")
        .data(pie(pieChartDisplay))
        .enter().append("g")
        .classed("arcEvent", true);
    let pathArea = arc.append("path")
        .attr("d", path)
        .attr("id", function(d, i) {
        		// console.log(i)
            return "arcEvent-" + i
        })
        .attr("style", "fill-opacity: 0.65;")
        .attr("fill", function(d) {
            return color(d.data.id);
        })
        .attr("data", function(d) {
            d.data["percentage"] = (d.endAngle - d.startAngle) / (2 * Math.PI) * 100;
            return JSON.stringify(d.data);
        }); 
    g.selectAll('#tooltip_pieChart_event').remove();
    let tooltipg = g.append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .attr("text-anchor", "end")
        .attr("id", "tooltip_pieChart_event")
        .attr("style", "opacity:0")
        .attr("transform", "translate(-500,-500)");

    tooltipg.append("rect")
        .attr("id", "tooltipRect_pieChart_event")
        .attr("x", 0)
        .attr("width", 120)
        .attr("height", 80)
        .attr("opacity", 0.8)
        .style("fill", "#000000");

    tooltipg
        .append("text")
        .attr("id", "tooltipText_pieChart_event")
        .attr("x", 30)
        .attr("y", 15)
        .attr("fill", "#fff")
        .style("font-size", 10)
        .style("font-family", "arial")
        .text(function(d, i) {
            return "";
        });

    // arc.append("text")
    //     .attr("transform", function(d) {
    //         return "translate(" + label.centroid(d) + ")";
    //     })
    //     .attr("dy", "0.35em")
    //     .text(function(d) {
    //         return d.data.num_of_actions;
    //     });

    arc.append("text")
        .attr("dx", 30)
        .attr("dy", -5)
        .append("textPath")
        .attr("xlink:href", function(d, i) {
            return "#arcEvent-" + i;
        })
        .text(function(d) {
            return d.data.event.toString();
        });
    let helpers = {
		    getDimensions: function(id) {
		        var el = document.getElementById(id);
		        var w = 0,
		            h = 0;
		        if (el) {
		            var dimensions = el.getBBox();
		            w = dimensions.width;
		            h = dimensions.height;
		        } else {
		            console.log("error: getDimensions() " + id + " not found.");
		        }
		        return {
		            w: w,
		            h: h
		        };
		    }
		}
    pathArea.on("mouseover", function(d) {
        var currentEl = d3.select(this);
        currentEl.attr("style", "fill-opacity:1;");

        var fadeInSpeed = 120;
        d3.select("#tooltip_" + "pieChart_event")
            .transition()
            .duration(fadeInSpeed)
            .style("opacity", function() {
            		// console.log($("#tooltip_" + "pieChart_event"))
                return 1;
            });
        d3.select("#tooltip_" + "pieChart_event")
            .attr("transform", function(d) {
                var mouseCoords = d3.mouse(this.parentNode);
                var xCo = mouseCoords[0] + 10;;
                var yCo = mouseCoords[0] + 10;
                return "translate(" + xCo + "," + yCo + ")";
            });
        //CBT:calculate tooltips text
        var tooltipData = JSON.parse(currentEl.attr("data"));
        var tooltipsText = "";
        d3.selectAll("#tooltipText_" + "pieChart_event").text("");
        var yPos = 0;
        d3.selectAll("#tooltipText_" + "pieChart_event").append("tspan").attr("x", 0).attr("y", yPos * 10).attr("dy", "1.9em").text(tooltipData["event"]).html(tooltipData["event"]+"  Actions:  " + d3.format("0.2f")(tooltipData["percentage"]) + "%");
        var dims = helpers.getDimensions("tooltipText_" + "pieChart_event");
        d3.selectAll("#tooltipText_" + "pieChart_event" + " tspan")
            .attr("x", dims.w + 2);

        d3.selectAll("#tooltipRect_" + "pieChart_event")
            .attr("width", dims.w + 10)
            .attr("height", dims.h + 20);
    });
    pathArea.on("mousemove", function(d) {
        var currentEl = d3.select(this);
        // console.log($("#tooltip_" + "pieChart_event"))
        d3.selectAll("#tooltip_" + "pieChart_event")
            .attr("transform", function(d) {
                var mouseCoords = d3.mouse(this.parentNode);
                var xCo = mouseCoords[0] + 10;
                var yCo = mouseCoords[1] + 10;
                return "translate(" + xCo + "," + yCo + ")";
            });
    });
    pathArea.on("mouseout", _.bind(function(d) {
        // var currentEl = d3.select(this);
        // console.log(this);
        // console.log(pathArea);
        // currentEl.attr("style", "fill-opacity:0.65;");

        if($('#arcEvent-'+d.index).hasClass('lock')){

        }else{
        	$('#arcEvent-'+d.index).css('fill-opacity',0.65);
        }
        d3.select("#tooltip_" + "pieChart_event")
            .style("opacity", function() {
                return 0;
            });
        d3.select("#tooltip_" + "pieChart_event").attr("transform", function(d, i) {
            var x = -500;
            var y = -500;
            return "translate(" + x + "," + y + ")";
        });
    },this));
    pathArea.on("click", _.bind(function(d) {
  		
  		// window.js = d3.selectAll('.arcEvent')
  		 
  		if($('#arcEvent-'+d.index).hasClass('lock')){
  			$('#arcEvent-'+d.index).removeClass('lock');
  		}else{
  			for(let a=0;a<d3.selectAll('.arcEvent')._groups[0].length;a++){
	  			$('#arcEvent-'+a).removeClass('lock')
	  			$('#arcEvent-'+a).css('fill-opacity',0.65);
	  		}
	  		$('#arcEvent-'+d.index).css('fill-opacity',1);
  			$('#arcEvent-'+d.index).addClass('lock');
  		}
  		
  		// removeClass('lock')
      // var currentEl = d3.select(this);
      // var tooltipData = JSON.parse(currentEl.attr("data"));
      // currentEl.attr("style", "fill-opacity:1;");
      // let reconstructData = data;
      this.statisticsTable.rows(function ( idx, DATA, node ) {
      	// console.log($(node).attr('user_id'))
      	if($('#arcEvent-'+d.index).hasClass('lock')){
      		// $(node).removeClass('hide');
      		
      		$(node).attr('hideFromEvent',0);
      		// console.log($(node).attr('hideFromEvent'))
      		if(!parseInt($(node).attr('hideFromEvent'))){
      			// console.log($(node).attr('hideFromUser'))
      			if(!parseInt($(node).attr('hideFromUser'))){
      				$(node).removeClass('hide');
      			}
      			
      		}

	        if($(node).attr('event')!=d.data.event) 
	        {
	        	$(node).attr('hideFromEvent',1)
	        	$(node).addClass('hide');
	        	// reconstructData = reconstructData.filter(function(el) { return el.id !== DATA.id; });
	        }
	      }else{
	      	$(node).attr('hideFromEvent',0)
	      	if(!parseInt($(node).attr('hideFromEvent'))&&!parseInt($(node).attr('hideFromUser'))){
      			$(node).removeClass('hide');
      		}
	      	// $(node).removeClass('hide');
	      }
	    });
	    // this.pieChartRenderUser(reconstructData);
    },this));
	},
	hslToRgb(h, s, l){
	    var r, g, b;

	    if(s == 0){
	        r = g = b = l; // achromatic
	    }else{
	        function hue2rgb(p, q, t){
	            if(t < 0) t += 1;
	            if(t > 1) t -= 1;
	            if(t < 1/6) return p + (q - p) * 6 * t;
	            if(t < 1/2) return q;
	            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
	            return p;
	        }

	        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	        var p = 2 * l - q;
	        r = hue2rgb(p, q, h + 1/3);
	        g = hue2rgb(p, q, h);
	        b = hue2rgb(p, q, h - 1/3);
	    }

	    return 'rgb('+Math.floor(r * 255)+','+ Math.floor(g * 255)+','+ Math.floor(b * 255)+')';
	}

});

export default protocol;