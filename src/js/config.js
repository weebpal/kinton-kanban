jQuery.noConflict();

(function ($, PLUGIN_ID) {
  "use strict";

// INIT START
  var appId = kintone.app.getId();
  var init_view_complete = false;
  var init_status_complete = false;
  var init_form_complete = false;
  var init_config_complete = false;
  var defaultColors = getDefaultColor();
  var preSetColors = getPreSetColors(); 
  var config_index = {};    


// INIT COMPLETE



  var $form = $(".js-submit-settings");
  var $cancelButton = $(".js-cancel-button");
  var $message = $(".js-text-message");
  var linkKanban = $('#link-kanban');
  var flag = 0;
  var config = kintone.plugin.app.getConfig(PLUGIN_ID);

  function idKanban(){
    return new Promise((resolve,reject)=>{
      var body = {
        "app": kintone.app.getId(),
        "lang": "en"
      };
    
      kintone.api(kintone.api.url('/k/v1/app/views', true), 'GET', body, function(resp) { 
        console.log(resp);
        resolve(resp.views['Kanban Board'].id);
      }, function(error) {
          reject(error);
      });
    })
    
  }

  function getDefaultColor(){
    return {
      "Backlog": "BLACK",
      "In Progress": "BLUE",
      "ReOpened": "YELLOW",
      "Resolved": "GREEN",
      "In Review": "PURPLE",
      "Done": "ORANGE"
    };
  }

  function getPreSetColors(){
    return ["BLACK","YELLOW","BLUE","GREEN","PURPLE","RED","BABY BLUE","ORANGE","SILVER","PINK","LIME","VIOLET","SKY BLUE","FOREST","BRICK"];
  }

  function getDefaultStatus(){
    return ["Backlog","In Progress","ReOpened","Resolved","In Review","Done"];
  }
 
// INIT START
  console.log("1");

  function initView() {
    return new Promise((resolve,reject)=>{
      console.log("3");
     var body = {
      app: appId,
      views: {
        "Kanban Board": {
          type: "CUSTOM",
          html: '<div id="kanban-view"></div>',
          pager: true,
          name: "Kanban Board",
          index: 1,
          device: "ANY"
        },
      },
    };
    console.log("3.1");
    // console.log(kintone);
    kintone.api(
      kintone.api.url("/k/v1/preview/app/views", true),
      "PUT",
      body,
      function(resp) {
        init_view_complete = true;
        resolve(resp);
        console.log("init View: success");
      },
      function(error) {
        resolve(1);
        init_view_complete = true;
        console.log("init view: error");
      }
    );
    console.log("3.2");

    })
  }

  function initStatus(){
    return new Promise((resolve,reject)=>{
      console.log("4");
      var body = {
        "app": appId,
        "enable": true,
        "states": {
          "Backlog": {
            "name": "Backlog",
            "index": "0",
            "assignee": {
              "type": "ONE",
              "entities": [
                {
                  "entity": {
                      "type": "FIELD_ENTITY",
                      "code": "Created_by"
                  },
                  "includeSubs": false
                }
              ]
            }
          },
          "In Progress": {
            "name": "In Progress",
            "index": "1",
            "assignee": {
              "type": "ONE",
              "entities": [
                  {
                  "entity": {
                      "type": "GROUP",
                      "code": "everyone"
                  },
                  "includeSubs": false
                }
              ]
            }
          },
          "ReOpened": {
            "name": "ReOpened",
            "index": "2",
            "assignee": {
              "type": "ONE",
              "entities": [
                {
                  "entity": {
                      "type": "GROUP",
                      "code": "everyone"
                  },
                  "includeSubs": false
                }
              ]
            }
          },
          "Resolved": {
            "name": "Resolved",
            "index": "3",
            "assignee": {
              "type": "ONE",
              "entities": [
                {
                  "entity": {
                      "type": "GROUP",
                      "code": "everyone"
                  },
                  "includeSubs": false
                }
              ]
            }
          },
          "In Review": {
            "name": "In Review",
            "index": "4",
            "assignee": {
              "type": "ONE",
              "entities": [
                {
                  "entity": {
                      "type": "GROUP",
                      "code": "everyone"
                  },
                  "includeSubs": false
                }
              ]
            }
          },
          "Done": {
            "name": "Done",
            "index": "5",
            "assignee": {
              "type": "ONE",
              "entities": [
                {
                  "entity": {
                      "type": "GROUP",
                      "code": "everyone"
                  },
                  "includeSubs": false
                }
              ]
            }
          }
        },
        "actions": [{
            "name": "In Progress",
            "from": "Backlog",
            "to": "In Progress",
            "filterCond": ""
          },
          {
            "name": "ReOpened",
            "from": "In Progress",
            "to": "ReOpened",
            "filterCond": ""
          },
          {
            "name": "Resolved",
            "from": "In Progress",
            "to": "Resolved",
            "filterCond": ""
          },
          {
            "name": "Resolved",
            "from": "ReOpened",
            "to": "Resolved",
            "filterCond": ""
          },
          {
            "name": "ReOpened",
            "from": "Resolved",
            "to": "ReOpened",
            "filterCond": ""
          },
          {
            "name": "In Review",
            "from": "Resolved",
            "to": "In Review",
            "filterCond": ""
          },
          {
            "name": "ReOpened",
            "from": "In Review",
            "to": "ReOpened",
            "filterCond": ""
          },
          {
            "name": "Done",
            "from": "In Review",
            "to": "Done",
            "filterCond": ""
          },
          {
            "name": "Done",
            "from": "Done",
            "to": "Done",
            "filterCond": ""
          }
        ]
      };
      kintone.api(kintone.api.url('/k/v1/preview/app/status', true), 'PUT', body, function(resp) {
        resolve(resp);
        console.log("init status: success");
      }, function(error) {
        resolve(1);
        console.log("init status: error");
      });   
    })
  }

  function initForm(){
    return new Promise((resolve,reject)=>{
      console.log("5");
      var body = {
        'app': appId,
        'properties': {
          'name': {
            'type': 'SINGLE_LINE_TEXT',
            'code': 'name',
            'label': 'Subject',
            'noLabel': false,
            'required': true,
            'minLength': '',
            'maxLength': '',
            'expression': '',
            'hideExpression': false,
            'unique': false,
            'defaultValue': ''
          },
          "color":{
            "code": "color",
            "defaultValue": "Yellow",
            "label": "Color",
            "noLabel": false,
            "options": {
                "Blue": {"label": "Blue", "index": "2"},
                "Cadet Blue": {"label": "Cadet Blue", "index": "14"},
                "Cyan": {"label": "Cyan", "index": "7"},
                "Dark Green": {"label": "Dark Green", "index": "17"},
                "Fire brick": {"label": "Fire brick", "index": "8"},
                "Gold": {"label": "Gold", "index": "16"},
                "Goldenrod": {"label": "Goldenrod", "index": "9"},
                "Green": {"label": "Green", "index": "1"},
                "Indigo": {"label": "Indigo", "index": "13"},
                "Lime": {"label": "Lime", "index": "18"},
                "Magenta": {"label": "Magenta", "index": "6"},
                "Misty Rose": {"label": "Misty Rose", "index": "11"},
                "Navy": {"label": "Navy", "index": "10"},
                "Olive Drab": {"label": "Olive Drab", "index": "15"},
                "Orange": {"label": "Orange", "index": "4"},
                "Pink": {"label": "Pink", "index": "19"},
                "Purple": {"label": "Purple", "index": "5"},
                "Red": {"label": "Red", "index": "3"},
                "Silver": {"label": "Silver", "index": "12"},
                "Yellow": {"label": "Yellow", "index": "0"},
            },
            "required": false,
            "type": "DROP_DOWN"
          },
          "field_label_1":{
            "code": "field_label_1",
            "defaultValue": "",
            "expression": "",
            "hideExpression": false,
            "label": "Label",
            "maxLength": "",
            "minLength": "",
            "noLabel": false,
            "required": false,
            "type": "SINGLE_LINE_TEXT",
            "unique": false,
          },
          "field_label":{
            "code": "field_label",
            "defaultValue": [],
            "label": "Label",
            "noLabel": false,
            "options": {
              "Css": {"label": "Css", "index": "1"}, 
              "Dev": {"label": "Dev", "index": "0"}
            },
            "required": false,
            "type": "MULTI_SELECT",
          },
          "User_selection":{
            "code": "User_selection",
            "defaultValue": [],
            "entities": [],
            "label": "User selection",
            "noLabel": false,
            "required": false,
            "type": "USER_SELECT",
          },
          "Group_selection":{
            "code": "Group_selection",
            "defaultValue": [],
            "entities": [],
            "label": "Group selection",
            "noLabel": false,
            "required": false,
            "type": "GROUP_SELECT",
          },
          "content": {
            "type": "MULTI_LINE_TEXT",
            "code": "content",
            "label": "Description",
            "noLabel": false,
            "required": false,
            "defaultValue": ""
          },
          "file": {
            "type": "FILE",
            "code": "file",
            "label": "File",
            "noLabel": false,
            "required": false,
            "thumbnailSize": "150"
          },
          "field_startDate": {
            "type": "DATE",
            "code": "field_startDate",
            "label": "Start Date",
            "noLabel": false,
            "required": false,
            "unique": false,
            "defaultValue": "",
            "defaultNowValue": true
          },
          "field_endDate": {
            "code": "field_endDate",
            "defaultNowValue": false,
            "defaultValue": "",
            "label": "Due Date",
            "noLabel": false,
            "required": true,
            "type": "DATETIME",
            "unique": false,
          },
          "field_manual_time": {
            "code": "field_manual_time",
            "defaultNowValue": true,
            "defaultValue": "",
            "label": "Manual time entry",
            "noLabel": false,
            "required": false,
            "type": "TIME",
          },
          "field_recurring":{
            "align": "HORIZONTAL",
            "code": "field_recurring",
            "defaultValue": [],
            "label": "Recurring",
            "noLabel": false,
            "options": {
              "Repeat": {
                "label": "Repeat", "index": "0"
              }
            },
            "required": false,
            "type": "CHECK_BOX",
          },
          "field_recurring_status" :{
            "align": "HORIZONTAL",
            "code": "field_recurring_status",
            "defaultValue": "False",
            "label": "Recurring Status",
            "noLabel": false,
            "options": {
              "False": {"label": "False", "index": "1"},
              "True": {"label": "True", "index": "0"}
            },
            "required": true,
            "type": "RADIO_BUTTON",
          },
          "field_recurring_day" : {
            "align": "HORIZONTAL",
            "code": "field_recurring_day",
            "defaultValue": "Daily",
            "label": "Repeat",
            "noLabel": false,
            "options": {
              "Daily": {"label": "Daily", "index": "0"},
              "Monthly": {"label": "Monthly", "index": "2"},
              "Weekly": {"label": "Weekly", "index": "1"}
            },
            "required": true,
            "type": "RADIO_BUTTON"
          },
          "parent_id":{
            "code":"parent_id",
            "defaultValue":"",
            "expression":"",
            "hideExpression":false,
            "label":"Parent Id",
            "maxLength":"",
            "minLength":"",
            "noLabel":false,
            "required":false,
            "type":"SINGLE_LINE_TEXT",
            "unique":false
          },
          "Related_records":{
            "code":"Related_records",
            "label":"Related records",
            "noLabel":false,
            "referenceTable":{
              "condition":{
                "field":"field_id",
                "relatedField":"parent_id"
              },
              "displayFields":[
                "name",
                "Status",
                "Assignee",
                "field_startDate",
                "field_endDate"
              ],
              "filterCond":"",
              "relatedApp":{
                "app":kintone.app.getId(),
                "code":""
              },
              "size":"5",
              "sort":"Record_number asc"
            },
            "type":"REFERENCE_TABLE"
          },
          "field_id":{
            "code": "field_id",
            "defaultValue": "",
            "expression": "",
            "hideExpression": false,
            "label": "Task ID",
            "maxLength": "",
            "minLength": "",
            "noLabel": false,
            "required": false,
            "type": "SINGLE_LINE_TEXT",
            "unique": false,
          }
        },
      };

      kintone.api(kintone.api.url('/k/v1/preview/app/form/fields', true), 'POST', body, function(resp) {
        console.log("init form: success");
        resolve(resp);
      }, function(error) {
        resolve(1);
        console.log("init form: error");
      });
    })
  }

  function initConfig(){
    return new Promise((resolve,reject)=>{
      console.log(getDefaultStatus());
      var newConfig = [];
      getDefaultStatus().forEach((element, index) => {
        newConfig.push({
          name: element,
          disabled: false,
          color: defaultColors[element],
        });
      });
      var finalConfig = {
        kanbanSettings : '{init:true}',
        message        : JSON.stringify({ status : newConfig , display : "kanban-board-fixed"})
      }
      kintone.plugin.app.setConfig(
        finalConfig,
        function(resp){
          console.log("Config success");
          resolve(resp);
        }
      );
    })
  }

  function updateApp(){
    return new Promise((resolve,reject)=>{
      var params = {
        apps: [{
          app: appId
        }]
      };
      kintone.api(
        kintone.api.url("/k/v1/preview/app/deploy", true),
        "POST",
        params,
        function(resp) {
          console.log("update app success");
          resolve(resp);
        }
      );
    })
  }

  function initLayout()
  {
    return new Promise((resolve,reject)=>{
       var body = 
    {
      "app" : appId,
      "layout" : [
        {
          "type": "ROW",
          "fields": [
            {
               "type":"SINGLE_LINE_TEXT",
               "code": "name",
               "size": {
                 "width": 200
                }  
            },
          ] 
        },
        {
          "type": "ROW",
          "fields": [
            {
              "code": "color",
              "size": {
                "width": "196"
              },
              "type": "DROP_DOWN",
            }
          ]
        },
        {
          "type": "ROW",
          "fields": [
            {
              "code": "field_label_1",
              "size": {
                "width": "300"
              },
              "type": "SINGLE_LINE_TEXT",
            }
          ]
        },  
        {
          "type": "ROW",
          "fields": [
            {
              "code": "field_label",
              "size": {
                "width": "197"
              },
              "type": "MULTI_SELECT",
            }
          ]
        },
        {
          "type": "ROW",
          "fields": [
            {
              "code": "User_selection",
              "size": {
                "width": "344"
              },
              "type": "USER_SELECT",
            }
          ]
        },
        {
          "type": "ROW",
          "fields": [
            {
              "code": "Group_selection",
              "size": {
                "width": "344"
              },
              "type": "GROUP_SELECT",
            }
          ]
        },
        {
          "type": "ROW",
          "fields": [
            {
               "type":"MULTI_LINE_TEXT",
               "code": "content",
               "size": {
                 "width": 400
                }  
            },
          ] 
        },
        {
          "type": "ROW",
          "fields": [
            {
               "type":"FILE",
               "code": "file",
               "size": {
                 "width": 400
                }  
            },
          ] 
        },
        {
          "type": "ROW",
          "fields": [
            {
              "type":"DATE",
              "code": "field_startDate",
              "size": {
                "width": 200
              }  
            },
            {
              "type":"DATETIME",
              "code": "field_endDate",
              "size": {
                "width": 200
              }  
            }
          ] 
        },
        {
          "type": "ROW",
          "fields": [
            {
              "code": "field_manual_time",
              "size": {
                "width": "143"
              },
              "type": "TIME",
            }
          ]
        },
        {
          "type": "ROW",
          "fields": [
            {
              "code": "field_recurring",
              "size": {
                "width": "241"
              },
              "type": "CHECK_BOX",
            }
          ]
        },
        {
          "type": "ROW",
          "fields": [
            {
              "code": "field_recurring_status",
              "size": {
                "width": "240"
              },
              "type": "RADIO_BUTTON",
            }
          ]
        },
        {
          "type": "ROW",
          "fields": [
            {
              "code": "field_recurring_day",
              "size": {
                "width": "368"
              },
              "type": "RADIO_BUTTON",
            }
          ]
        },
        {
          "type": "ROW",
          "fields": [
            {
              "code": "parent_id",
              "size": {
                "width": "194"
              },
              "type": "SINGLE_LINE_TEXT",
            }
          ]
        },
        {
          "type": "ROW",
          "fields": [
            {
              "code": "Related_records",
              "type": "REFERENCE_TABLE",
            }
          ]
        },
        {
          "type": "ROW",
          "fields": [
            {
              "code": "field_id",
              "size": {
                "width": "194"
              },
              "type": "SINGLE_LINE_TEXT",
            }
          ]
        }
      ]
    }
      kintone.api(kintone.api.url('/k/v1/preview/app/form/layout',true),'PUT', body,function(resp){
        console.log("success set layout");
        resolve(resp);
      },function(error)
      {
        reject(error);
      })
      })
  };

  async function initKanban(){
    await initView();
    await initStatus();
    await initForm();
    await initLayout();
    await initConfig();
    await updateApp();
    setTimeout(() => {
      window.location.reload();
    },3000);
  }

  
  if (config.kanbanSettings == undefined) {
    $('body').append('<div id="init-loading"><span></span></div>');
    initKanban();
  }else{

    if(config.message){
      config = JSON.parse(kintone.plugin.app.getConfig(PLUGIN_ID).message);
      config.status.forEach((item)=>{
        config_index[item.name] = {disabled : item.disabled , color : item.color};
      })
      $("#display-kanban").val(config.display);
      flag = 1;
    }
    idKanban().then(value=>{
      linkKanban.attr('href',"/k/" + kintone.app.getId() + "/?view="+value);
    });
    var listStatus = [];
    function getListStatus() {
      return new Promise((resolve, reject) => {
        var params = {
          app: kintone.app.getId(),
        };
        kintone.api(
          kintone.api.url("/k/v1/app/status", true),
          "GET",
          params,
          function (resp) {
            
            if(resp.states != null){
              resolve(
                Object.values(resp.states).sort((a, b) => 
                parseInt(a.index) > parseInt(b.index) ? 1:-1
              ));
            }
            resolve([]);
           
          },
          function (error) {
            reject(error);
          }
        );
      });
    }

    var markup = "";
    console.log("1 ")

    getListStatus().then((value) => {
      listStatus = value;
      console.log(config_index);
      if(flag == 0){
        config = {status : new Array(value.length),display:''};
      }
      var first = true;
      value.forEach((element, index) => {
        let disabled;
        let color;
        if(config_index[element.name] != undefined){
          disabled = config_index[element.name].disabled;
          color = config_index[element.name].color;
        }else{
          disabled = "";
          color = "BLACK";
        }
        // disabled = config.status[index] != undefined ? config.status[index].disabled : "";
        // color = config.status[index] != undefined ? config.status[index].color : (defaultColors[element.name] != undefined ? defaultColors[element.name] : "BLACK");
        // config.status[index] = { disabled: disabled, color: color };  
        var optionsMarkup =[];
        preSetColors.forEach(c=>{
          let selected = (c == color) ? "selected" : "";
          optionsMarkup.push(` <option value="${c}" ${selected}>${c}</option>`) 
        });
        markup += `    
                <tr id="${element.index}">
                  <td>${element.name}</td>
                  <td >
                    ${first  ? `<input ${disabled ? "checked" : ""} type="checkbox" style="display:none">` : `<input ${disabled ? "checked" : ""} type="checkbox">`}
                  </td>
                  <td> 
                    <select class="form-control color" id="color-${element.index}">
                      `+
                      optionsMarkup.join("\n");
                      +`
                    </select>
                   </td>  
                </tr>`;
        first = false;
      });
      console.log("6");
      $("#body-config").append(markup);
    });    
  } 
// INIT COMPLETE

  $form.on("submit", function (e) {
    e.preventDefault();

    let checked = $("#body-config :checkbox");
    let color = $(".color");
    var newConfig = [];

    listStatus.forEach((element, index) => {
      newConfig.push({
        name: element.name,
        disabled: $(checked[index]).prop("checked"),
        color: $(color[index]).val(),
      });
    });
    console.log(kintone.plugin.app.getConfig(PLUGIN_ID).message);
    kintone.plugin.app.setConfig(
      { ...kintone.plugin.app.getConfig(PLUGIN_ID),...{message: JSON.stringify({status:newConfig,display: $("#display-kanban").val()})} },
      function () {
        alert("The plug-in settings have been saved. Please update the app!");
        var params = { apps: [{ app: kintone.app.getId() }] };
        kintone.api(
          kintone.api.url("/k/v1/preview/app/deploy", true),
          "POST",
          params,
          function (resp) {
            console.log(resp);
          }
        );
        // window.location.href = "/k/" + kintone.app.getId() + "/?view=20";
      }
    );
  });
  $cancelButton.on("click", function () {
    window.location.href = "../../" + kintone.app.getId() + "/plugin/";
  });
})(jQuery, kintone.$PLUGIN_ID);
