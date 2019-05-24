import View from '../View';
import _ from 'underscore';
import ExperimentInfoDetailsContentTemplate from '../../templates/experiments/experimentInfoDetailsContent.pug';
var experimentInfoDetailsContent = View.extend({
	initialize(setting){
		this.experimentInfo = setting.experimentInfo;
		this.admin = setting.admin;
		this.probes = setting.probes;
		this.domain = setting.domain;
		this.experiment_id = parseInt(setting.experiment_id);
		this.experimentInfoDetails = this.experimentInfo.filter(x => x.id === this.experiment_id);

		this.description = this.experimentInfoDetails[0].description;
		this.probe_id = this.experimentInfoDetails[0].probe_id;
		if(this.probe_id){
			this.probe = this.probes.models.filter(x=>x.get('id')===this.probe_id);
			console.log(this.probe[0])
			this.probe_name = this.probe[0].get('name');
			this.probe_description = this.probe[0].get('description');
		}
		
		this.$el.html(ExperimentInfoDetailsContentTemplate({
			admin:this.is_admin,
			probe_name:this.probe_name||null,
			probe_description:this.probe_description||null,
			description:this.description
		}));
	},
});
export default experimentInfoDetailsContent;