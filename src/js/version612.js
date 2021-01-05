jQuery.noConflict();
var kanban_new_status = '';
var list_status = [];
var current_column = -1;
var commnetCounter = [];
var listCountComment = [];
var listAllImages = {};
var validate;
var moving_task = false;
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

// TO COPY
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
                        // console.log(src + " -> " + mid + " -> " + des + " ::: " + min_matrix[src][mid] + " + " + min_matrix[mid][des] + " < " + min_matrix[src][des] + " ::: " + previous_matrix[src][des])
                        min_matrix[src][des] = min_matrix[src][mid] + min_matrix[mid][des];
                        previous_matrix[src][des] = previous_matrix[mid][des];
                        still_update = true;
                        // console.log(src + " -> " + des + " = " + previous_matrix[src][des] + " ::: " + min_matrix[src][des])
                    }
                });
            });
        });
      }
      while(still_update);

      // console.log("previous_matrix");
      // console.log(previous_matrix);
      // console.log("min_matrix");
      // console.log(min_matrix);
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
      // console.log("path_matrix");
      // console.log(path_matrix);
      return path_matrix;
  }
// END COPY


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
    console.log(param);
    var test = await new Promise((resolve,reject)=>{
      kintone.api(kintone.api.url('/k/api/app/'+kintone.app.getId()+'/record/list', true), 'POST', param, function(resp) {
        var records = resp.result.records;
        console.log(resp);
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
        console.log("result");
        console.log(listAllImages);
        console.log(result);
        resolve(result);
      },function(error) {
        reject(error);
      });
    })
    return test;
  }

  function getListRecordByStatus(status) {
    return new Promise((resolve, reject) => {
      var query = 'Status="' + status + '"';
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
       Object.values(listRecord.records).forEach(
    (element) => {
      console.log(element);
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
                    <div class="button-edit"  data-toggle="modal" data-target="#myModal">
                      <i class="far fa-edit"></i>
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
           
            // listActions.push(getCommentByIdRecord(element.$id.value));
            // listId.push(element.$id.value);
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
      // success
      getListStatusActions=resp.actions;
      console.log("Progress");
      console.log(resp);
      global_status_res =  Object.values(resp.states).sort((a, b) => parseInt(a.index) > parseInt(b.index) ? 1:-1);
      Object.keys(resp.states).forEach(i=>{number_column_status[i]= resp.states[i].index})
      var statuses = resp['states'];
      var process_items = resp['actions'];
      statuses = Object.values(statuses);
      var status_names = [];
      statuses.forEach((status) => {
        status_names.push(status.name);
      });
      console.log("0000000000000");
      global_path_matrix = getPathMatrix(status_names, process_items);
      console.log(global_path_matrix);
    },
    function (error) {
      // error
      
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
          //success
          if (resp.revision) {
            resolve(resp);
          }
        },
        function (error) {
          //error
          reject({ "error": "Can't not update status!" });
        }
      );
    });
  };

  async function updateStatusNew(arrPath,id){
    var resutArr = [];
    for(var i = 0; i < arrPath.length - 1; i ++) {
        console.log(arrPath[i]);
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
            console.log("error"+ i);
          }
        );
        }) 
        resutArr.push(test);
    }
    console.log(resutArr);
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
    $('.views-row-content').click(function(event){
      parent.current_column = $(event.currentTarget).closest('[data-weight]').attr('data-weight');
      createPopUp($(event.currentTarget).parent().attr('data-id'));
    })
    $('.button-edit').click(function(event){
      parent.current_column = $(event.currentTarget).closest('[data-weight]').attr('data-weight');
      createPopUpEdit($(event.currentTarget).parent().attr('data-id'));
    });
   
    $('.add-card-btn').click(function(){
      created_task_status = $(this).closest('.status-col').attr('data-status');
      console.log(created_task_status);
      createPopUpAdd();
      parent.current_column = 0;
    });

    $sortable = $(".view-content")
    .sortable({
      connectWith: ".view-content",
      receive: function(event, ui){
        if(moving_task){
          $sortable.sortable("cancel");
          return;
        }
        moving_task = true;
        var receive = list_status[ui.item.parent().attr("data-weight")].name;
        var sender =  list_status[ui.sender.attr("data-weight")].name;
        var idSender = ui.item.attr('data-id');
        validate = getListStatusActions.filter(element=>{
          if(element.from == sender && element.to == receive){
            return element;
          }
        })
        console.log("validate reload");
        console.log(validate);
        if(validate.length == 0){
          $sortable.sortable("cancel");
          validate = null;
         
        }else{
           updateStatus(
          receive,
          idSender
          )
          .then((value) => {
            console.log(value);
            moving_task = false;
          })
          .catch((err) => {
            moving_task = false;
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
    console.log("body success");
    window.parent.created_task_id = ev.recordId;
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
      var cols = 0;
      jQuery("#kanban-view").closest("body").find("a.gaia-argoui-app-menu-add").attr('href',null);
      jQuery("#kanban-view").closest("body").find("a.gaia-argoui-app-menu-add").attr('data-toggle',"modal");
      jQuery("#kanban-view").closest("body").find("a.gaia-argoui-app-menu-add").attr('data-target',"#myModal");
      var buildViewMarkup = async function (status) {
        var listCountComment  = await getCommentCount();
        console.log(listCountComment);
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
                        console.log(moving_task);
                        if(moving_task){
                          $sortable.sortable("cancel");
                          return;
                        }
                        console.log(moving_task);
                        moving_task = true;
                        var receive = list_status[ui.item.parent().attr("data-weight")].name;
                        var sender =  list_status[ui.sender.attr("data-weight")].name;
                        console.log("sender :" + sender);
                        console.log("receive : " + receive);
                        var idSender = ui.item.attr('data-id');
                        validate = getListStatusActions.filter(element=>{
                          if(element.from == sender && element.to == receive){
                            return element;
                          }
                        })
                        console.log("eixt process : " ,validate);
                        if(validate.length == 0){
                          console.log("1");
                          $sortable.sortable("cancel");
                          console.log("2");
                          validate = null;
                          moving_task = false;
                        }
                        else{
                           updateStatus(
                            receive,
                            idSender
                          )
                          .then((value) => {
                            console.log(value);
                            moving_task = false;
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
  
                  $('.button-edit').click(function(e){
                    parent.current_column = $(e.currentTarget).closest('[data-weight]').attr('data-weight');
                    createPopUpEdit($(e.currentTarget).parent().attr('data-id'));
                    
                    // alert('click me');
                    // e.stopPropagation();
                  });
                  
                  $('.views-row-content').click(function(event){
                    parent.current_column = $(event.currentTarget).closest('[data-weight]').attr('data-weight');
                    createPopUp($(event.currentTarget).parent().attr('data-id'));
                    
                  })
                  $('.add-card-btn').click(function(){
                    created_task_status = $(this).closest('.status-col').attr('data-status');
                    console.log(created_task_status);
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
                      var start_status = 'Backlog';
                      var path = global_path_matrix[start_status][created_task_status]; // result = ['Backlog', 'In Progress', 'Resolved', 'In Review', 'Done']
                      // for(var i = 0; i < path.length -1; i ++) {
                      //   var status_from = path[i];
                      //   var status_to = path[i+1];
                      //   // promiseUpdateStatus.push(updateStatus(status_to,created_task_id));
                      //   console.log("Move task from status '" + path[i] + "' to status '" + path[i + 1] + "'");
                      // }
                      let listRe = await getListRecordByStatus(created_task_status);
                      var listCountCommentNew  = await getCommentCount();
                      listRe.records.forEach(task=>{
                        task["comment_count"] = listCountCommentNew[task.$id.value];
                      })
                      var newMarkup = buildColumn(parent.list_status[number_column_status[created_task_status]],listRe);
                      $($('.view')[number_column_status[created_task_status]]).html(newMarkup); 
                      created_task_id = false;
                      created_task_status = false;
                      created_task_id = false;
                      reloadEvent();
                    }
                    else if(parent.kanban_new_status != '' && parent.current_column != parent.list_status.length){
                      var listRecordByStatus = [];
                      var listCountCommentNew  = await getCommentCount();
                      listRecordByStatus.push(getListRecordByStatus(parent.list_status[current_column].name));
                      listRecordByStatus.push(getListRecordByStatus(parent.kanban_new_status));
                      Promise.all(listRecordByStatus).then(list_sts=>{
                        var flag_column = parseInt(parent.current_column);
                        list_sts.forEach(item_sts=>{
                          item_sts.records.forEach(task=>{
                            task["comment_count"] = listCountCommentNew[task.$id.value];
                          })
                          var newMarkup = buildColumn(parent.list_status[flag_column],item_sts);
                          $($('.view')[flag_column]).html(newMarkup);
                          flag_column = number_column_status[kanban_new_status];
                        })
                        parent.kanban_new_status = false;
                        current_column = false;
                        reloadEvent();
                      })
                    }else {
                      var listRecordByStatus = [];
                      var listCountCommentNew  = await getCommentCount();
                      var list_sts = await getListRecordByStatus(parent.list_status[current_column].name);
                      list_sts.records.forEach(task=>{
                        task["comment_count"] = listCountCommentNew[task.$id.value];
                      });
                      var newMarkup = buildColumn(parent.list_status[current_column],list_sts);
                      $($('.view')[current_column]).html(newMarkup);
                      parent.kanban_new_status = false;
                      current_column = false;
                      reloadEvent();
                    }
                  });
                });
                //end func
              });
      };
      buildViewMarkup();     
    }
  });
})(jQuery, kintone.$PLUGIN_ID);
