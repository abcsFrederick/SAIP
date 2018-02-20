import Backbone from 'backbone';

Backbone.View.prototype.close = function () {
    console.log('Unbinding events for ' + this.cid);
    this.remove();
    this.unbind();

    if (this.onClose) {
        this.onClose();
    }
};