jQuery.noConflict();
(function ($, PLUGIN_ID) {
  "use strict";

  function getTaskById(id){
    return new Promise((resolve,reject)=>{
      var body = {
        "app": kintone.app.getId(),
        "id" : id
      }
      kintone.api(kintone.api.url("/k/v1/record", true),'GET', body, function(resp){
        resolve(resp);
      },
      function(error) {
        reject(error);
      });
    })  
  }
  kintone.events.on("app.record.index.show",function (events) {
    var a = console.log(getTaskById);
    console.log(a);
  });

})(jQuery, kintone.$PLUGIN_ID);