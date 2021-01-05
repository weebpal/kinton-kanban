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
    return new Promise((resolve, reject) => {
      var query = `Status="${status}"`;
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

  var getLayoutForm = function () {
    return new Promise((resolve, reject) => {
      var body = {
        app: kintone.app.getId(),
      };
      kintone.api(
        kintone.api.url("/k/v1/app/form/layout", true),
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
  };

  function buildColumn(nameStatus,listRecord){
  
    var markup = '';
    var listActions = [];
    var listId = [];
    
    markup += `
        <div class="view-content list-body" id="status-${
          nameStatus.index
        }" data-weight="${nameStatus.index}">`;
    markup += `<div class="col-loading"><span></span></div>`;
       Object.values(listRecord.records).forEach(
    (element) => {
      var imageUrl = false;
      var user = [];
      var convertElement = Object.entries(element); 
      
      convertElement.forEach((eleValue,eleKey)=>{
        var eleValue = eleValue[1];
        if(eleValue.type == 'FILE' && !imageUrl && eleValue.value.length){
          imageUrl = listAllImages[eleValue.value[0].fileKey];
        }
      })
      element.Assignee.value.forEach(element=>{
        user.push(`<li class="user-item">${element.name.slice(0,2)}</li>`); 
      })

      markup += `<div class="views-row" data-id="${element.$id.value}">
                    <div class="group-button">
                      <div class="button-edit"  data-toggle="modal" data-target="#myModal">
                        <i class="far fa-edit"></i>
                      </div>
                      <div>
                        <button class="button-delete" task-id="${element.$id.value}" ><i class="far fa-trash-alt"></i></button>
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
    return new Promise((resolve, reject)=>
    {
       var body = {
      "app": kintone.app.getId(),
      "ids":[id]
      }
      kintone.api(
          kintone.api.url("/k/v1/records", true),
          "DELETE",
          body,
          function (resp) {
            console.log(resp);
            resolve(resp);
          },
          function (error) {
            console.log(error);
            reject(error);
          }
        );
    })
   
  }

  var updateStatus = function (status, id) {
    return new Promise((resolve, reject) => {
      var body = {
        app: kintone.app.getId(),
        "id": id,
        "action": `${status}`,
        "assignee": `${kintone.getLoginUser().email.toString()}`,
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

  async function updateStatusNew(arrPath,id){
    var resutArr = [];
    for(var i = 0; i < arrPath.length - 1; i ++) {
        var body = {
          app: kintone.app.getId(),
          "id": id,
          "action": `${arrPath[i+1]}`,
          "assignee": `${kintone.getLoginUser().email.toString()}`,
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

  var timeoutPopup;
  function createPopUp(id){
    var markup = 
    `
    <iframe id="iframeEdit" src="${"/k/" + kintone.app.getId() + "/show#record="+id+"&l.view=20&l.q&l.next=0&l.prev=0"+ "?kanban-popup=true"}">
    </iframe>
  `
    $('#myModal .modal-body').html(markup);
    $('#myModal .modal-title').html("Card detail");

    $(document.getElementById('iframeEdit').contentWindow.document.head).append('https://weebpal.kintone.com/k/api/plugin/content/download.do?contentId=26180&type=DESKTOP_CSS&pluginId=dfeabpkogjeianljahgpcfabiomlfpal');
    $(document.getElementById('iframeEdit').contentWindow.document.body).addClass("customCssIframe");
    if(timeoutPopup){
      clearTimeout(timeoutPopup);
    }
    timeoutPopup =  setTimeout(() => {
      $('#myModal .modal-loader').addClass('disable');
      $('#iframeEdit').css({'display':'block'});
    }, 200);
    
  }
  var timeoutPopupAdd;
  function createPopUpAdd(){
    $('#myModal .modal-title').html("Add New Card");
    var markup = 
    `
    <iframe id="iframeEdit" src="${"/k/" + kintone.app.getId() + "/edit?kanban-popup=true"}">
    </iframe>
    
  `;
    $('#myModal .modal-body').html(markup);

    $(document.getElementById('iframeEdit').contentWindow.document.head).append('https://weebpal.kintone.com/k/api/plugin/content/download.do?contentId=26180&type=DESKTOP_CSS&pluginId=dfeabpkogjeianljahgpcfabiomlfpal');
    $(document.getElementById('iframeEdit').contentWindow.document.body).addClass("customCssIframe");
    if(timeoutPopupAdd){
      clearTimeout(timeoutPopupAdd);
    }
    timeoutPopupAdd =  setTimeout(() => {
      $('#myModal .modal-loader').addClass('disable');
      $('#iframeEdit').css({'display':'block'});
      $('#myModal .modal-dialog').css({'height': 'calc(100% - 3.5rem)'});
      $('#myModal .modal-dialog').addClass("test");
    }, 150);
    
  }


  var timeoutPopupEdit;
  function createPopUpEdit(id){
  
    $('.modal-title').html("Edit Card");
    var markup = 
    `
    <iframe id="iframeEdit" src="${"/k/" + kintone.app.getId() + "/show#record="+id+"&l.view=20&l.q&l.next=37&l.prev=0&mode=edit"}">
    </iframe>
    
  `;
    $('.modal-body').html(markup);

    $(document.getElementById('iframeEdit').contentWindow.document.head).append('https://weebpal.kintone.com/k/api/plugin/content/download.do?contentId=26180&type=DESKTOP_CSS&pluginId=dfeabpkogjeianljahgpcfabiomlfpal');
    $(document.getElementById('iframeEdit').contentWindow.document.body).addClass("customCssIframe");
    if(timeoutPopupEdit){
      clearTimeout(timeoutPopupEdit);
    }
    timeoutPopupEdit =  setTimeout(() => {
      $('.modal-loader').addClass('disable');
      $('#iframeEdit').css({'display':'block'});
      $('.modal-dialog').css({'height': 'calc(100% - 3.5rem)'});
      $('.modal-dialog').addClass("test");
    }, 150);
    
  }

  function reloadEvent(){

    $('.button-delete').click(async function(event)
    { 
      var taskId= jQuery(event.currentTarget).closest('[data-id]').attr('data-id');
      var value = await deleteRecord(taskId);
      $(`.view-content [data-id=${taskId}]`).remove();
    });

    $('.views-row-content').click(function(event){
      parent.current_column = $(event.currentTarget).closest('[data-weight]').attr('data-weight');
      createPopUp($(event.currentTarget).parent().attr('data-id'));
    })
    $('.button-edit').click(function(event){
      parent.current_column = $(event.currentTarget).closest('[data-weight]').attr('data-weight');
      createPopUpEdit($(event.currentTarget).closest('[data-id]').attr('data-id'));
      // e.stopPropagation();
    });
   
    $('.add-card-btn').click(function(){
      created_task_status = $(this).closest('.status-col').attr('data-status');
      createPopUpAdd();
      parent.current_column = 0;
    });
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
        validate = getListStatusActions.filter(element=>{
          if(element.from == sender && element.to == receive){
            return element;
          }
        })

        if(validate.length == 0){
          $(ui.sender).sortable('cancel');
          validate = null;
        }else{
          updateStatus(
           receive,
           idSender
          )
          .then((value) => {
          })
          .catch((err) => {
            window.location.reload();
          });
        }
      },
    })
    .disableSelection();
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



  kintone.events.on("app.record.create.submit.success", function(ev) {
    window.parent.created_task_id = ev.recordId;
    var current_column_class = "status-" + window.parent.created_task_status.trim().replace(" ", "-").toLowerCase();
    window.parent.jQuery(`.${current_column_class}`).addClass('new-card-loading');
    window.parent.jQuery('#close-popup').trigger("click");
    // window.parent.$('#close-popup').trigger("click");
  });

  kintone.events.on("app.record.detail.process.proceed",function(event){
    parent.kanban_new_status = event.nextStatus.value;
  })

  kintone.events.on("app.record.edit.submit.success", function(event) {
    // if($('.modal-body iframe').attr('src').search('kanban-popup') == -1){
    //   idKanban().then(value=>{
    //     window.location.href = "/k/" + kintone.app.getId() + "/?view="+value;
    //   })
    // }else{

    // }
  });

  kintone.events.on("app.record.index.show",function (events) {
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
  
                  if(!config.status[index] || config.status[index].name != nameStatus.name){config.status[index]={disabled:false,color:'BLACK'}};
  
                  if (config.status[index].disabled == false  || flag == 0){
                   
                  var statusClassName = 'status-' + nameStatus.name
                  .trim()
                  .replace(" ", "-")
                  .toLowerCase();
  
                  fullMarkup += `<div class="col status-col ${statusClassName} ${first ? "first":""}" data-status="${nameStatus.name}">
                                    <div class="col-content color-${config.status[index].color.toLowerCase()}">
                                      <div class="col-title">${nameStatus.name}</div>
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
                              <span class="add-another-card-btn ${active ? "active":""}" >Add another card</span> 
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
                  height:
                    screen.height -
                    jQuery(".gaia-argoui-app-index-toolbar").offset().top +
                    10,
                });
                $("#kanban-view").append(fullMarkup);
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
        
            //begin func
                $(function () {
                 
                  $sortable = $(".view-content")
                    .sortable({
                      connectWith: ".view-content",
                      receive: function(event, ui){
                        var receive = list_status[ui.item.parent().attr("data-weight")].name;
                        var sender =  list_status[ui.sender.attr("data-weight")].name;
                        var idSender = ui.item.attr('data-id');
                        validate = getListStatusActions.filter(element=>{
                          if(element.from == sender && element.to == receive){
                            return element;
                          }
                        })
                        if(validate.length == 0){
                          $(ui.sender).sortable('cancel');
                          validate = null;
                        }
                        else{
                           updateStatus(
                            receive,
                            idSender
                          )
                          .then((value) => {
                            $sortable.sortable( "refresh" );
                          })
                          .catch((err) => {
                            alert(err.error);
                            window.location.reload();
                          });
                        }
                      },
                    })
                    .disableSelection();
  
                  $('.button-delete').click(async function(event)
                  { 
                    var taskId= jQuery(event.currentTarget).closest('[data-id]').attr('data-id');
                    var value = await deleteRecord(taskId);
                    $(`.view-content [data-id=${taskId}]`).remove();
                  });
                  
                  $('.button-edit').click(function(e){
                    parent.current_column = $(e.currentTarget).closest('[data-weight]').attr('data-weight');
                    createPopUpEdit($(e.currentTarget).closest('[data-id]').attr('data-id'));
                    
                    // alert('click me');
                    // e.stopPropagation();
                  });
                  
                  $('.views-row-content').click(function(event){
                    parent.current_column = $(event.currentTarget).closest('[data-weight]').attr('data-weight');
                    createPopUp($(event.currentTarget).parent().attr('data-id'));
                    
                  })
                  $('.add-card-btn').click(function(){
                    created_task_status = $(this).closest('.status-col').attr('data-status');
                    createPopUpAdd();
                    parent.current_column = 0;
                  })
                  $("#kanban-view").closest("body").find("a.gaia-argoui-app-menu-add").click(function(event){
                    createPopUpAdd();
                    parent.current_column = 0;
                  })
                  //Hiden PopUp
                  $("#myModal").on('hidden.bs.modal',async function(event){
                    
                    $('.modal-body').html("");
                    $('.modal-loader').removeClass('disable');  
                    $('#iframeEdit').css({'display':'none'});

                    if(created_task_status && created_task_id){
                      var clone_created_task_id = created_task_id;
                      var clone_created_task_status = created_task_status;
                      created_task_id = false;
                      created_task_status = false;

                      
                      var start_status = 'Backlog';
                      var path = global_path_matrix[start_status][clone_created_task_status]; // result = ['Backlog', 'In Progress', 'Resolved', 'In Review', 'Done']
                      var a = await updateStatusNew(path,clone_created_task_id);
                      for(var i = 0; i < path.length -1; i ++) {
                        var status_from = path[i];
                        var status_to = path[i+1];
                        // promiseUpdateStatus.push(updateStatus(status_to,created_task_id));
                      }
                      let listRe = await getListRecordByStatus(clone_created_task_status);
                      var listCountCommentNew  = await getCommentCount();
                      listRe.records.forEach(task=>{
                        task["comment_count"] = listCountCommentNew[task.$id.value];
                      })
                      var newMarkup = buildColumn(parent.list_status[number_column_status[clone_created_task_status]],listRe);
                      $($('.view')[number_column_status[clone_created_task_status]]).html(newMarkup); 

                      reloadEvent();
                      $('.new-card-loading').removeClass('new-card-loading');
                    }
                    else if(parent.kanban_new_status != '' && parent.current_column != parent.list_status.length){
                  
                      var clone_kanban_new_status = parent.kanban_new_status;
                      var clone_current_column = current_column;
                      parent.kanban_new_status = false;
                      current_column = false;


                      var listRecordByStatus = [];
                     
                      var listCountCommentNew  = await getCommentCount();
                     
                      listRecordByStatus.push(getListRecordByStatus(parent.list_status[clone_current_column].name));
                      listRecordByStatus.push(getListRecordByStatus(parent.clone_kanban_new_status));

                      Promise.all(listRecordByStatus).then(list_sts=>{
                        var flag_column = parseInt(parent.clone_current_column);
                        list_sts.forEach(item_sts=>{
                          item_sts.records.forEach(task=>{
                            task["comment_count"] = listCountCommentNew[task.$id.value];
                          })
                          var newMarkup = buildColumn(parent.list_status[flag_column],item_sts);
                          $($('.view')[flag_column]).html(newMarkup);
                          flag_column = number_column_status[clone_kanban_new_status];
                        })

                        reloadEvent();
                        $('.new-card-loading').removeClass('new-card-loading');
                      });
                    }else {

                      var clone_kanban_new_status = kanban_new_status;
                      var clone_current_column = current_column;
                      parent.kanban_new_status = false;
                      current_column = false;


                      var listRecordByStatus = [];
                     
                      var listCountCommentNew  = await getCommentCount();
                      console.log(list_status[clone_current_column]);
                      console.log(list_status);
                      console.log(clone_current_column);
                      var list_sts = await getListRecordByStatus(parent.list_status[clone_current_column].name);
                      list_sts.records.forEach(task=>{
                        task["comment_count"] = listCountCommentNew[task.$id.value];
                      });
                      var newMarkup = buildColumn(parent.list_status[clone_current_column],list_sts);
                      $($('.view')[clone_current_column]).html(newMarkup);

                      
                      reloadEvent();
                      $('.new-card-loading').removeClass('new-card-loading');
                    }

                  });
  
                  
                });
                //end func
              });
            //create build row
       
        
      

      };
      buildViewMarkup();     
    }
  });
})(jQuery, kintone.$PLUGIN_ID);
