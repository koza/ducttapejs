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
                    __.getScript(window.location.origin+file+((__.config.use_min) ? ".min" : "")+".js", function(){
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
        __.getContent(window.location.origin+"/screens/"+screenId+"/"+"ui"+((__.config.use_min) ? ".min" : "")+".html", (html)=>{
            document.getElementById("screen").innerHTML = html;
            __.getScript(window.location.origin+"/screens/"+screenId+"/"+"logic"+((__.config.use_min) ? ".min" : "")+".js");
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
            this.getContent(window.location.origin+"/components/"+componentId.toLowerCase()+"/ui"+((__.config.use_min) ? ".min" : "")+".html", function(html){
                document.getElementById(componentId+"ComponentHolder").innerHTML = html;
                that.components[componentId].html=html;
                that.getScript(window.location.origin+"/components/"+componentId.toLowerCase()+"/logic"+((__.config.use_min) ? ".min" : "")+".js", function(){ cb(); });
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
                            regex=/\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/ig;
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
        if(params.indexOf("specials")>-1){ possible += '!@#$%^&*()-_+=[]{}?'; }
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
        return Math.floor(Math.random()*(max-min+1)+min);
    },

    /*********************************************
        GET COOKIE
    ******************************************** */
    getCookie:function(name){return ((document.cookie) ? document.cookie.split('; ').find(row => row.startsWith(name)).split('=')[1] : null); },

    ui:{
        loading:{
            dim:function(){
                var html='<div style="width:100%; height:100%; position:fixed; top:0; left:0; background: rgba(0,0,0,0.5); z-index:999999;"></div>';
            },
            screen:function(hide){
                if(hide){
                    document.getElementById("screen").removeChild(document.getElementById("spinner"));
                }else{
                    document.getElementById("screen").innerHTML = '<div id="spinner" class="text-align:center;" style="margin-top:40%;"><div class="spinner-border"></div></div>';
                }                
            },
            button:function(id, hide){            
                if(hide){
                    document.getElementById(id).removeChild(document.getElementById(id+"Spinner"));
                }else{
                    document.getElementById(id).innerHTML = '<span id="'+id+'Spinner" class="spinner-border spinner-border-sm spinner-dark mr-2"></span>'+document.getElementById(id).innerHTML;
                }
            },
            section:function(id, hide){            
                if(hide){
                    if(document.getElementById(id+"Spinner")){
                        document.getElementById(id).removeChild(document.getElementById(id+"Spinner"));
                    }    
                }else{
                    document.getElementById(id).innerHTML = document.getElementById(id).innerHTML+'<div id="'+id+'Spinner" style="position:absolute; top:30%; left:0; width:100%; text-align:center;"><span class="spinner-border mr-2"></span></div>';
                }
            }
        }
    }
    
};

window.isMobile = function() {
    let check = false;
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
    return check;};
window.isMobileOrTablet = function() {
    let check = false;
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
    return check;
  };
window.location.queryString = function(name){
    var url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
