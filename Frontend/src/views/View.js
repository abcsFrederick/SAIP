import Backbone from 'backbone'

var View = Backbone.View.extend({
  close: function () {
    // console.log('Unbinding events for ' + this.cid);
    this.remove()
    this.unbind()

    if (this.onClose) {
      this.onClose()
    }
  },
  stringFilter: function (str) {
    return str.replace(/[%/^]/g, '_').replace(/[#]/g, 'No.');
  }
})

export default View
