import Backbone from 'backbone';

var View = Backbone.View.extend({
	close:function () {
	    // console.log('Unbinding events for ' + this.cid);
	    this.remove();
	    this.unbind();

	    if (this.onClose) {
	        this.onClose();
	    }
	}
});

export default View;