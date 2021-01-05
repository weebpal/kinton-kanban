jQuery.noConflict();
var kanban_new_status = '';
var list_status = [];
var current_column = -1;
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
  // kintone.events.on('app.record.index.show', function() {
  //   var config = kintone.plugin.app.getConfig(PLUGIN_ID);

  //   var spaceElement = kintone.app.getHeaderSpaceElement();
  //   var fragment = document.createDocumentFragment();
  //   var headingEl = document.createElement('h3');
  //   var messageEl = document.createElement('p');

  //   messageEl.classList.add('plugin-space-message');
  //   messageEl.textContent = config.message;
  //   headingEl.classList.add('plugin-space-heading');
  //   headingEl.textContent = 'Hello kintone plugin!';

  //   fragment.appendChild(headingEl);
  //   fragment.appendChild(messageEl);
  //   spaceElement.appendChild(fragment);
  // });

  var config = kintone.plugin.app.getConfig(PLUGIN_ID);
  var flag = 0;
  if(config.message){
    config = JSON.parse(kintone.plugin.app.getConfig(PLUGIN_ID).message);
    flag = 1;
  }
  
  console.log('destop');

  // kintone.events.on('app.record.create.show', function(event) {
  //   jQuery('.container-gaia.no-navimenu-gaia.no-actionmenu-gaia').html();
  // })


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
      console.log(key);

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
          console.log(resp);
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
  function buildColumn(nameStatus,listRecord){
  
    var markup = '';
    var listCountComment = [];
    var listActions = [];
    var listId = [];
    markup += `
        <div class="view-content list-body" id="status-${
          nameStatus.index
        }" data-weight="${nameStatus.index}">`;
  Object.values(listRecord.records).forEach(
    (element) => {

      var user = [];
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
                        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Image_created_with_a_mobile_phone.png/220px-Image_created_with_a_mobile_phone.png" alt="image.jpg" />
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
                        <span class="counter counter-message">1</span>
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
           
            listActions.push(getCommentByIdRecord(element.$id.value));
            listId.push(element.$id.value);
        }
        );
        Promise.all(listActions).then(listCounter=>{
          listCounter.forEach((c,index)=>{
            $(`[data-id=${parseInt(listId[index])}]`).find('.counter-message').html(c);
          })
        })
        
    
    return markup;
  }

  //list actions global
  var getListStatusActions ;
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
    console.log(status);
    console.log(id);
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
  var timeoutPopup;
  function createPopUp(id){
    console.log(parent.current_column);
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
    }, 2000);
    
  }
  var timeoutPopupAdd;
  function createPopUpAdd(){
    $('#myModal .modal-title').html("Add New Card");
    var markup = 
    `
    <iframe id="iframeEdit" src="${"/k/" + kintone.app.getId() + "/edit?kanban-popup=true"}">
    </iframe>
    
  `;
  console.log(markup);
    $('#myModal .modal-body').html(markup);

    $(document.getElementById('iframeEdit').contentWindow.document.head).append('https://weebpal.kintone.com/k/api/plugin/content/download.do?contentId=26180&type=DESKTOP_CSS&pluginId=dfeabpkogjeianljahgpcfabiomlfpal');
    $(document.getElementById('iframeEdit').contentWindow.document.body).addClass("customCssIframe");
    if(timeoutPopupAdd){
      clearTimeout(timeoutPopupAdd);
    }
    timeoutPopupAdd =  setTimeout(() => {
      console.log("Oke oke")
      $('#myModal .modal-loader').addClass('disable');
      $('#iframeEdit').css({'display':'block'});
      $('#myModal .modal-dialog').css({'height': 'calc(100% - 3.5rem)'});
      console.log('fdjaslfdasjlfk')
      $('#myModal .modal-dialog').addClass("test");
    }, 1500);
    
  }


  var timeoutPopupEdit;
  function createPopUpEdit(id){
  
    $('.modal-title').html("Edit Card");
    var markup = 
    `
    <iframe id="iframeEdit" src="${"/k/" + kintone.app.getId() + "/show#record="+id+"&l.view=20&l.q&l.next=37&l.prev=0&mode=edit"}">
    </iframe>
    
  `;
  console.log(markup);
    $('.modal-body').html(markup);

    $(document.getElementById('iframeEdit').contentWindow.document.head).append('https://weebpal.kintone.com/k/api/plugin/content/download.do?contentId=26180&type=DESKTOP_CSS&pluginId=dfeabpkogjeianljahgpcfabiomlfpal');
    $(document.getElementById('iframeEdit').contentWindow.document.body).addClass("customCssIframe");
    if(timeoutPopupEdit){
      clearTimeout(timeoutPopupEdit);
    }
    timeoutPopupEdit =  setTimeout(() => {
      console.log("Oke oke")
      $('.modal-loader').addClass('disable');
      $('#iframeEdit').css({'display':'block'});
      $('.modal-dialog').css({'height': 'calc(100% - 3.5rem)'});
      console.log('fdjaslfdasjlfk')
      $('.modal-dialog').addClass("test");
    }, 1500);
    
  }

  function reloadEvent(){
    $('.button-edit').click(function(event){
      parent.current_column = $(event.currentTarget).closest('[data-weight]').attr('data-weight');
      console.log("khi click button edit" + parent.current_column);
      createPopUpEdit($(event.currentTarget).parent().attr('data-id'));
      
      // e.stopPropagation();
    });

    $('.views-row-content').click(function(event){
      console.log(event);
      console.log($(event.currentTarget).parent().attr('data-id'));
      parent.current_column = $(event.currentTarget).closest('[data-weight]').attr('data-weight');
      createPopUp($(event.currentTarget).parent().attr('data-id'));
      // parent.current_column = $(event.currentTarget).parent().attr('data-weight');
      
    })
    $('.add-card-btn').click(function(){
      createPopUpAdd();
      parent.current_column = 0;
    });
    var $sortable = $(".view-content")
    .sortable({
      connectWith: ".view-content",
      receive: function(event, ui){
       
        var receive = listStatus[ui.item.parent().attr("data-weight")].name;
        var sender =  listStatus[ui.sender.attr("data-weight")].name;
        var idSender = ui.item.attr('data-id');
        var validate = getListStatusActions.filter(element=>{
          if(element.from == sender && element.to == receive){
            return element;
          }
        })
        
        if(validate.length == 0){
          $sortable.sortable("cancel");
         
        }else{
           updateStatus(
          receive,
          idSender
          )
          .then((value) => {
            
            console.log(value);
          })
          .catch((err) => {
            alert(err.error);
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
    
    if($('.modal-body iframe')){
      if($('.modal-body iframe').attr('src')){
        if($('.modal-body iframe').attr('src').search('kanban-popup') == -1){
          idKanban().then(value=>{
            window.location.href = "/k/" + kintone.app.getId() + "/?view="+value;
            console.log(ev);
          })
        }
      }
    }else{
      $('.modal-footer button').click();
    };
  });

  kintone.events.on("app.record.detail.process.proceed",function(event){
    parent.kanban_new_status = event.nextStatus.value;
  })

  kintone.events.on("app.record.edit.submit.success", function(event) {

    // $(`data-id=${event.recordId}`).find('.counter-attackment').html('') = $('.itemlist-gaia li').length;

    // console.log(window.parent.location.reload());
    

    if($('.modal-body iframe').attr('src').search('kanban-popup') == -1){
      idKanban().then(value=>{
        window.location.href = "/k/" + kintone.app.getId() + "/?view="+value;
      })
    }else{

    }
});

  kintone.events.on("app.record.index.show", function (events) {
    if ($("#kanban-view").length) {

      var listRecord = [];
     
      var listCountComment = [];
      var numberCountComment = [];
      var buildViewMarkup = function (status) {
        getListStatus().then((value) => {
          console.log(value);
          console.log(config);
          const arrActions = [];
          list_status = value;
          value.forEach((element) => {
            arrActions.push(getListRecordByStatus(element.name));
          });
          Promise.all(arrActions)
            .then((values) => {
              console.log(values);
              values.forEach(re=>{
                re.records.forEach(i=>{
                  var object = new Object();
                  getCommentByIdRecord(i.$id.value).then(value=>{
                    object[i.$id.value]= value;
                    console.log(object);
                    listCountComment.push(object);
                  }).then(function(){
                    listCountComment.forEach(c=>{
                      $(`[data-id=${Object.keys(c)}]`).find('.counter-message').html(Object.values(c));
                    })
                  })
                  
                })
                
              })
              listRecord = values;
            })
            .then(function () {   
              
              var cols = 0;
              if(flag == 0){
                config = {status : new Array(value.length),display:'kanban-board-fluid'};
                cols = value.length;
              }
              else{
                for (var i = 0; i < value.length; i++) {
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
              }
              var first = true;
             
              var fullMarkup = `<div class="row row-status cols-${cols}">`;
              value.forEach((nameStatus, index) => {
                console.log(index);
                console.log(nameStatus);
                console.log(config);
                console.log(config.status[index]);
                if(!config.status[index] || config.status[index].name != nameStatus.name){config.status[index]={disabled:false,color:'BLACK'}};

                if (config.status[index].disabled == false  || flag == 0){
                 
                buildColumn(nameStatus,listRecord[index]);
                    
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
                            ${first ? `<div class="card-container">
                          <a class="add-card-btn" data-toggle="modal" data-target="#myModal">
                            <i class="fas fa-plus"></i>
                            <span class="add-a-card-btn ${!active ? "active":""}">Add a card</span>
                            <span class="add-another-card-btn ${active ? "active":""}" >Add another card</span> 
                          </a>
                        </div>` : ""}
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
                      <button type="button" class="close" data-dismiss="modal">&times;</button>
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
                var $sortable = $(".view-content")
                  .sortable({
                    connectWith: ".view-content",
                    receive: function(event, ui){
                     
                      var receive = listStatus[ui.item.parent().attr("data-weight")].name;
                      var sender =  listStatus[ui.sender.attr("data-weight")].name;
                      var idSender = ui.item.attr('data-id');
                      var validate = getListStatusActions.filter(element=>{
                        if(element.from == sender && element.to == receive){
                          return element;
                        }
                      })
                      
                      if(validate.length == 0){
                        $sortable.sortable("cancel");
                       
                      }else{
                         updateStatus(
                        receive,
                        idSender
                        )
                        .then((value) => {
                          
                          console.log(value);
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
                  console.log(parent.current_column);
                  createPopUpEdit($(e.currentTarget).parent().attr('data-id'));
                  
                  // alert('click me');
                  // e.stopPropagation();
                });
                
                $('.views-row-content').click(function(event){
                  console.log(event);
                  console.log($(event.currentTarget).parent().attr('data-id'));
                  parent.current_column = $(event.currentTarget).closest('[data-weight]').attr('data-weight');
                  createPopUp($(event.currentTarget).parent().attr('data-id'));
                  
                })
                $('.add-card-btn').click(function(){
                  createPopUpAdd();
                  parent.current_column = 0;
                })
                $("#kanban-view").closest("body").find("a.gaia-argoui-app-menu-add").click(function(event){
                  createPopUpAdd();
                  parent.current_column = 0;
                })
                $("#myModal").on('hidden.bs.modal', function(event){
                  
                  console.log(event.currentTarget);
                  console.log(parent.list_status);
                  console.log(list_status);
                  console.log(list_status[current_column]);
                  console.log(parent.current_column);
                  var listRecordByStatus = [];
                  if(parent.kanban_new_status != '' && parent.current_column != parent.list_status.length){
                    listRecordByStatus.push(getListRecordByStatus(parent.list_status[current_column].name));
                    listRecordByStatus.push(getListRecordByStatus(parent.kanban_new_status));
                  }else{
                    listRecordByStatus.push(getListRecordByStatus(parent.list_status[current_column].name));
                  }
                  Promise.all(listRecordByStatus).then(list_sts=>{
                    var flag_column = parseInt(parent.current_column);
                    list_sts.forEach(item_sts=>{
                      console.log(list_sts);
                      console.log(parent.list_status);
                      console.log(list_status);
                      console.log(flag_column)
                      console.log(parent.list_status[flag_column]);
                      var newMarkup = buildColumn(parent.list_status[flag_column],item_sts);
                      $($('.view')[flag_column]).html(newMarkup);
                      flag_column += 1;
                    })
                    parent.kanban_new_status = '';
                    reloadEvent();
                  })
                  getListRecordByStatus(parent.list_status[current_column].name).then(listRe=>{
                    // console.log('6');
                    // var newMarkup = buildColumn(parent.list_status[current_column],listRe);
                    // $($('.view')[current_column]).html(newMarkup);
                    //   console.log('7');
                     
                  })
                 
                  $('.modal-body').html("");
                  $('#iframeEdit').css({'display':'none'});
                  $('.modal-loader').removeClass('disable');  
                });

                
              });
              //end func

              jQuery("#kanban-view").closest("body").find("a.gaia-argoui-app-menu-add").attr('href',null);
              jQuery("#kanban-view").closest("body").find("a.gaia-argoui-app-menu-add").attr('data-toggle',"modal");
              jQuery("#kanban-view").closest("body").find("a.gaia-argoui-app-menu-add").attr('data-target',"#myModal");
            });
          //create build row
        });
      };
      buildViewMarkup();     
    }
  });
})(jQuery, kintone.$PLUGIN_ID);
