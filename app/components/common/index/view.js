define(function(require, exports, module) {
  var constructor;

  constructor = function() {

    $(document).on("click", "body", sayHello);
  }

  /**
   * [sayHello description]
   * @param  {[type]} event [description]
   * @return {[type]}       [description]
   */
  function sayHello(event){
    console.log("Hello !");
  }

  module.exports = {
    constructor: constructor
  };
  
});
