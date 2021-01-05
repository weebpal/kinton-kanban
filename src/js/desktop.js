jQuery.noConflict();
var kanban_new_status = '';
var list_status = [];
var current_column = -1;
var commnetCounter = [];
var listCountComment = [];
var listAllImages = {};
var validate;
var $sortable = false;
var add_task_by_status = false;
var processBody = [];
var global_path_matrix = false;
var created_task_id = false;
var created_task_status = false;
var global_status_res = false;
var getListStatusActions = false;
var number_column_status = {};
var created_task_status_realtime = false;
var id_item_edit = false;
var config_index = {};
var flag_url = false;
var flag_url_button = false;
var count_due = {};
var clone_created_task_status = false;
var flag_is_create_subtask = {status : false , parentId : false};
var form_field_label = false;
var form_field_label_1 = false;
var parent_tree_record = {};
const idApp = kintone.app.getId();
const socket = io.connect("https://kintone.dev.weebpal.com/");
socket.on("connect", function(data) {
  socket.emit("join", "Hello server from client");
});

(function ($, PLUGIN_ID) {
  "use strict";
  
  var getCommentByIdRecord = function(id) {
    return new Promise((resolve,reject)=>{
      var body = {
        'app': kintone.app.getId(),
        'record': id,
      };
      kintone.api(kintone.api.url('/k/v1/record/comments', true), 'GET', body, function(resp) {
        resolve(resp.comments.length);
      }, function(error) {
        reject(error);
      });
    })
  }
  function updateApp(){
    return new Promise((resolve,reject)=>{
      var params = {
        apps: [{
          app: kintone.app.getId()
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
  function updateDropdownRecordParent(object) {
    var body = {
      'app': kintone.app.getId(),
      'properties': {
        "parent_list":{
          "code": "parent_list",
          "defaultValue": "",
          "label": "Parent list",
          "noLabel": false,
          "options":  object,
          "required": false,
          "type": "DROP_DOWN"
        }
      }
    };
    return new Promise((resolve, reject) => {
      kintone.api(kintone.api.url('/k/v1/preview/app/form/fields', true), 'PUT', body, function(resp) {
        console.log("update form: success");
        resolve(resp);
      }, function(error) {
        console.log("update form: error");
        reject(error);
      });
    });
  }
  async function updateDropDownRecord(records) {
    var object = {};
    records.forEach((record,index) => {
      object[record.name.value] = {"label": record.name.value, "index": index}
    });
    await updateDropdownRecordParent(object);
    updateApp();
  }
  function createTitleName() {
    return {add: "Add new card", edit: "Edit card", detail: "Card detail", addSubTask : "Add Sub Task"};
  }
  function getCountComment(id) {
    var body = {
      'app':idApp,
      'record': id
    };
    return new Promise((resolve, reject) => {
      kintone.api(kintone.api.url('/k/v1/record/comments', true), 'GET', body, function(resp) {
        resolve(resp.comments.length);
      }, function(error) {
        resolve(0);
      });
    })
  }
  function getRevertArray(array) {
      var revert_array = [];
      for(var i = array.length - 1; i >= 0; i --) {
          revert_array.push(array[i]);
      }
      return revert_array;
  }
  function getPathMatrix(statuses, process_items) {
      var start_status = statuses[0];
      var previous_matrix = [];// 2 demensions matrix
      var min_matrix = [];// 2 demensions matrix
      var path_matrix = [];// 2 demensions matrix
      var src = false;
      var des = false;
      var mid = false;
      var item = false;
      var from = false;
      var to = false;
      statuses.forEach((src) => {
          previous_matrix[src] = [];
          min_matrix[src] = [];
          path_matrix[src] = [];
          statuses.forEach((des) => {
              previous_matrix[src][des] = -1;
              min_matrix[src][des] = 1000000;
          });
      });
      process_items.forEach((item) => {
          min_matrix[item.from][item.to] = 1;
          previous_matrix[item.from][item.to] = item.from;
      });
      do {
        var still_update = false;
        statuses.forEach((src) => {
            statuses.forEach((des) => {
                statuses.forEach((mid) => {
                    if (min_matrix[src][mid] + min_matrix[mid][des] < min_matrix[src][des]) {
                        min_matrix[src][des] = min_matrix[src][mid] + min_matrix[mid][des];
                        previous_matrix[src][des] = previous_matrix[mid][des];
                        still_update = true;
                    }
                });
            });
        });
      }
      while(still_update);
      var from = false;
      var to = false;
      statuses.forEach((from) => {
          statuses.forEach((to) => {
              var des = to;
              var path = [des];
              while(des != from && des != -1) {
                  des = previous_matrix[from][des];
                  path.push(des);
              }
              path = getRevertArray(path);
              path_matrix[from][to] = path;
          });
      });
      return path_matrix;
  }
  var config = kintone.plugin.app.getConfig(PLUGIN_ID);
  JSON.parse(config.message).status.forEach((item)=>{
    config_index[item.name] = {disabled : item.disabled , color : item.color};
  })
  var flag = 0;
  if(config.message){
    config = JSON.parse(kintone.plugin.app.getConfig(PLUGIN_ID).message);
    flag = 1;
  }
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
          resolve(
            Object.values(resp.states).sort((a, b) => 
            parseInt(a.index) > parseInt(b.index) ? 1:-1
          )
          );
        },
        function (error) {
          reject(error);
        }
      );
    });
  }
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
  async function getCommentCount(){
    var result = {};
    var param = await new Promise((resolve,reject)=>{
      idKanban().then(idViewKan=>{
        resolve({"_ref"  : "/k/"+kintone.app.getId()+"/?view="+idViewKan,});
      });
    });
    var test = await new Promise((resolve,reject)=>{
      kintone.api(kintone.api.url('/k/api/app/'+kintone.app.getId()+'/record/list', true), 'POST', param, function(resp) {
        var records = resp.result.records;
        records.forEach(record=>{
          result[record.id] = record.comments;
          var rows = record.table.row;
          rows.forEach((row,rowIndex)=>{
            var fieldList = row.fieldList;
            for(var fieldId in fieldList){
              var converFieldList = Object.entries(fieldList);
              converFieldList.forEach((fieldValue,fieldId)=>{
                fieldValue = fieldValue[1];
                if(fieldValue.type == "FILE"){
                  fieldValue.values.forEach((value,index)=>{
                    listAllImages[value.blobKey] = value.fileKey;
                  });
                }
              });
            }
          })
        })
        resolve(result);
      },function(error) {
        reject(error);
      });
    })
    return test;
  } 
  function getListRecordByStatus(status) {
    var body = {
      "app": kintone.app.getId(),
      "query": `Status="${status}" order by field_endDate asc ,$id asc`,
    }
    return new Promise((resolve, reject) => {

      kintone.api(
        kintone.api.url("/k/v1/records", true),
        "GET",
        body,
        function (resp) {
          resolve(resp);
        },
        function (error) {
          reject(error);
        }
      );
    });
  }

  function getImageRecord(id) {
    return new Promise((resolve, reject) => {
      kintone.api(kintone.api.url('/k/api/app/'+kintone.app.getId()+'/record/'+id+'/getWithAcl', true), 'POST', {}, function(resp) {
        var fields = resp.result.record.record.table.row[0].fieldList;
        Object.values(fields).forEach(field => {
          if(field['type'] == "FILE") {
            var path = field['values'][0] || "";
            if(path) {
              path = path.fileKey || "";
            }
            if(path != "") {
              var objImg = { };
              objImg[field['values'][0].blobKey] = path;
              resolve(objImg);
            }
            else {
              resolve(path);
            }
            
          }
        })
        resolve("");
      })
    })
  }

  function getListRecordByAnyStatus(status) {
    return new Promise((resolve, reject) => {
      arrStatusQuery = "(";
      let key = status.forEach((element) => {
        arrStatusQuery += '"' + element + ",";
      });
      var query = 'Status in ("Backlog","ReOpened")';
      kintone.api(
        kintone.api.url("/k/v1/records", true) +
          "?app=" +
          kintone.app.getId() +
          "&query=" +
          query,
        "GET",
        {},
        function (resp) {
          resolve(resp);
        },
        function (error) {
          reject(error);
        }
      );
    });
  }
//   var getLayoutForm = function () {
//     return new Promise((resolve, reject) => {
//       var body = {
//         app: kintone.app.getId(),
//       };
//       kintone.api(
//         kintone.api.url("/k/v1/app/form/layout", true),
//         "GET",
//         body,
//         function (resp) {
//           resolve(resp);
//         },
//         function (error) {
//           reject(error);
//         }
//       );
//     });
//   };
//  var b = async function(){
//    var a = await getLayoutForm();
//    console.log(a)
//  }
//  b();
var body = {
  "app": idApp
};

kintone.api(kintone.api.url('/k/v1/app/form/fields', true), 'GET', body, function(resp) {
  // success
  console.log(resp);
}, function(error) {
  // error
  console.log(error);
});
  function getFormFieldLabel() {
    var body = {
      app: kintone.app.getId(),
    };
    kintone.api(
      kintone.api.url("/k/v1/app/form/fields", true),
      "GET",
      body,
      function (resp) {
        // console.log(resp);
        form_field_label = Object.keys(resp.properties.field_label.options);
      },
      function (error) {
        console.log(error);
      }
    );
  }
  function buildColumn(nameStatus,listRecord){
    console.log(listRecord);
    var markup = '';
    count_due[nameStatus.name] = 0;
    markup += `
        <div class="view-content list-body" id="status-${
          nameStatus.index
        }" data-weight="${nameStatus.index}">`;
    markup += `<div class="col-loading"><span></span></div>`;
       Object.values(listRecord.records).forEach(
    (element) => {
      var counterSubTask = parent_tree_record[element.field_id.value] != undefined ? Object.keys(parent_tree_record[element.field_id.value]).length : 0;
      var imageUrl = false;
      var user = [];
      var convertElement = Object.entries(element); 
      var endDate = (element.field_endDate.value);      
      var enDateNew = new Date(endDate);
      enDateNew.setHours(enDateNew.getHours() + 2);
      var notification = "";
      if(endDate != "" && endDate != undefined){
        if(moment().valueOf() >= enDateNew){
          count_due[nameStatus.name] += 1;
          notification = `<div class="views-field views-field-duetime ovever-due"><i class="fa fa-info-circle" aria-hidden="true"></i><span>Due : ${moment(enDateNew).format('MM/DD/YYYY H:mm:ss')}</span></div>`
        }
        else {
          notification = `<div class="views-field views-field-duetime"><span>Due :  ${moment(enDateNew).format('MM/DD/YYYY H:mm:ss')}</span></div>`
        }
      }  
      convertElement.forEach((eleValue,eleKey)=>{
        var eleValue = eleValue[1];
        if(eleValue.type == 'FILE' && !imageUrl && eleValue.value.length){
          imageUrl = listAllImages[eleValue.value[0].fileKey];
        }
      })
      element.Assignee.value.forEach(element=>{
        user.push(`<li class="user-item" code="${element.code}">${element.name.slice(0,2)}</li>`); 
      })
      let estimateTime = (moment.duration(element.field_manual_time.value).asHours());
      estimateTime = parseInt(estimateTime) == estimateTime ? estimateTime : estimateTime.toFixed(1);
      let color = element.color.value.replace(" ", "-").toLowerCase();
      markup += `<div class="views-row card-${color}" data-id="${element.$id.value}" form-id="${element.field_id.value}" recurring="${element.field_recurring.value.length != 0 ? true : false}" due="${element.field_recurring_status.value}" date=${element.field_endDate.value}>
                    <div class="group-button">
                      <div class="button-detail" data-target="#myModal" data-toggle="modal">
                        <i class="far fa-file"></i>
                        <span class="tooltip-text">Detail task</span>
                      </div>
                      <div class="button-edit"  data-toggle="modal" data-target="#myModal">
                        <i class="far fa-edit"></i>
                        <span class="tooltip-text">Edit task</span>
                      </div>
                      <div>
                        <button class="button-delete" task-id="${element.$id.value}" >
                          <i class="far fa-trash-alt"></i>
                          <span class="tooltip-text">Delete task</span>
                        </button>
                      </div>
                      <div class="button-url">
                        <i class="fa fa-link" aria-hidden="true"></i>
                        <span class="tooltip-text">Copy link task</span>
                      </div>
                      <div class="button-sub-task"  data-target="#myModal" data-toggle="modal">
                        <i class="fas fa-tasks"></i>
                        <span class="tooltip-text">Add sub task</span>
                      </div>
                    </div>
                    <div class="views-row-content"  data-toggle="modal" data-target="#myModal">
                      <div class="views-field views-field-image">
                      <div class="field-content">
                        ${imageUrl ? `<img src="${imageUrl}" alt="image.jpg" />` : ""}
                      </div>
                  </div>
                  <div class="list-card-detail">
                  <div class="views-field views-field-title">
                    <div class="field-content">${element.name.value}</div>
                  </div>
                  ${notification ? notification : ""}
                  <div class="group-inner">
                    <div class="views-field views-field-comments">
                      <div class="field-content">
                        <i class="far fa-comment"></i>
                        <span class="counter counter-message">${element.comment_count}</span>
                      </div>
                    </div>
                    <div class="views-field views-field-attachment">
                      <div class="field-content">
                        <i class="fas fa-paperclip"></i>
                        <span class="counter counter-attackment">${element.file.value.length}</span>
                      </div>
                    </div>
                    <div class="button-estimate">
                      <i class="far fa-clock"></i>
                      <span class="counter estimate-time" >${estimateTime}</span>
                    </div>
                    <div class="views-field views-field-sub-task">
                      <div class="field-content">
                        <i class="fas fa-tasks"></i>
                        <span class="counter counter-sub-task" task-id-sub="${element.field_id.value}" task-id-parent-sub="${element.parent_id.value}">${counterSubTask}</span>
                      </div>
                    </div>
                    
                  </div>
                  <div class="group-user">
                    <ul class="users-list">
                    `+
                    user.join('\n')
                      +`
                    </ul>
                  </div>
                </div>`;

                markup += `               
              </div>
            </div>
            `;
        }
        );

    return markup;
  }
  var body = {
    app: kintone.app.getId(),
  };
  kintone.api(
    kintone.api.url("/k/v1/app/status", true),
    "GET",
    body,
    function (resp) {
      getListStatusActions=resp.actions;
      global_status_res =  Object.values(resp.states).sort((a, b) => parseInt(a.index) > parseInt(b.index) ? 1:-1);
      Object.keys(resp.states).forEach(i=>{number_column_status[i]= resp.states[i].index})
      var statuses = resp['states'];
      var process_items = resp['actions'];
      statuses = Object.values(statuses);
      var status_names = [];
      statuses.forEach((status) => {
        status_names.push(status.name);
      });
      global_path_matrix = getPathMatrix(status_names, process_items);
    },
    function (error) {

    }
  );
  var getPropertiesForm = function () {
    return new Promise((resolve, reject) => {
      var body = {
        app: kintone.app.getId(),
      };

      kintone.api(
        kintone.api.url("/k/v1/preview/form", true),
        "GET",
        body,
        function (resp) {
          // success
          resolve(resp);
        },
        function (error) {
          // error
          reject(error);
        }
      );
    });
  };
  async function deleteRecord(id)
  {
    console.log("delete : " +id);
    return new Promise((resolve, reject)=>
    {
       var body = {
      "app": kintone.app.getId(),
      "ids":[parseInt(id)]
      }
      kintone.api(
          kintone.api.url("/k/v1/records", true),
          "DELETE",
          body,
          function (resp) {
            resolve(resp);
          },
          function (error) {
            console.log(error);
            resolve(error);
          }
        );
    })
   
  }
  function fileDownload(ImageFileKey) {
    return new Promise(function(resolve, reject) {
      var url = kintone.api.url('/k/v1/file', true) + '?fileKey=' + ImageFileKey;
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url);
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      xhr.responseType = 'blob';
      xhr.onload = function() {
        if (xhr.status === 200) {
          resolve(xhr.response);
        } else {
          reject(Error('File download error:' + xhr.statusText));
        }
      };
      xhr.onerror = function() {
          reject(Error('There was a network error.'));
      };
      xhr.send();
    });
  }
  function fileUpload(fileName, contentType, data) {
    return new Promise(function(resolve, reject) {
      var blob = new Blob([data], {type:contentType});
      var formData = new FormData();
      formData.append("__REQUEST_TOKEN__", kintone.getRequestToken());
      formData.append("file", blob , fileName);
      var url = kintone.api.url('/k/v1/file', true); //Different .json?
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      xhr.onload = function() {
        if (xhr.status === 200) {
            // successful
          var results = JSON.parse(xhr.response);
          resolve(results);
        } else {
          // fails
          reject(Error('File upload error:' + xhr.statusText));
        }
      };
      xhr.onerror = function() {
        reject(Error('There was a network error.'));
      };
      xhr.send(formData);
    });
  }
  function updateEstimateTask(id,time) {
    return new Promise((resolve,reject)=>{
      var body = {
        "app" : kintone.app.getId(),
        "id" : id,
        "record" : {
          "field_manual_time" : {
            "value" : moment().startOf('day').add(parseFloat(time), "hours").format("HH:mm")
          }
        }
      };
      kintone.api(kintone.api.url('/k/v1/record',true), 'PUT', body, function(resp) {
        $(".estimate-popup input").val("");
        $(".estimate-popup").removeClass('show-popup');
        $(".estimate-popup").hide();
        id_item_edit = false;
        resolve(resp);
      }, function(error) {
        console.log(error);
        reject(error);
      })
    })
  }
  function updateRecurringStatus (status) {
    var body = {
      "app": idApp,
      "record": {
          "field_recurring_status": {
              "value": status
          }
      }
    };
    return new Promise((resolve, reject) => {
      kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', body, function(resp) {
          resolve(resp);
      }, function(error) {
          resolve(error);
      });
    })
  }
  function compareDate(startDate, endDate) {
    var momentA = moment(startDate).format("X");;
    var momentB = moment(endDate).format("X");;
    if (momentA > momentB) return 1;
    else if (momentA < momentB) return -1;
    else return 0;
  }
