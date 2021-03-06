var __={
    config:{},
    routes:[],
    loaded:[],
    models:{},
    components:{},
    loading:0,
    params:{},
    js:null,
    currentScript:document.currentScript,
    /*********************************************
        GET SCRIPT
        
        This is used to load external JS files
        onto the page.
    ******************************************** */
    getScript:function(url, cb){
        var newScript = document.createElement("script");    
        if(cb){ 
            newScript.onerror = function(){ cb(true, null)};
            newScript.onload = function(){ cb(null, true)}; 
        }
        this.currentScript.parentNode.insertBefore(newScript, this.currentScript);
        newScript.src = url;
    },
    
    /*********************************************
        GET CONTENT

        Get content from an html page or text src
    ******************************************** */
    getContent:function(url, cb){
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState == XMLHttpRequest.DONE) {   // XMLHttpRequest.DONE == 4          
                cb(xhr.responseText, xhr.status);
            }
        };        
        xhr.open("GET", url, true);
        xhr.send();
    },
    
    /*********************************************
        LOAD

        Loads up local js file that are used by
        your app like models or shared scripts.
    ******************************************** */
    load:function(files, cb){
        if(files){
            __.loading+=files.length;

            files.forEach(function(file){
                if(__.loaded.indexOf(file)===-1){
                    __.getScript(window.location.origin+file+((__.config.use_min) ? __.config.use_min : "")+".js", function(){
                        __.loaded.push(file);
                        __.loading--;
                        if(__.loading<=0){
                            cb();
                        }  
                    });
                }else{
                    __.loading--;
                    if(__.loading<=0){
                        cb();
                    }
                }
            })
        }        
    },

    /*********************************************
        CALL API
    ******************************************** */
    callAPI:function(url, p){
        var request = new XMLHttpRequest();
        request.open(((p.method) ? p.method : "GET"), ((url.indexOf("http")===-1) ? this.config.base_api_url : "")+url, true);
        request.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
        if(p.headers){
            Object.keys(p.headers).forEach(function(key){
                request.setRequestHeader(key, p.headers[key]);
            });
        }     
        request.onload = function() {
            if (this.status >= 200 && this.status < 400) {              
                try{
                    p.response(null,JSON.parse(this.response),this.status);
                }catch(e){
                    p.response(null,this.response,this.status);
                }
                
            } else {              
                p.response({"error":this.statusText, "details":this.response}, null, this.status);  
            }
          };
        request.onerror = function(e) {        
            p.response({"error":this.statusText, "details":this.response}, null, this.status);
        };
        request.ontimeout = function(e) {        
            p.response("timeout", null, this.status);
        };
        request.onabort = function(e) {        
            p.response("abort", null, this.status);
        };
        request.send(((p.data) ? JSON.stringify(p.data) : null));
    },

    /*********************************************
        ROUTER

        Allows you to define your apps pages
        and their handlers
    ******************************************** */
    router:function(registerEventListener){        
        if(registerEventListener){ window.addEventListener('popstate', __.router); }
        var allRoutes=__.routes.slice();
        
        function processRoute(){

            if(allRoutes.length>0){
                var route = allRoutes.shift();                
                var pathParams=route[0].split(":");
                if(RegExp(pathParams[0].replace(/\//g,'\\/')).test(window.location.pathname)){

                    var paramsToSendAlong={};

                    if(pathParams[1]){
                        var paramNames = pathParams[1].split("/"),
                            qsValues=window.location.pathname.replace(RegExp(pathParams[0].replace(/\//g,'\\/')),"").split("/");
                            
                        paramNames.forEach(function(key, i){
                            paramsToSendAlong[key]=qsValues[i];
                        });
                        
                    }

                    route[1](paramsToSendAlong, function(){ processRoute(); });                
                }else{
                    processRoute();
                }
            }
            

        }
        processRoute();
    
    },

    /*********************************************
        ROUTE TO
    ******************************************** */
    routeTo:function(url, includeQS){
        window.history.pushState('', '', url+((includeQS) ? window.location.search : ""));
        this.router();
    },

    /*********************************************
        RENDER SCREEN
    ******************************************** */
    renderScreen:function(screenId, p={}){
        __.params = p;
        __.getContent(window.location.origin+"/screens/"+screenId+"/"+"ui"+((__.config.use_min) ? __.config.use_min : "")+".html", (html)=>{
            document.getElementById("screen").innerHTML = html;
            __.getScript(window.location.origin+"/screens/"+screenId+"/"+"logic"+((__.config.use_min) ? __.config.use_min : "")+".js");
        });
    },

    /*********************************************
        PROCESS TEMPLATE
    ******************************************** */
    processTemplate:function(templateId, data){
        var html= document.getElementById(templateId).innerHTML;
        Object.keys(data).forEach(function(k){
            var regex=new RegExp("{"+k+"}","g");
            html=html.replace(regex, data[k]);
        });
        return html;
    },

    /*********************************************
        LOAD COMPONENT
    ******************************************** */
    loadComponent:function(componentId, params, cb){
        var that=this;        
        if(typeof __.components[componentId]==="undefined"){
            this.components[componentId]={"html":null, "js":null, "data":params};
            this.getContent(window.location.origin+"/components/"+componentId.toLowerCase()+"/ui"+((__.config.use_min) ? __.config.use_min : "")+".html", function(html){
                document.getElementById(componentId+"ComponentHolder").innerHTML = html;
                that.components[componentId].html=html;
                that.getScript(window.location.origin+"/components/"+componentId.toLowerCase()+"/logic"+((__.config.use_min) ? __.config.use_min : "")+".js", function(){ cb(); });
            });
        }else{            
            this.components[componentId].data=params;
            document.getElementById(componentId+"ComponentHolder").innerHTML = this.components[componentId].html;
            cb();
        }
        
    },

    /*********************************************
        FORM VALIDATOR
    ******************************************** */
    validateFormData:function(id){
        els=document.querySelectorAll("#"+id+" input, #"+id+" select, #"+id+" textarea, #"+id+" range");        

        var isInvalid=false;

        els.forEach(function(el){
            el.classList.remove("is-invalid");
            if(el.getAttribute("required")!==null || el.getAttribute("required")==="required"){            
                if(el.value.trim().length===0){
                    el.classList.add("is-invalid");
                    isInvalid=true;
                }else{
                    let regex=/./ig;
                    let str=el.value.trim();
    
                    switch(el.type){
                        case "email":
                            regex=/\b[\w\.-]+&#64;[\w\.-]+\.\w{2,4}\b/ig;
                        break;
                        case "tel":
                            str=str.replace(/[^0-9]/g,"");
                            regex=/[0-9]{10}/;
                        break;
                        case "number":
                            if( (el.getAttribute("min")!==null && Number(str)<Number(el.getAttribute("min"))) || (el.getAttribute("max")!==null && Number(str)>Number(el.getAttribute("max"))  )){
                                el.classList.add("is-invalid");
                                isInvalid=true;
                            }
                        break;
                    }
    
                    if(regex){
                        if(!regex.test(str)){
                            el.classList.add("is-invalid");
                            isInvalid=true;
                        }
                    }                        
                }                
            }            
        });

        return !isInvalid;
    },

    /*********************************************
        GET FORM DATA
    ******************************************** */
    getFormData:function(id){
        var dtr={}; 
        document.querySelectorAll("#"+id+" input, #"+id+" select, #"+id+" textarea, #"+id+" range").forEach(function(el){

            if((el.getAttribute("type")!=="checkbox" && el.getAttribute("type")!=="radio") || (el.getAttribute("type")==="checkbox" && el.checked) || (el.getAttribute("type")==="radio" && el.checked) ){
                if(typeof dtr[el.name]==="undefined"){
                    
                    if(el.getAttribute("storeas")==="array"){
                        dtr[el.name]=[el.value];
                    }else if(el.type==="datetime-local"){
                        if(el.value){
                            dtr[el.name]=new Date(el.value).toString();
                        }                        
                    }else if(el.type==="number"){
                        if(el.value){
                            dtr[el.name]=Number(el.value);
                        }                        
                    }else{
                        dtr[el.name]=el.value;
                    }       

                }else if(typeof dtr[el.name]==="object"){
                    dtr[el.name].push(el.value);
                
                }else{
                    dtr[el.name]=[dtr[el.name], el.value];
                }
            }
            
            
        }); 
        return dtr;
    },

    /*********************************************
        SET FORM DATA
    ******************************************** */
    setFormData:function(formId, data){
        Object.keys(data).forEach(function(key){
            
            document.querySelectorAll('#'+formId+' [name="'+key+'"]').forEach(function(el){
                switch(el.type){
                    case "checkbox":
                    case "radio":
                        if(data[key]===el.value){
                            el.checked="checked";
                        }
                    break;
                    default:
                        el.value=data[key];
                    break;
                }
            });            
            
        });

    },

    /*********************************************
        RANDOM STRING
    ******************************************** */
    rndString:function(len, params){
        if(!len){len=5;}
        var text = "", possible="";
        if(!params){
            params=["letters","uppercase","numbers","specials"];
        }

        if(params.indexOf("letters")>-1){ possible += "abcdefghijklmnopqrstuvwxyz"; }
        if(params.indexOf("uppercase")>-1){ possible += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; }
        if(params.indexOf("numbers")>-1){ possible += "0123456789"; }
        if(params.indexOf("specials")>-1){ possible += '!&#64;#$%^&*()-_+=[]{}?'; }
        if(params.indexOf("exclude_confusing")>-1){ possible.replace(/[o0il1]/ig,""); }        

        for( var i=0; i < len; i++ ){
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }            
        return text;
    },

    /*********************************************
        RANDOM NUMBER
    ******************************************** */
    rndNumber:function(min,max){
        return Math.floor(Math.ra...
