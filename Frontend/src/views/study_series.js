
import _ from 'underscore'
import $ from 'jquery'

import Study_seriesModel from '../models/study_series'
import Study_seriesCollection from '../collections/study_series'

import Download_series from '../collections/download_series'

import '../stylesheets/infoTable.styl'
import '../stylesheets/dicomInfoTable.styl'
import InfoTableHeader from '../templates/infoTableHeader.pug'
import InfoTableList from '../templates/infoTableList.pug'

var study_series = Backbone.View.extend({
  events: {
    // 'click .fa-download':'downloadSerie',
    'click .fa-eye': function (e) {
      $('.eye-red').removeClass('eye-red')

      // $("i[id*='"+e.currentTarget.id+"']").addClass('eye-red');
      $(e.target).addClass('eye-red')
      console.log(e.target)

      document.getElementById('dropZone').innerHTML = ''
		    $('#status').removeClass('alert-warning alert-success alert-danger').addClass('alert-info')
		    $('#warnings').empty()
		    document.getElementById('statusText').innerHTML = 'Status: Loading file, please wait..'

		    // Load the WADO object
		    var url = e.currentTarget.id

		    var oReq = new XMLHttpRequest()
		    try {
		        oReq.open('get', url, true)
		    } catch (err) {
		        $('#status').removeClass('alert-success alert-info alert-warning').addClass('alert-danger')
		        document.getElementById('statusText').innerHTML = 'Status: Error - ' + err + '  If you are using Internet Explorer, try using another browser like Google Chrome'
		        return false
		    }
		    oReq.responseType = 'arraybuffer'
		    oReq.onreadystatechange = _.bind(function (oEvent) {
		        if (oReq.readyState == 4) {
		            if (oReq.status == 200) {
		                var byteArray = new Uint8Array(oReq.response)
		                this.dumpByteArray(byteArray)
		            } else {
		                $('#status').removeClass('alert-success alert-info alert-warning').addClass('alert-danger')
		                document.getElementById('statusText').innerHTML = 'Status: HTTP Error - status code ' + oReq.status + '; error text = ' + oReq.statusText
		            }
		        }
		    }, this)
    		oReq.send()

    		return false
    }
  },
  initialize (setting) {
    //	console.log(this);

    this.setting = setting
    this.Study_seriesCollection = new Study_seriesCollection({
      urlBase: this.setting.urlBase,
      study_id: this.setting.study_id
    })
  },
  render () {
    this.Study_seriesCollectionSave = new Study_seriesCollection()
    this.$el.html(InfoTableHeader())
    this.Study_seriesCollection.fetch({
      xhrFields: {
				  withCredentials: true
      },
      success: _.bind(function (res) {
        _.each(res.toJSON(), _.bind(function (eachStudy) {
          this.$('.infoList').append(InfoTableList({
            list: eachStudy,
            urlBase: this.setting.urlBase,
            resoure: 'downloadSeries',
            patient_path: this.setting.patient_path,
            study_path: this.setting.study_path
          }))
        }, this))
      }, this)
    })
    return this
  },
  /* downloadSerie(e){
		console.log(e.currentTarget.id);
		this.Download_series = new Download_series({
			urlBase:this.setting.urlBase,
			params:e.currentTarget.id
		});
		this.Download_series.fetch();
	},
*/

  dumpByteArray: function (byteArray) {
    function dumpEncapsulatedInfo (dataSet) {
	    var transferSyntax = dataSet.string('x00020010')
	    if (transferSyntax === undefined) {
	        return
	    }
	    if (isTransferSyntaxEncapsulated(transferSyntax) === false) {
	        return
	    }
	    var numFrames = dataSet.intString('x00280008')
	    if (numFrames === undefined) {
	        numFrames = 1
	    }
	    for (var frame = 0; frame < numFrames; frame++) {
	        var pixelData = dicomParser.readEncapsulatedPixelData(dataSet, frame)
	    }
    }
    function isTransferSyntaxEncapsulated (transferSyntax) {
	    if (transferSyntax === '1.2.840.10008.1.2.4.50') // jpeg baseline
	    {
	        return true
	    }
	    return false
    }

    function isASCII (str) {
	    return /^[\x00-\x7F]*$/.test(str)
    }
    function dumpDataSet (dataSet, output) {
	    function getTag (tag) {
	        var group = tag.substring(1, 5)
	        var element = tag.substring(5, 9)
	        var tagIndex = ('(' + group + ',' + element + ')').toUpperCase()
	        var attr = TAG_DICT[tagIndex]
	        return attr
	    }

	    // the dataSet.elements object contains properties for each element parsed.  The name of the property
	    // is based on the elements tag and looks like 'xGGGGEEEE' where GGGG is the group number and EEEE is the
	    // element number both with lowercase hexadecimal letters.  For example, the Series Description DICOM element 0008,103E would
	    // be named 'x0008103e'.  Here we iterate over each property (element) so we can build a string describing its
	    // contents to add to the output array
	    for (var propertyName in dataSet.elements) {
	        var element = dataSet.elements[propertyName]

	        var text = ''

	        var color = 'black'

	        var tag = getTag(element.tag)
	        // The output string begins with the element name (or tag if not in data dictionary), length and VR (if present).  VR is undefined for
	        // implicit transfer syntaxes
	        if (tag === undefined) {
	            text += element.tag
	            text += '; length=' + element.length

	            if (element.hadUndefinedLength) {
	                text += ' <strong>(-1)</strong>'
	            }

	            if (element.vr) {
	                text += ' VR=' + element.vr + '; '
	            }

	            // make text lighter since this is an unknown attribute
	            color = '#C8C8C8'
	        } else {
	            text += tag.name
	            text += '(' + element.tag + ') :'
	        }

        // Here we check for Sequence items and iterate over them if present.  items will not be set in the
        // element object for elements that don't have SQ VR type.  Note that implicit little endian
        // sequences will are currently not parsed.
	        if (element.items) {
	            output.push('<li>' + text + '</li>')
	            output.push('<ul>')

	            // each item contains its own data set so we iterate over the items
	            // and recursively call this function
	            var itemNumber = 0
	            element.items.forEach(function (item) {
	                output.push('<li>Item #' + itemNumber++ + '</li>')
	                output.push('<ul>')
	                dumpDataSet(item.dataSet, output)
	                output.push('</ul>')
	            })
	            output.push('</ul>')
	        } else {
	            // use VR to display the right value
	            var vr
	            if (element.vr !== undefined) {
	                vr = element.vr
	            } else {
	                if (tag !== undefined) {
	                    vr = tag.vr
	                }
	            }

	            // if the length of the element is less than 128 we try to show it.  We put this check in
	            // to avoid displaying large strings which makes it harder to use.
	            if (element.length < 128) {
	                // Since the dataset might be encoded using implicit transfer syntax and we aren't using
	                // a data dictionary, we need some simple logic to figure out what data types these
	                // elements might be.  Since the dataset might also be explicit we could be switch on the
	                // VR and do a better job on this, perhaps we can do that in another example

	                // First we check to see if the element's length is appropriate for a UI or US VR.
	                // US is an important type because it is used for the
	                // image Rows and Columns so that is why those are assumed over other VR types.
	                if (element.vr === undefined && tag === undefined) {
	                    if (element.length === 2) {
	                        text += ' (' + dataSet.uint16(propertyName) + ')'
	                    } else if (element.length === 4) {
	                        text += ' (' + dataSet.uint32(propertyName) + ')'
	                    }

	                    // Next we ask the dataset to give us the element's data in string form.  Most elements are
	                    // strings but some aren't so we do a quick check to make sure it actually has all ascii
	                    // characters so we know it is reasonable to display it.
	                    var str = dataSet.string(propertyName)
	                    var stringIsAscii = isASCII(str)

	                    if (stringIsAscii) {
	                        // the string will be undefined if the element is present but has no data
	                        // (i.e. attribute is of type 2 or 3 ) so we only display the string if it has
	                        // data.  Note that the length of the element will be 0 to indicate "no data"
	                        // so we don't put anything here for the value in that case.
	                        if (str !== undefined) {
	                            text += '"' + str + '"'
	                        }
	                    } else {
	                        if (element.length !== 2 && element.length !== 4) {
	                            color = '#C8C8C8'
	                            // If it is some other length and we have no string
	                            text += '<i>binary data</i>'
	                        }
	                    }
	                } else {
	                    function isStringVr (vr) {
	                        if (vr === 'AT' ||
	                                vr === 'FL' ||
	                                vr === 'FD' ||
	                                vr === 'OB' ||
	                                vr === 'OF' ||
	                                vr === 'OW' ||
	                                vr === 'SI' ||
	                                vr === 'SQ' ||
	                                vr === 'SS' ||
	                                vr === 'UL' ||
	                                vr === 'US'
	                                ) {
	                            return false
	                        }
	                        return true
	                    }

	                    if (isStringVr(vr)) {
	                        // Next we ask the dataset to give us the element's data in string form.  Most elements are
	                        // strings but some aren't so we do a quick check to make sure it actually has all ascii
	                        // characters so we know it is reasonable to display it.
	                        var str = dataSet.string(propertyName)
	                        var stringIsAscii = isASCII(str)

	                        if (stringIsAscii) {
	                            // the string will be undefined if the element is present but has no data
	                            // (i.e. attribute is of type 2 or 3 ) so we only display the string if it has
	                            // data.  Note that the length of the element will be 0 to indicate "no data"
	                            // so we don't put anything here for the value in that case.
	                            if (str !== undefined) {
	                                text += '"' + str + '"'
	                            }
	                        } else {
	                            if (element.length !== 2 && element.length !== 4) {
	                                color = '#C8C8C8'
	                                // If it is some other length and we have no string
	                                text += '<i>binary data</i>'
	                            }
	                        }
	                    } else if (vr == 'US') {
	                        text += dataSet.uint16(propertyName)
	                    } else if (vr === 'SS') {
	                        text += dataSet.int16(propertyName)
	                    } else if (vr == 'UL') {
	                        text += dataSet.uint32(propertyName)
	                    } else if (vr === 'SL') {
	                        text += dataSet.int32(propertyName)
	                    } else if (vr == 'FD') {
	                        text += dataSet.double(propertyName)
	                    } else if (vr == 'FL') {
	                        text += dataSet.float(propertyName)
	                    } else if (vr === 'OB' || vr === 'OW' || vr === 'UN' || vr === 'OF' || vr === 'UT') {
	                        color = '#C8C8C8'
	                        // If it is some other length and we have no string
	                        text += '<i>binary data of length ' + element.length + ' and VR ' + vr + '</i>'
	                    } else {
	                        // If it is some other length and we have no string
	                        text += '<i>no display code for VR ' + vr + ' yet, sorry!</i>'
	                    }
	                }

	                if (element.length === 0) {
	                    color = '#C8C8C8'
	                }
	            } else {
	                color = '#C8C8C8'

	                // Add text saying the data is too long to show...
	                text += '<i>data of length ' + element.length + ' for VR + ' + vr + ' too long to show</i>'
	            }
	        }
	        // finally we add the string to our output array surrounded by li elements so it shows up in the
	        // DOM as a list
	        output.push('<li style="color:' + color + ';">' + text + '</li>')
    	}
    }
    // Here we have the file data as an ArrayBuffer.  dicomParser requires as input a
    // Uint8Array so we create that here
    var kb = byteArray.length / 1024
    var mb = kb / 1024
    var byteStr = mb > 1 ? mb.toFixed(3) + ' MB' : kb.toFixed(0) + ' KB'
    document.getElementById('statusText').innerHTML = 'Status: Parsing ' + byteStr + ' bytes, please wait..'
    // set a short timeout to do the parse so the DOM has time to update itself with the above message
    setTimeout(function () {
      // Invoke the paresDicom function and get back a DataSet object with the contents
      var dataSet
      try {
        var start = new Date().getTime()
        dataSet = dicomParser.parseDicom(byteArray)
        // Here we call dumpDataSet to recursively iterate through the DataSet and create an array
        // of strings of the contents.
        var output = []
        dumpDataSet(dataSet, output)
        // Combine the array of strings into one string and add it to the DOM
        document.getElementById('dropZone').innerHTML = '<ul>' + output.join('') + '</ul>'

        var end = new Date().getTime()
        var time = end - start
        if (dataSet.warnings.length > 0) {
          $('#status').removeClass('alert-success alert-info alert-danger').addClass('alert-warning')
          $('#statusText').html('Status: Warnings encountered while parsing file (file of size ' + byteStr + ' parsed in ' + time + 'ms)')

          dataSet.warnings.forEach(function (warning) {
            $('#warnings').append('<li>' + warning + '</li>')
          })
        } else {
          var pixelData = dataSet.elements.x7fe00010
          if (pixelData) {
            $('#status').removeClass('alert-warning alert-info alert-danger').addClass('alert-success')
            $('#statusText').html('Status: Ready (file of size ' + byteStr + ' parsed in ' + time + 'ms)')
          } else {
            $('#status').removeClass('alert-warning alert-info alert-danger').addClass('alert-success')
            $('#statusText').html('Status: Ready - no pixel data found (file of size ' + byteStr + ' parsed in ' + time + 'ms)')
          }
        }

        // dump encapsulated data info
        dumpEncapsulatedInfo(dataSet)
      } catch (err) {
        $('#status').removeClass('alert-success alert-info alert-warning').addClass('alert-danger')
        document.getElementById('statusText').innerHTML = 'Status: Error - ' + err + ' (file of size ' + byteStr + ' )'
      }
    }, 10)
  }

})
export default study_series