//   function getCopyAppData(copyId) {
//     var body = {
//       "app": kintone.app.getId(),
//       "id":copyId,
//       "query": kintone.app.getQuery(),
//     }
//     kintone.api(kintone.api.url("/k/v1/record", true),'GET', body, function(resp){
//       console.log(resp);
//       return resp;
//     },
//     function(error) {
//       return error;
//     });
//  }
//  getCopyAppData(166);

  
  // async function test() {
  //   var a = await getTaskById(166);
  //   addDataToCurrentApp(a.record);
  // }
  // test();
  async function addDataToCurrentApp(data) {
    console.log(JSON.stringify(data));
    var wData = {};
    var fileInf = {};
    var keyAccept = ['name','color','field_label','field_label_1','User_selection','Group_selection','content','field_startDate','field_manual_time','field_recurring','parent_id'];
    Object.keys(data).forEach(key => {
      if(keyAccept.includes(key)){
        wData[key] = { "value":data[key].value };
      }
      else if (key == 'field_id') { 
        wData[key] = { "value":parseInt(Math.random()*100000000)  };
      }
      else if (key == 'field_endDate') {
        console.log(data[key].value)
        if(data['field_recurring_day'].value == "Daily") {
          wData[key] = { "value": moment(data[key].value).add(1, 'days').format("YYYY-MM-DDTHH:mm:ssZ")};
        } 
        else if (data['field_recurring_day'].value == "Weekly") {       
          wData[key] = { "value" : moment(data[key].value).add(7, 'days').format("YYYY-MM-DDTHH:mm:ssZ")};
        }
        else if (data['field_recurring_day'].value == "Monthly") {      
          wData[key] = { "value" : moment(data[key].value).add(1, 'month').format("YYYY-MM-DDTHH:mm:ssZ")};
        }
      }
      else if (key == 'file') {
        if (data[key].value.length != 0) {
          fileInf["contentType"] = data[key].value[0].contentType;
          fileInf["fileKey"] = data[key].value[0].fileKey;
          fileInf["name"] = data[key].value[0].name;
          fileInf["size"] = data[key].value[0].size;     
          wData[key] = {
            "value" : [
              {
                "contentType": data[key].value[0].contentType,
                "fileKey" : data[key].value[0].fileKey,
                "name": data[key].value[0].name,
                "size": data[key].value[0].size
              }
            ]
          }
        }
        else {
          wData[key] = {
            "value" : []
          }
        }
      }

    });
    console.log(JSON.stringify(wData));
    if(Object.keys(fileInf).length != 0) {
      await fileDownload(fileInf.fileKey).then(function(DLResp) {
        fileInf["DLResp"] = DLResp;
      });
      var newFileKey = await fileUpload(fileInf.name, fileInf.contentType, fileInf.DLResp);
      wData['file']['value'][0].fileKey = newFileKey.fileKey;
    }
    let body = {
      "app": kintone.app.getId(),
      "record":wData
    };
    return new Promise((resolve, reject)=>{
      kintone.api(kintone.api.url('/k/v1/record', true), 'POST', body).then(function(resp) {
        resp['field_id'] = wData['field_id'].value;
        resp['field_endDate'] = wData['field_endDate'].value;
        resolve(resp);
      },function(err) {
        reject(err);
        console.log(err);
      })
    })
  }
  function validateDate(date) {
    console.log('validate');
    console.log(date);
    date = date || "";
    if(date == "") return false;
    var enDateNew = new Date(date);
    enDateNew.setHours(enDateNew.getHours() + 2);
    if(moment().valueOf() >= enDateNew) {
      return true;
    }
    return false;
  }
  async function cloneTaskDone(status, endDate, copyId, recurring, repeatStatus) {
    if(!validateDate(endDate) && status != "Done") return;
    if (repeatStatus.toLowerCase() == "true") return;
    updateFieldRecord(copyId,{'field_recurring_status':"True"});
    if (recurring.length == 0) return;
    var taskData = await getTaskById(copyId);
    console.log(taskData.record.field_recurring_status.value);
    if(taskData.record.field_recurring_status.value == true) {
      return;
    }
    var idTask = await addDataToCurrentApp(taskData.record);
    taskData.record.$id.value = idTask.id;
    taskData.record.field_id.value = idTask.field_id;
    taskData.record.field_endDate.value = idTask.field_endDate;
    var linkImage = await getImageRecord(idTask.id);
    linkImage.length != 0 ? taskData.record.file.value[0].fileKey = Object.keys(linkImage)[0] : null;
    console.log(idTask);
    var objectAdd =  {task:taskData.record,nameCol:"Backlog",image:linkImage};    
    await socket.emit("add",objectAdd);

    window.parent.jQuery('#close-popup').trigger("click");
    // await getCommentCount();
    // socket.emit("add", {task:ev.record,nameCol:parent.created_task_status,image:listAllImages});
    // console.log("Emit event add to users when clone task");
    // window.parent.created_task_id = ev.recordId;
  }
  var updateStatus = function (status, id) {
    return new Promise((resolve, reject) => {
      var body = {
        app: kintone.app.getId(),
        "id": id, 
        "action": `${status}`,
        "assignee": `${kintone.getLoginUser().code.toString()}`,
      };

      kintone.api(
        kintone.api.url("/k/v1/record/status", true),
        "PUT",
        body,
        function (resp) {
          if (resp.revision) {
            resolve(resp);
          }
        },
        function (error) {
          reject({ "error": "Can't not update status!" });
        }
      );
    });
  };
  // arrFiel = {fieldKey : fieldValue,  fieldKey : fieldValue};
  function updateFieldRecord(idTask, arrField) {
    var record = {};
    Object.keys(arrField).forEach(e=>{
      record[e] = {"value" : arrField[e]}
    })
    console.log(record);
    var body = {
      "app": idApp,
      "id": idTask,
      "record": record
    };
    return new Promise((resolve, reject) => {
      kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', body, function(resp) {
        resolve(resp);
      }, function(error) {
        resolve(error);
      });
    })
  }
  // updateFieldRecord(1115,{'field_recurring_status':"True"});
  async function updateStatusNew(arrPath,id){
    var resutArr = [];
    for(var i = 0; i < arrPath.length - 1; i ++) {
        var body = {
          app: kintone.app.getId(),
          "id": id,
          "action": `${arrPath[i+1]}`,
          "assignee": `${kintone.getLoginUser().code.toString()}`,
        };
        var test = await new Promise((resolve,reject) => {
          kintone.api(kintone.api.url("/k/v1/record/status", true),"PUT",body,
          function (resp) {
            if (resp.revision) {
              resolve(resp);
            }
          },
          function (error) {
            reject(error);
          }
        );
        }) 
        resutArr.push(test);
    }
    return resutArr;
  }
  function createPopUp(id){
    var markup = 
    `
    <iframe id="iframeEdit" src="${"/k/" + kintone.app.getId() + "/show#record="+id}">
    </iframe>
  `
  console.log($('#myModal .modal-body'));
  console.log(markup);
    $('#myModal .modal-body').html(markup);
    $('#myModal .modal-title').html(createTitleName().detail);

    $(document.getElementById('iframeEdit').contentWindow.document.head).append('https://weebpal.kintone.com/k/api/plugin/content/download.do?contentId=26180&type=DESKTOP_CSS&pluginId=dfeabpkogjeianljahgpcfabiomlfpal');
    $(document.getElementById('iframeEdit').contentWindow.document.body).addClass("customCssIframe");
    
  }
  function createPopUpAdd(){
    $('#myModal .modal-title').html(createTitleName().add);
    var markup = 
    `
    <iframe id="iframeEdit" src="${"/k/" + kintone.app.getId() + "/edit"}">
    </iframe>
    
  `;
  console.log(markup);
  console.log( $('#myModal .modal-body'))
    $('#myModal .modal-body').html(markup);

    $(document.getElementById('iframeEdit').contentWindow.document.head).append('https://weebpal.kintone.com/k/api/plugin/content/download.do?contentId=26180&type=DESKTOP_CSS&pluginId=dfeabpkogjeianljahgpcfabiomlfpal');
    $(document.getElementById('iframeEdit').contentWindow.document.body).addClass("customCssIframe");
    
    
  }
  function createPopupAddSubTask(){
    $('#myModal .modal-title').html(createTitleName().addSubTask);
    var markup = 
    `
    <iframe id="iframeEdit" src="${"/k/" + kintone.app.getId() + "/edit"}">
    </iframe>
    
  `;
    $('#myModal .modal-body').html(markup);

    $(document.getElementById('iframeEdit').contentWindow.document.head).append('https://weebpal.kintone.com/k/api/plugin/content/download.do?contentId=26180&type=DESKTOP_CSS&pluginId=dfeabpkogjeianljahgpcfabiomlfpal');
    $(document.getElementById('iframeEdit').contentWindow.document.body).addClass("customCssIframe");
  }
  function createPopUpEdit(id){
  
    $('.modal-title').html(createTitleName().edit);
    var markup = 
    `
    <iframe id="iframeEdit" task-id="${id}" src="${"/k/" + kintone.app.getId() + "/show#record="+id+"&l.view=20&l.q&l.next=37&l.prev=0&mode=edit"}">
    </iframe>
    
  `;
    $('.modal-body').html(markup);

    $(document.getElementById('iframeEdit').contentWindow.document.head).append('https://weebpal.kintone.com/k/api/plugin/content/download.do?contentId=26180&type=DESKTOP_CSS&pluginId=dfeabpkogjeianljahgpcfabiomlfpal');
    $(document.getElementById('iframeEdit').contentWindow.document.body).addClass("customCssIframe");
    
  }
  function createPopUpUrl(id){
    var markup = `
    <input id="url-${id}" readonly type="text" value='https://${window.location.hostname + "/k/" + kintone.app.getId() + "/show#record="+id}' />
    <div class="button-copy">Copy</div>`;
                  
    $(".url-popup .url-link").html(markup);
    $('.button-copy').click(function(event) {
      var item_id = $('.url-link input').attr('id');
      copyToClipboard(item_id);
    })
  }
  function copyToClipboard(id){
    var copyText = document.getElementById(id);
    copyText.select();
    copyText.setSelectionRange(0, 99999);
    document.execCommand("copy");
    $('.button-copy').text('Copied')
    $('.button-copy').css({
      "background-color": "#000",
      "color": "#fff",
    })
  }
  function closeCopy(){
    $(document).click(function (e) {
      if ($(e.target).closest(".url-popup").length === 0 && $(".url-popup").hasClass('popup-open') == true) {
          $(".url-popup").removeClass('popup-open');
          $("body").removeClass("modal-open");
          $(this).closest('.group-button').attr("style", "display: none;");
          id_item_edit = false;
      }
    });
  }
  function updateAnyColumnDueTask(from,to) {
    count_due[from] -= 1;
    count_due[to] += 1;
    var formEle = $(`[data-status="${from}"] .counter-due`);
    var toEle = $(`[data-status="${to}"] .counter-due`);
    if (count_due[from] > 0) {
      formEle.text(`${count_due[from]} overdue tasks`);
      formEle.css({'display' : 'block'});
    }
    else {
      formEle.text("");
    }
    if (count_due[to] != 0) {
      toEle.text(`${count_due[to]} overdue tasks`)
      toEle.css({'display' : 'block'});
    }
    else {
      toEle.text("");
    }
  }
  function updateOneColumnDueTask(colName) {
    
    count_due[colName] -= 1;
    var colNameEle = $(`[data-status="${colName}"] .counter-due`);

    if (count_due[colName] > 0) {
      colNameEle.text(`${count_due[colName]} overdue tasks`);
      colNameEle.css({'display' : 'block'});
    }
    else {
      colNameEle.text("");
    }
  }
  function dueTaskUpCre(task) {
    var id = task.$id.value;
    var endDate = task.field_endDate.value;
    var enDateNew = new Date(task.field_endDate.value);
    enDateNew.setHours(enDateNew.getHours() + 2);
    var notification = "";
    var DueCol = $(`[data-id="${id}"]`).closest("[data-status]").find('.counter-due');
    var DueEle = $(`[data-id="${id}"] .views-field-duetime`);
    if(endDate != "" && endDate != undefined){
      if(moment().valueOf() >= enDateNew && DueEle.length == 0){
        count_due[task.Status.value] += 1;
        notification = `<div class="views-field views-field-duetime ovever-due"><i class="fa fa-info-circle" aria-hidden="true"></i><span>Due : ${moment(enDateNew).format('MM/DD/YYYY H:mm:ss')}</span></div>`
        $(`[data-id="${id}"] .views-field-title`).after(notification);
        DueCol.text(`${count_due[task.Status.value]} overdue tasks`);
        DueCol.css({'display' : 'block'});
      }
      if(moment().valueOf() >= enDateNew && DueEle.length == 1) {
        $(`[data-id="${id}"] .views-field-duetime span`).text(moment(enDateNew).format('MM/DD/YYYY H:mm:ss'));
        $(`[data-id="${id}"] .views-field-duetime`).addClass('ovever-due');
        if ($(`[data-id="${id}"] .views-field-duetime .fa-info-circle`).length == 0) {
          $(`[data-id="${id}"] .views-field-duetime`).prepend('<i class="fa fa-info-circle" aria-hidden="true"></i>');
        }
      }
      else if((moment().valueOf() < enDateNew && DueEle.length != 0)){
        count_due[task.Status.value] -= 1;
        $(`[data-id="${id}"] .views-field-duetime`).removeClass('ovever-due');
        $(`[data-id="${id}"] .views-field-duetime .fa-info-circle`).remove();
        $(`[data-id="${id}"] .views-field-duetime span`).text('Due : ' + moment(enDateNew).format('MM/DD/YYYY H:mm:ss'));
        DueCol.text("");
        DueCol.css({'display' : 'none'});
      }
      else if((moment().valueOf() < enDateNew && DueEle.length == 0)){
        notification = `<div class="views-field views-field-duetime"><span>Due : ${moment(enDateNew).format('MM/DD/YYYY H:mm:ss')}</span></div>`
        $(`[data-id="${id}"] .views-field-title`).after(notification);
      }
    }
  }
  function closeEstimate(){
    $(document).click(function (e) {
      if ($(e.target).closest(".estimate-popup").length === 0 && $(".estimate-popup.show-popup").length != 0) {
          $(".estimate-popup").hide();
          $("body").removeClass("modal-open");
          $(".estimate-popup").removeClass("show-popup");
          id_item_edit = false;
      }
    });
  }
  function overScreen(current_position, width, side){
   if(side == 'left') {
     if((current_position - width) > 0) {
       return false
     }
     else {
       return true
     }
   }
   else if(side == 'right') {
     if((current_position + width) < $('html').outerWidth()) {
      return false
     }
     else {
       return true
     }
   }
  }
  function reloadEvent(idTask){

    $(`[data-id="${idTask}"] .button-delete`).unbind("click").click(async function(event)
    { 
      var taskId= jQuery(event.currentTarget).closest('[data-id]').attr('data-id');
      var check = confirm("Do you want delete record?");
      if(check == false) {
        return;
      }
      await socket.emit('delete',taskId);
      var value = deleteRecord(taskId);
      window.parent.jQuery('#close-popup').trigger("click");
    });

    $(`[data-id="${idTask}"] .button-detail`).unbind("click").click(function(event){
      $('.modal-loader').removeClass('disable');  
      id_item_edit = $(this).closest('.views-row').attr('data-id');
      parent.current_column = $(this).closest('.status-col').attr('data-status');
      createPopUp(id_item_edit);
    })

    $(`[data-id="${idTask}"] .views-row-content`).unbind("click").click(function(event){
      $('.modal-loader').removeClass('disable'); 
      id_item_edit = $(this).closest('.views-row').attr('data-id');
      parent.current_column = $(this).closest('.status-col').attr('data-status');
      createPopUp(id_item_edit);
    })
    $(`[data-id="${idTask}"] .button-edit`).unbind("click").click(function(event){
      $('.modal-loader').removeClass('disable');  
      id_item_edit = $(this).closest('.views-row').attr('data-id');
      parent.current_column = $(this).closest('.status-col').attr('data-status');
      createPopUpEdit(id_item_edit);
    });
    $(`[data-id="${idTask}"] .button-sub-task`).unbind("click").click(function(event) {
      $('.modal-loader').removeClass('disable');  
      created_task_status = $(this).closest('.status-col').attr('data-status'); 
      createPopupAddSubTask();
      parent.current_column = 0;
      flag_is_create_subtask.status = true; 
      flag_is_create_subtask.parentId = $(this).closest('[data-id]').attr('form-id');
    });
   
    // $('.add-card-btn').click(function(){
    //   created_task_status = $(this).closest('.status-col').attr('data-status');
    //   createPopUpAdd();
    //   parent.current_column = 0;
    // });
    $('.button-url-iframe').unbind('click').click(function() {
      if( $('.url-link').length != 0) {
       $('.url-link').remove();
        return;
      }
      var markup = `
        <div class="url-link">
          <input id="url-${kintone.app.record.getId()}" readonly type="text" value='https://${window.location.hostname + "/k/" + kintone.app.getId() + "/show#record="+kintone.app.record.getId()}' />
          <div class="button-copy">Copy</div>
        </div>`;
      if(window.parent.jQuery(".modal-title").text() == createTitleName().edit){
        $('.gaia-argoui-app-edit-buttons').append(markup);
      }
      else {
        $('.gaia-app-statusbar-actionlist').append(markup);
      }
      $('.button-copy').click(function(event) {
        var item_id = $('.url-link input').attr('id');
        copyToClipboard(item_id);
      })
    })
    $(`[data-id="${idTask}"] .button-url`).click(function(event){
      if ($('.url-popup').hasClass('popup-open') != true) {
        $(this).closest('body').addClass('modal-open');
        $('.url-popup').addClass('popup-open');
        $(this).closest('.group-button').attr("style", "display: flex;");
        id_item_edit = $(this).closest('.views-row').attr('data-id');
        $('.url-popup').css({
          top: jQuery(this).closest('.group-button').offset().top + 32 - jQuery(window).scrollTop(),
        });
        let left_position =  jQuery(this).closest('.group-button').offset().left;
        let width = jQuery('.url-popup').outerWidth();
        if (overScreen(left_position, width, 'left')) {
          $('.url-popup').css({
            left: left_position,
          });
        }
        else {
          $('.url-popup').css({
            left: left_position - width + $(this).closest('.group-button').outerWidth(),
          });
        }
        createPopUpUrl(id_item_edit);
      }
      else {
          $(".url-popup").removeClass('popup-open');
          $("body").removeClass("modal-open");
          $(this).closest('.group-button').removeAttr('style');
          id_item_edit = false;
      }
      event.stopPropagation();
    })
    $(`[data-id="${idTask}"] .button-estimate`).click(function(event) {
      if($(".estimate-popup.show-popup").length == 0) {
        $(".estimate-popup").addClass('show-popup');
        $("body").addClass('modal-open');
        $('.estimate-popup').show();
        id_item_edit = $(this).closest('[data-id]').attr('data-id');
        $(".estimate-popup").css({
          top: jQuery(this).closest('.group-inner').offset().top + 34 - jQuery(window).scrollTop() - jQuery(".estimate-popup").height(),
          maxWidth: "250px",
        });
        let right_position = jQuery(this).closest('.group-inner').offset().left + jQuery(this).closest('.group-inner').outerWidth() + 10;
        let width = jQuery('.estimate-popup').outerWidth();
        if(overScreen(right_position, width, 'right')) {
          $(".estimate-popup").css({
            left: right_position - width - $(this).outerWidth() - 15,
          })
        }
        else {
          $(".estimate-popup").css({
            left: right_position,
          })
        }
      }
      else {
        $(".estimate-popup").removeClass('show-popup');
        $("body").removeClass('modal-open');
        $(".estimate-popup").hide();
        id_item_edit = false;
      }
      event.stopPropagation();
    })
    // if($sortable){
    //   $(".view-content").sortable("destroy");
    // }
    $sortable = $(".view-content")
    .sortable({
      connectWith: ".view-content",
      receive: function(event, ui){
        var receive = list_status[ui.item.parent().attr("data-weight")].name;
        var sender =  list_status[ui.sender.attr("data-weight")].name;
        var idSender = ui.item.attr('data-id');
        var recurring = ui.item.attr('recurring').length != 0 ? ["repeat"] : [];
        var repeatStatus = ui.item.attr('due') || '';
        var endDate = ui.item.attr('date') || '';
        // permission move;
        var isAccess =  ui.item.find('.user-item').attr('code').toString() != kintone.getLoginUser().code.toString();
        validate = getListStatusActions.filter(element=>{
          if(element.from == sender && element.to == receive){
            return element;
          }
        })
        if(validate.length == 0 || isAccess){
          $(ui.sender).sortable('cancel');
          validate = null;
        }else{
          if($(ui.item).find('.views-field-duetime.ovever-due').length != 0){
            updateAnyColumnDueTask(sender,receive);
           }
          updateStatus(
           receive,
           idSender
          )
          .then((value) => {
            var index = $(ui.item[0]).index();
            socket.emit("move",{idTask:idSender,receive:receive,index:index});
            console.log("clone task done popup")
            if(receive == "Done") {
              cloneTaskDone(receive, endDate, idSender, recurring, repeatStatus);
            }
          })
          .catch((err) => {
            var id = $(ui.item).attr('data-id');
            var oldStatusColumn = $(ui.sender).closest('.status-col').attr('data-status');
            var newStatusColumn = $(`[data-id=${id}]`).closest('.status-col').attr('data-status');
            if(ui.item.find('.user-item').attr('code').toString() != kintone.getLoginUser().code.toString()){
              if(oldStatusColumn = newStatusColumn){
                var taskItem = $(ui.item).attr('data-id');
                $(ui.sender).sortable('cancel');
              }                              
            }
           
            validate = null;
           
          });
        }
      },
    })
    .disableSelection();
  }
  // $('iframe').on("load",  setTimeout(()=>{
  //   if(window.parent.jQuery(".modal-title").text()  == createTitleName().edit) {
  //     var body = $('.gaia-argoui-app-edit-buttons');
  //     body.append(`<div class="button-url-iframe">
  //                     <i class="fa fa-link" aria-hidden="true"></i>
  //                   </div>`);
  //     reloadEvent();
  //   }
  //   else if(window.parent.jQuery(".modal-title").text()  == createTitleName().detail) {
  //     var body = $('.gaia-app-statusbar-actionlist');
  //     body.append(`<div class="button-url-iframe">
  //                     <i class="fa fa-link" aria-hidden="true"></i>
  //                   </div>`);
  //     reloadEvent();
  //   }
  // },1000));
  function setIconCopyModal() {
    if(window.parent.jQuery(".modal-title").text()  == createTitleName().edit) {
      var body = $('.gaia-argoui-app-edit-buttons');
      body.append(`<button class="button-url-iframe">
                      <i class="fa fa-link" aria-hidden="true"></i>
                    </button>`);
      reloadEvent();
    }
    else if(window.parent.jQuery(".modal-title").text()  == createTitleName().detail) {
      var body = $('.gaia-app-statusbar-actionlist');
      body.append(`<button class="button-url-iframe">
                      <i class="fa fa-link" aria-hidden="true"></i>
                    </button>`);
      reloadEvent();
    }
  }
  function idKanban(){
    return new Promise((resolve,reject)=>{
      var body = {
        "app": kintone.app.getId(),
        "lang": "en"
      };
    
      kintone.api(kintone.api.url('/k/v1/app/views', true), 'GET', body, function(resp) { 
        resolve(resp.views['Kanban Board'].id);
      }, function(error) {
          reject(error);
      });
    })
    
  }
  function buildTaskColumn(task,image){
    if (task.parent_id.value) {
      if (typeof(parent_tree_record[task.parent_id.value]) != "object") {
        parent_tree_record[task.parent_id.value] = {};
      }
      parent_tree_record[task.parent_id.value][task.$id.value] = task;
    }
    var counterSubTaskParent = parent_tree_record[task.parent_id.value] != undefined ? Object.keys(parent_tree_record[task.parent_id.value]).length : 0;
    jQuery(`[task-id-sub="${task.parent_id.value}"]`).text(counterSubTaskParent);
    var imageUrl ='';
    var color = task.color.value.replace(" ", "-").toLowerCase();
    var counterSubTask = parent_tree_record[task.field_id.value] != undefined ? Object.keys(parent_tree_record[task.field_id.value]).length : 0;
    if(image.length != 0 && task.file.value.length != 0){
      imageUrl = image[task.file.value[0].fileKey];
    }
    var user = [];
    task.Assignee.value.forEach(element=>{
      user.push(`<li class="user-item" code="${element.code}">${element.name.slice(0,2)}</li>`); 
    })
    var estimateTime = (moment.duration(task.field_manual_time.value).asHours());
    estimateTime = parseInt(estimateTime) == estimateTime ? estimateTime : estimateTime.toFixed(1);
    var markup = `
    <div class="views-row card-${color}" data-id="${task.$id.value}" form-id="${task.field_id.value}" recurring="${task.field_recurring.value.length != 0 ? true : false}" due="${task.field_recurring_status.value}" date=${task.field_endDate.value}>
      <div class="group-button">
        <div class="button-detail" data-target="#myModal" data-toggle="modal">
          <i class="far fa-file"></i>
          <span class="tooltip-text">Detail task</span>
        </div>
        <div class="button-edit" data-target="#myModal" data-toggle="modal">
          <i class="far fa-edit"></i>
          <span class="tooltip-text">Edit task</span>
        </div>
        <div>
          <button class="button-delete">
            <i class="far fa-trash-alt"></i>
            <span class="tooltip-text">Delete task</span>
          </button>
        </div>
        <div class="button-url">
          <i class="fa fa-link" aria-hidden="true"></i>
          <span class="tooltip-text">Copy link task</span>
        </div>
        <div class="button-sub-task"  data-target="#myModal" data-toggle="modal">
          <i class="fas fa-tasks"></i>
          <span class="tooltip-text">Add sub task</span>
        </div>
       
      </div>
      <div class="views-row-content" data-target="#myModal" data-toggle="modal">
        <div class="views-field views-field-image">
          <div class="field-content">
            ${imageUrl.length != 0 ? `<img alt="image.jpg" src="${imageUrl}">` : ""}
          </div>
        </div>
        <div class="list-card-detail">
          <div class="views-field views-field-title">
            <div class="field-content">
              ${task.name.value}
            </div>
          </div>
          <div class="group-inner">
            <div class="views-field views-field-comments">
              <div class="field-content">
                <i class="far fa-comment"></i> <span class="counter counter-message">0</span>
              </div>
            </div>
            <div class="views-field views-field-attachment">
              <div class="field-content">
                <i class="fas fa-paperclip"></i> <span class="counter counter-attackment">${task.file.value.length}</span>
              </div>
            </div>
            <div class="button-estimate">
              <i class="far fa-clock"></i>
              <span class="counter estimate-time" >${estimateTime}</span>
            </div>
            <div class="views-field views-field-sub-task">
              <div class="field-content">
                <i class="fas fa-tasks"></i>
                <span class="counter counter-sub-task" task-id-sub="${task.field_id.value}" task-id-parent-sub="${task.parent_id.value}">${counterSubTask}</span>
              </div>
            </div>
          </div>
          <div class="group-user">
            <div class="users-list" style="margin-left: 2em">
              `+ user.join('\n') +`
            </div>
          </div>
        </div>
      </div>
    </div>`;


    return markup;

  }
  async function createTaskLocation (status_create, task_id) {
    task_id = task_id || "";
    if(status_create == 'Backlog') {
      return;
    }
    var start_status = 'Backlog';
    var path = window.parent.global_path_matrix[start_status][status_create] || ""; // result = ['Backlog', 'In Progress', 'Resolved', 'In Review', 'Done']
    if(task_id == "" || path == "") return;
    await updateStatusNew(path,task_id);
  }
  if($('.gaia-argoui-app-edit-buttons .gaia-ui-actionmenu-cancel').length != 0){
    $('.gaia-argoui-app-edit-buttons .gaia-ui-actionmenu-cancel').click(function(){
      window.parent.jQuery('#close-popup').trigger("click");
    })
  }
  kintone.events.on("app.record.create.submit",async function(ev) {
    window.parent.jQuery('#myModal .modal-loader').removeClass('disable');
    if(compareDate(ev.record.field_startDate.value, ev.record.field_endDate.value) == 1) {
      ev.record['field_endDate']['error'] = "Start date must be less than Due date";
      ev.error = "Invalid start date & due date!";
      window.parent.jQuery('#myModal .modal-loader').addClass('disable');
      window.parent.jQuery('#iframeEdit').css({'display':'block'});
      window.parent.jQuery('#myModal .modal-dialog').css({'height': 'calc(100% - 3.5rem)'});
      return ev;
    }
    window.parent.jQuery('#myModal .modal-loader').addClass('disable');
    window.parent.jQuery('#iframeEdit').css({'display':'block'});
    window.parent.jQuery('#myModal .modal-dialog').css({'height': 'calc(100% - 3.5rem)'});
    var listLabel = jQuery('.lablel').next().find('li.select2-selection__choice').text();
    ev.record.field_label_1.value = listLabel.replace('×','').replaceAll('×',',').trim();
    ev.record.field_id.value = parseInt(Math.random()*100000000);
    if(parent.flag_is_create_subtask.status) {
      var idParent = parent.flag_is_create_subtask.parentId == false ? "" : parent.flag_is_create_subtask.parentId;
      ev.record.parent_id.value = idParent;
      parent.flag_is_create_subtask.status = false;
      parent.flag_is_create_subtask.parentId = false;
    }
    return ev;
  }); 
  kintone.events.on("app.record.edit.submit",function(ev) {
    console.log("before edit success");
    if(compareDate(ev.record.field_startDate.value, ev.record.field_endDate.value) == 1) {
      ev.record['field_endDate']['error'] = "Start date must be less than Due date";
      ev.error = "Invalid start date & due date!";
      return ev
    }
    var listLabel = jQuery('.lablel').next().find('li.select2-selection__choice').text();
    ev.record.field_label_1.value = listLabel.replace('×','').replaceAll('×',',').trim();
    return ev;
  }); 
  kintone.events.on("app.record.create.submit.success",async function(ev) {
    console.log("created submit success");
    window.parent.created_task_id = ev.recordId;
    const newSocket = await io.connect("https://kintone.dev.weebpal.com/");
    newSocket.on("connect",async function(data) {
      await newSocket.emit("join", "Hello server from client in edit");
    });
    var linkImage = await getImageRecord(ev.recordId);
    var objectAdd =  {task:ev.record,nameCol:parent.created_task_status,image:linkImage};
    await newSocket.emit("add", objectAdd);
    await createTaskLocation(window.parent.created_task_status ,ev.recordId);
    await cloneTaskDone(parent.created_task_status, ev.record.field_endDate.value, ev.record.$id.value, ev.record.field_recurring.value[0] || [], ev.record.field_recurring_status.value);
    
    // var current_column_class = "status-" + window.parent.created_task_status.trim().replace(" ", "-").toLowerCase();
    // window.parent.jQuery(`.${current_column_class}`).addClass('new-card-loading');
    window.parent.jQuery('#close-popup').trigger("click");
    // window.parent.$('#close-popup').trigger("click");
    return ev;
  });
  kintone.events.on("app.record.detail.process.proceed",async function(event){
    parent.kanban_new_status = event.nextStatus.value;
    await socket.emit("updatestatus",{idTask:event.record.$id.value,next:event.nextStatus.value});
    console.log("proceed");
    cloneTaskDone(event.nextStatus.value, event.record.field_endDate.value, event.record.$id.value, event.record.field_recurring.value, event.record.field_recurring_status.value);
  })
  kintone.events.on("app.record.edit.submit.success", async function(event) {
    console.log("after edit success");
    const newSocket = io.connect("https://kintone.dev.weebpal.com/");
    newSocket.on("connect",async function(data) {
      await newSocket.emit("join", "Hello server from client in edit");
    });
    await getCommentCount();
    await newSocket.emit('update',{task:event.record,nameCol:parent.current_column , image : listAllImages});
    await cloneTaskDone(event.record.Status.value, event.record.field_endDate.value, event.record.$id.value, event.record.field_recurring.value[0] || [], event.record.field_recurring_status.value);
    console.log("Emit event edit to users");
    window.parent.jQuery('#close-popup').trigger("click");
  });
  kintone.events.on(["app.record.create.show","app.record.edit.show"], function(events) {
    $('.gaia-ui-actionmenu-cancel').click(function(event) {
      var check = confirm("Are you sure you wan to cancel?");
       if(check) {
          window.parent.jQuery('#close-popup').trigger("click");
        }
        else {
          jQuery(jQuery('.gaia-argoui-app-menu-edit.gaia-argoui-app-menu')[0]).click(); 
        }
    });
    var repeatStatus = events.record.field_recurring.value.length || "";
    var listLabel = events.record.field_label_1.value;
    listLabel = listLabel == undefined ? [] : listLabel;
    listLabel = listLabel.length != 0 ? listLabel.trim().split(',') : [];
    //hide loading
    window.parent.jQuery('#myModal .modal-loader').addClass('disable');
    window.parent.jQuery('#iframeEdit').css({'display':'block'});
    window.parent.jQuery('#myModal .modal-dialog').css({'height': 'calc(100% - 3.5rem)'});
    window.parent.jQuery('#myModal .modal-dialog').addClass("test");
    var body = $('#record-gaia > div > div:nth-child(3) > div > div.control-value-gaia');
    var markupLabel = '<select class="lablel" style="width:300px" class="form-control" multiple="multiple">';
    var arrayNewSet = listLabel.length != 0 ? [...new Set(listLabel.concat(window.parent.form_field_label))] : window.parent.form_field_label;
    arrayNewSet.forEach(item=>{
      var selected  = listLabel.includes(item) ? `selected="selected"` : "";
      markupLabel += `<option ${selected} value="Lamborghini">${item}</option>`
    });
    markupLabel += '</select>';
    body.html(markupLabel);
    $($('.input-datetime-cybozu input')[0]).attr('placeholder','MM/DD/YY');
    $($('.input-datetime-cybozu input')[1]).attr('placeholder','HH/MM');
    $($('.input-time-cybozu input')[1]).attr('placeholder','HH/MM');
    $(".lablel").select2({
      placeholder: "Label", //placeholder
      tags: true,
    });  
    //hide field
    kintone.app.record.setFieldShown('field_id', false);
    kintone.app.record.setFieldShown('Related_records', false);
    kintone.app.record.setFieldShown('parent_id', false);
    kintone.app.record.setFieldShown('field_label', false);
    kintone.app.record.setFieldShown('field_recurring_status', false);
    if(repeatStatus) {
      kintone.app.record.setFieldShown('field_recurring_day', true);
    }
    else {
      kintone.app.record.setFieldShown('field_recurring_day', false);
    }
    
  });
  kintone.events.on("app.record.detail.show", function(events) {
    window.parent.jQuery('#myModal .modal-loader').addClass('disable');
    window.parent.jQuery('#iframeEdit').css({'display':'block'});
    window.parent.jQuery('#myModal .modal-dialog').css({'height': 'calc(100% - 3.5rem)'});
    window.parent.jQuery('#myModal .modal-dialog').addClass("test");
    kintone.app.record.setFieldShown('field_label', false);
    kintone.app.record.setFieldShown('field_recurring_status', false);
    kintone.app.record.setFieldShown('field_recurring_day', false);
    setIconCopyModal();
    
  });
  kintone.events.on(["app.record.create.change.field_recurring", "app.record.edit.change.field_recurring"],function (events) {
    var repeat = events.record.field_recurring.value.length || "";
    if(repeat) {
      kintone.app.record.setFieldShown('field_recurring_day', true);
    } 
    else {
      kintone.app.record.setFieldShown('field_recurring_day', false);
    }
  });
  kintone.events.on("app.record.index.show",function (events) {
    getFormFieldLabel();
    events.records.forEach(record => {
      if (record.parent_id.value) {
        if (typeof(parent_tree_record[record.parent_id.value]) != "object") {
          parent_tree_record[record.parent_id.value] = {};
        }
        parent_tree_record[record.parent_id.value][record.$id.value] = record;
      }
    });
    // if(flag_is_create_subtask) {
    //   updateDropDownRecord(events.records);
    //   flag_is_create_subtask = false;
    // }
    if ($("#kanban-view").length) {
      var listRecord = [];
      var listCountC = [];
      var numberCountComment = [];
      var cols = 0;
      jQuery("#kanban-view").closest("body").find("a.gaia-argoui-app-menu-add").attr('href',null);
      jQuery("#kanban-view").closest("body").find("a.gaia-argoui-app-menu-add").attr('data-toggle',"modal");
      jQuery("#kanban-view").closest("body").find("a.gaia-argoui-app-menu-add").attr('data-target',"#myModal");

      var buildViewMarkup = async function (status) {
        var listCountComment  = await getCommentCount();
        const arrActions = [];
        list_status = global_status_res;
        global_status_res.forEach((element) => {
          arrActions.push(getListRecordByStatus(element.name));
        });
        Promise.all(arrActions)
          .then((values) => {
            values.forEach(re=>{
              re.records.forEach(task=>{
                task["comment_count"] = listCountComment[task.$id.value];
              })
            })
            listRecord = values;              
            for (var i = 0; i < list_status.length; i++) {
              // let disabled = config.status[i] != undefined ? config.status[i].disabled : false;
              // let color = config.status[i] != undefined ? config.status[i].color : 'BLACK';                
              if(config.status[i]){
                if(config.status[i].disabled == false){
                  cols ++;
                }
              }else{
                cols ++;
              }
            }
          })
          .then(function () {
            var first = true;               
            var fullMarkup = `<div class="row row-status cols-${cols}">`;
            list_status.forEach((nameStatus, index) => {
              if(config_index[nameStatus.name] == undefined){config_index[nameStatus.name] = {name:nameStatus.name,disabled:false,color:'BLACK'}};
              if (config_index[nameStatus.name].disabled == false  || flag == 0){
              var statusClassName = 'status-' + nameStatus.name
              .trim()
              .replace(" ", "-")
              .toLowerCase();
              fullMarkup += `<div class="col status-col ${statusClassName} ${first ? "first":""}" data-status="${nameStatus.name}">
                                <div class="col-content color-${config_index[nameStatus.name].color.replace(" ","-").toLowerCase()}">
                                  <div class="col-header">
                                    <div class="col-title">${nameStatus.name}</div>
                                    <div class="counter-due"></div>
                                  </div>
                                    <div class="view">`;
              fullMarkup += buildColumn(nameStatus,listRecord[index]);
              var active = listRecord[index].records.length ? true:false;
              fullMarkup +=`
                                      </div>
                                      </div>
                          <div class="card-container">
                        <a class="add-card-btn" data-toggle="modal" data-target="#myModal">
                          <i class="fas fa-plus"></i>
                          <span class="add-a-card-btn ${!active ? "active":""}">Add a card</span>
                          <span class="add-another-card-btn ${active ? "active":""}" >Add a card</span> 
                        </a>
                      </div>
                    </div>
                  </div>`;
              }
              first = false;
            });
            fullMarkup += `</div>`;
            $("#kanban-view").addClass([
              "kanban-board",
              config.display,
            ]);
            $("#kanban-view").css({
              height: $("body").height() - jQuery(".gaia-argoui-app-index-toolbar").offset().top + 10,
            });
            $("#kanban-view").append(fullMarkup);
            Object.keys(count_due).forEach(e=>{
              if(count_due[e] > 0){
                $(`[data-status="${e}"] .counter-due`).text(`${count_due[e]} overdue tasks`);
              }
              else {
                $(`[data-status="${e}"] .counter-due`).css({display: "none",})
              }
            })
            $("#kanban-view").append(`<div class="container">
            <!-- The Modal -->
            <div class="modal" id="myModal">
              <div class="modal-dialog">
                <div class="modal-content">
                
                  <!-- Modal Header -->
                  <div class="modal-header">
                    <h4 class="modal-title"></h4>
                    <button type="button" id="close-popup" class="close" data-dismiss="modal">&times;</button>
                  </div>
                  
                  <!-- Modal body -->
                  <div class="modal-loader">
                    <div class="loading"></div>
                  </div>
                  <div class="modal-body">
                  </div>
                  
                  <!-- Modal footer -->
                  <div class="modal-footer">
                    <button type="button" class="btn btn-danger" data-dismiss="modal">Close</button>
                  </div>
                  
                </div>
              </div>
            </div>
            
            </div>`);
            $("#kanban-view").append(`<div class="url-popup popup">
              <div class=popup-header>
              <span>Task URL</span>
              </div>
              <div class=popup-body>
                <div class=url-link>
                
                </div>
              </div>
            </div>`);
            $("#kanban-view").append(`<div class="estimate-popup popup" style="display:none;">
              <div class="popup-header">
                <span>Add time estimate</span>
              </div>
              <div class="popup-body">
                <div class="error"></div>
                <input type="number" name="esti-time" placeholder="hours(h)"/>
              </div>
              <div class="popup-footer">
                <button>Add</button>
              </div>
            </div>`)
            $(function() {
              console.log("begin create event");
              socket.on("updateEteTime", function(etmeObj){
                etmeObj.time = parseInt(etmeObj.time) == etmeObj.time ? etmeObj.time : etmeObj.time.toFixed(1)
                $(`[data-id=${etmeObj.id}] .estimate-time`).text(etmeObj.time );
              })   
              socket.on("updatename", function(response){
                $(`[data-id=${response.idTask}] .user-item`).text(response.newName);
                kanban_new_status = false;
                current_column = false;
              })                 
              socket.on('changeassign',async function(response){
                var oldName = $(`[data-id=${response.idTask}] .user-item`).text();
                if(oldName != response.newName){
                  $(`[data-id=${response.idTask}] .user-item`).text(response.newName);
                }
              })                
              socket.on('add', function(task){
                console.log('add');
                var markup =  buildTaskColumn(task.task,task.image);
                $(`[data-weight=${number_column_status[task.nameCol]}]`).append(markup);
                
                task.task.Status.value = task.nameCol;
                dueTaskUpCre(task.task);
                clone_created_task_status = false;
                
                reloadEvent(task.task.$id.value);
              });
              socket.on('delete',function(dataId){
                var taskDel = $(`[data-id=${dataId}]`);
                var parentIdtask = $(`[data-id=${dataId}] [task-id-parent-sub]`).attr('task-id-parent-sub');
                if(parentIdtask != "" || parentIdtask != undefined) {
                  parentIdtask in parent_tree_record ? dataId in parent_tree_record[parentIdtask] ? delete parent_tree_record[parentIdtask][dataId] : null : null;
                }
                var counterSubTaskParent = parent_tree_record[parentIdtask] != undefined ? Object.keys(parent_tree_record[parentIdtask]).length : 0;
                $(`[task-id-sub="${parentIdtask}"]`).text(counterSubTaskParent);
                if($(taskDel).find('.views-field-duetime.ovever-due').length != 0){
                  var statusDue = $(taskDel).closest('[data-status]').attr('data-status');
                  updateOneColumnDueTask(statusDue);
                }
                if(taskDel){
                  taskDel.remove();
                }
              });
              socket.on('move',function(objectMove){
                var strHtml  = $(`[data-id=${objectMove.idTask}]`).prop('outerHTML');
                var from = $(`[data-id=${objectMove.idTask}]`).closest('[data-status]').attr('data-status');
                if($(`[data-id=${objectMove.idTask}] .views-field-duetime.ovever-due`).length != 0){
                  updateAnyColumnDueTask(from,objectMove.receive);
                }
                $(`[data-id=${objectMove.idTask}]`).remove();
                if( $(`[data-status="${objectMove.receive}"]`).find(`.view-content > div:nth-child(${objectMove.index})`).length != 0){
                  $(`[data-status="${objectMove.receive}"]`).find(`.view-content > div:nth-child(${objectMove.index})`).after(strHtml);
                }else{
                  $(`[data-status="${objectMove.receive}"]`).find('.view-content').append(strHtml);
                }
                
                reloadEvent(objectMove.idTask);
              });
              socket.on('updatestatus', async (taskdDet) => {
                var newTask = await getTaskById(taskdDet.idTask);
                var statusDue = $(`[data-id=${taskdDet.idTask}]`).closest('[data-status]').attr('data-status');
                var nameAssign = newTask.record.Assignee.value[0].name.slice(0,2);
                $(`[data-id=${taskdDet.idTask}] .user-item`).text(taskdDet.name);
                var strHtml  = $(`[data-id=${taskdDet.idTask}]`).prop('outerHTML');
                if($(`[data-id=${taskdDet.idTask}] .views-field-duetime.ovever-due`).length != 0){
                  updateAnyColumnDueTask(statusDue,taskdDet.next);
                }
                $(`[data-id=${taskdDet.idTask}]`).remove();
                $(`[data-status="${taskdDet.next}"]`).find(`.view-content > div:nth-child(1)`).after(strHtml);
                
                reloadEvent(taskdDet.idTask);
                
              });           
              socket.on('update',function(task){
                console.log("socket update");
                var recurring= task.task.field_recurring.value.length != 0 ? true : false;
                var id = task.task.$id.value;
                var name = task.task.name.value;
                var attackment = task.task.file.value.length;
                var listImage = task.image;
                var color = task.task.color.value.replace(" ", "-").toLowerCase();
                let manualTime = (moment.duration(task.task.field_manual_time.value).asHours());
                manualTime = parseInt(manualTime) == manualTime ? manualTime : manualTime.toFixed(1);
                dueTaskUpCre(task.task);
                if(attackment == 0){
                  $(`[data-id="${id}"]`).find('.views-field-image .field-content').remove();
                }else{
                  var fileKey = task.task.file.value[0].fileKey;
                  if($(`[data-id="${id}"]`).find('.views-field-image .field-content img').length != 0){
                    var oldSrc = $(`[data-id="${id}"]`).find('.views-field-image .field-content img').attr('src');
                    if(oldSrc != listImage[fileKey]){
                      $(`[data-id=${id}]`).find('.views-field-image .field-content img').attr('src',listImage[fileKey]);
                    }
                  }else{
                    var imgItem = `<img src="${listImage[fileKey]}" alt="image.jpg" />`;
                    $(`[data-id=${id}]`).find('.views-field-image .field-content').append(imgItem);
                  }                  
                }
                $(`[data-id="${id}"]`).find('.views-field-title .field-content').text(name);
                $(`[data-id=${id}]`).find('.counter-attackment').text(attackment);
                $(`[data-id=${id}]`).attr('recurring',recurring);
                var className = $(`[data-id=${id}]`).attr('class').split(' ').find((e,i)=>{if(e.indexOf("card-") != -1){return e;}});
                $(`[data-id=${id}]`).removeClass(className);
                $(`[data-id=${id}]`).addClass(`card-${color}`);
                $(`[data-id=${id}] .estimate-time`).text(manualTime);
                // var taskDel = $(`[data-id=${dataId}]`);
                // if(taskDel){
                //   taskDel.remove();
                // }
                // reloadEvent();
              });
              socket.on('sentmessage',function(objectTask){
                $(`[data-id=${objectTask.idTask}]`).find('.counter-message').text(objectTask.number);
              })                  
              $sortable = $(".view-content")
                .sortable({
                  connectWith: ".view-content",
                  receive: function(event, ui){
                    var receive = list_status[ui.item.parent().attr("data-weight")].name;
                    var sender =  list_status[ui.sender.attr("data-weight")].name;
                    var idSender = ui.item.attr('data-id');
                    var recurring = ui.item.attr('recurring').length != 0 ? ["repeat"] : [];
                    var isAccess =  ui.item.find('.user-item').attr('code').toString() != kintone.getLoginUser().code.toString();
                    var repeatStatus = ui.item.attr('due') || '';
                    var endDate = ui.item.attr('date') || '';
                    validate = getListStatusActions.filter(element=>{
                      if(element.from == sender && element.to == receive){
                        return element;
                      }
                    })
                    if(validate.length == 0 || isAccess){
                      $(ui.sender).sortable('cancel');
                      validate = null;
                    }
                    else {
                        if($(ui.item).find('.views-field-duetime.ovever-due').length != 0){
                        updateAnyColumnDueTask(sender,receive)
                        }
                        updateStatus(
                        receive,
                        idSender
                      )
                      .then((value) => {
                        $sortable.sortable( "refresh" );
                        var index = $(ui.item[0]).index();
                        socket.emit("move",{idTask:idSender,receive:receive,index:index});
                        console.log("clone task done begin")
                        if(receive == "Done") {
                          cloneTaskDone(receive, endDate, idSender, recurring, repeatStatus);
                        }
                      })
                      .catch((err) => {
                        
                        var id = $(ui.item).attr('data-id');
                        var oldStatusColumn = $(ui.sender).closest('.status-col').attr('data-status');
                        var resOld = $(ui.item).closest('.status-col').attr('data-status');
                        var newStatusColumn = $(`[data-id=${id}]`).closest('.status-col').attr('data-status');
                        if(ui.item.find('.user-item').attr('code').toString() != kintone.getLoginUser().code.toString()){
                          if(resOld == newStatusColumn){
                            var taskItem = $(ui.item).attr('data-id');
                            $(ui.sender).sortable('cancel');
                          }                              
                        }
                        
                        validate = null;
                      });
                    }
                  },
                })
                .disableSelection();
              $('.button-delete').click(async function(event)
              { 
                var taskId= jQuery(event.currentTarget).closest('[data-id]').attr('data-id');
                var check = confirm("Do you want delete record?");
                if(check == false) {
                  return;
                }
                await socket.emit('delete',taskId);
                var value = deleteRecord(taskId);
                window.parent.jQuery('#close-popup').trigger("click");
              });                 
              $('.button-edit').click(function(e){
                $('.modal-loader').removeClass('disable');  
                // parent.current_column = $(e.currentTarget).closest('[data-weight]').attr('data-weight'); 
                id_item_edit = $(this).closest('.views-row').attr('data-id');
                parent.current_column = $(this).closest('.status-col').attr('data-status');
                createPopUpEdit(id_item_edit);
                
                
                // alert('click me');
                // e.stopPropagation();
              });                
              $('.estimate-popup button').click(async function(){
                var time = jQuery('.estimate-popup input').val();
                if(parseFloat(time) == time && parseFloat(time) > 0) {
                  await socket.emit('updateEteTime', {id : id_item_edit , time : time%24});
                  updateEstimateTask(id_item_edit,time);
                  console.log('success');
                }
                else {
                  $('.estimate-popup input').addClass("err");
                  $('.estimate-popup .error').text("invalid value") ;
                }
              })
              $('.button-detail').click(function(event){
                $('.modal-loader').removeClass('disable');  
                id_item_edit = $(this).closest('.views-row').attr('data-id');
                parent.current_column = $(this).closest('.status-col').attr('data-status');
                createPopUp(id_item_edit);
                // window.parent.jQuery('#myModal').css({'z-index':'1000'});
                // window.parent.jQuery('.modal-backdrop').css({'z-index':'999'});
              })  
              $('.views-row-content').click(function(event){
                $('.modal-loader').removeClass('disable');  
                // parent.current_column = $(event.currentTarget).closest('[data-weight]').attr('data-weight');
                id_item_edit = $(this).closest('.views-row').attr('data-id');
                parent.current_column = $(this).closest('.status-col').attr('data-status');
                createPopUp(id_item_edit);
                
              })
              $('.add-card-btn').click(function(){
                $('.modal-loader').removeClass('disable');  
                created_task_status = $(this).closest('.status-col').attr('data-status');
                createPopUpAdd();
                parent.current_column = 0;
              })
              $('.button-sub-task').click(function(event) {
                $('.modal-loader').removeClass('disable');  
                created_task_status = $(this).closest('.status-col').attr('data-status'); 
                createPopupAddSubTask();
                parent.current_column = 0;
                flag_is_create_subtask.status = true;
                flag_is_create_subtask.parentId = $(this).closest('[data-id]').attr('form-id');
              });
              $('.button-url-iframe').one("click", function() {
                if(jQuery('.url-link').length === 1) {
                    jQuery('.url-link').removes();
                }
                else {
                    var markup = `
                    <div class="url-link">
                        <input id="url-${kintone.app.record.getId()}" type="text" value='https://${window.location.hostname + "/k/" + kintone.app.getId() + "/show#record="+kintone.app.record.getId()}' />
                        <div class="button-copy">Copy</div>
                    </div>`;
                    if(window.parent.jQuery(".modal-title").text() == createTitleName().edit){
                    $('.gaia-argoui-app-edit-buttons').append(markup);
                    }
                    else {
                    $('.gaia-app-statusbar-actionlist').append(markup);
                    }
                    
                    $('.button-copy').click(function(event) {
                    var item_id = $('.url-link input').attr('id');
                    copyToClipboard(item_id);
                    })
                    reloadEvent();
                }
            })

              $('.button-url').click(function(event){
                if ($('.url-popup').hasClass('popup-open') != true) {
                  $(this).closest('body').addClass('modal-open');
                  $('.url-popup').addClass('popup-open');
                  $(this).closest('.group-button').attr("style", "display: flex;");
                  id_item_edit = $(this).closest('.views-row').attr('data-id');
                  $('.url-popup').css({
                    top: jQuery(this).closest('.group-button').offset().top + 32 - jQuery(window).scrollTop(),
                  });
                  let left_position =  jQuery(this).closest('.group-button').offset().left;
                  let width = jQuery('.url-popup').outerWidth();
                  if (overScreen(left_position, width, 'left')) {
                    $('.url-popup').css({
                      left: left_position,
                    });
                  }
                  else {
                    $('.url-popup').css({
                      left: left_position - width + $(this).closest('.group-button').outerWidth(),
                    });
                  }
                  createPopUpUrl(id_item_edit);
                }
                else {
                    $(".url-popup").removeClass('popup-open');
                    $("body").removeClass("modal-open");
                    $(this).closest('.group-button').removeAttr('style');
                    id_item_edit = false;
                }
                event.stopPropagation();
              })
              $(window).click(function () {
                closeCopy();
                closeEstimate();
              })
              $(".button-estimate").click(function(event) {
                if($(".estimate-popup.show-popup").length == 0) {
                  
                  $(".estimate-popup").addClass('show-popup');
                  $("body").addClass('modal-open');
                  $('.estimate-popup').show();
                  id_item_edit = $(this).closest('[data-id]').attr('data-id');
                  $(".estimate-popup").css({
                    top: jQuery(this).closest('.group-inner').offset().top + 34 - jQuery(window).scrollTop() - jQuery(".estimate-popup").height(),
                    maxWidth: "250px",
                  });
                  let right_position = jQuery(this).closest('.group-inner').offset().left + jQuery(this).closest('.group-inner').outerWidth() + 10;
                  let width = jQuery('.estimate-popup').outerWidth();
                  if(overScreen(right_position, width, 'right')) {
                    $(".estimate-popup").css({
                      left: right_position - width - $(this).outerWidth() - 15,
                    })
                  }
                  else {
                    $(".estimate-popup").css({
                      left: right_position,
                    })
                  }
                }
                else {
                  $(".estimate-popup").removeClass('show-popup');
                  $("body").removeClass('modal-open');
                  $(".estimate-popup").hide();
                  id_item_edit = false;
                }
                event.stopPropagation();
              })
              $("#kanban-view").closest("body").find("a.gaia-argoui-app-menu-add").click(function(event){
                created_task_status = $($('[data-status]')[0]).attr('data-status');
                createPopUpAdd();
                parent.current_column = 0;
                flag_is_create_subtask.status = true;
              })
              $("#myModal").on('hidden.bs.modal',async function(event){
                
                
                $('.modal-loader').removeClass('disable');  
                $('#iframeEdit').css({'display':'none'});
                
                if(created_task_status && created_task_id){
                  console.log("else 0")
                  var clone_created_task_id = created_task_id;
                  clone_created_task_status = created_task_status;
                  created_task_id = false;
                  created_task_status = false;
                  $('.new-card-loading').removeClass('new-card-loading');
                }
                else if(parent.kanban_new_status != '' && parent.current_column != parent.list_status.length){
                  console.log("else 1");
                  var clone_kanban_new_status = parent.kanban_new_status;
                  var clone_current_column = parent.current_column;
                  // parent.kanban_new_status = false;
                  // current_column = false;
                  var newTask = await getTaskById(id_item_edit);
                  var code = [];
                  newTask.record.Assignee.value.forEach(element=>{
                    code.push(element.code);
                  })
                  await socket.emit('updatename',{idTask : id_item_edit , newName : newTask.record.Assignee.value[0].name.slice(0,2), code : newTask})
                }else {
                  console.log("else 2")
                  var clone_kanban_new_status = kanban_new_status;
                  var clone_current_column = parent.current_column;
                  parent.kanban_new_status = false;
                  current_column = false;
                  var listCountCommentNew  = await getCommentCount();
                  if(id_item_edit) {
                    var countComment  = await getCountComment(id_item_edit);
                    await socket.emit('sentmessage',{idTask:id_item_edit, number : countComment});
                    var currentTask = await getTaskById(id_item_edit)
                    await socket.emit('changeassign', {idTask:id_item_edit ,newName : currentTask.record.Assignee.value[0].name.slice(0,2)});
                    reloadEvent(id_item_edit);
                  }
                  id_item_edit = false;
                  $('.new-card-loading').removeClass('new-card-loading');
                }
              });
            });
        });
      };
      buildViewMarkup();     
    }
  });
})(jQuery, kintone.$PLUGIN_ID);
