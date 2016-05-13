var Printer= (function() {
 
    // Private variables and functions
    var env = "sandbox";
    var TOKEN_KEY_BASE = "com.autodesk.print.token."
    var TOKEN_KEY = TOKEN_KEY_BASE+env;
    var isOnline=false;
    var healthCheckTimer;
    //how often to send health check ping
    var HEALTH_CHECK_INTERVAL=30000;
    var PRINT_JOB_INTERVAL=1000;

 
   /**switch to these url's when Jayant enables passthrough in apigee for both /faye and printer hardware end points**/   
   //var BASE_URL="https://api-alpha.spark.autodesk.com/api/v1";
   //var FAYE_URL="https://api-alpha.spark.autodesk.com/faye";

    var BASE_URL="http://printer-sandbox.spark.autodesk.com/api/v1";
    var FAYE_URL="http://printer-sandbox.spark.autodesk.com/faye";
    
    var BASE_URL_LOCAL="http://localhost:8080/api/v1";
    var FAYE_URL_LOCAL="http://localhost:8080/faye"

    var BASE_URL_ALPHA="http://printer-alpha.spark.autodesk.com/api/v1";
    var FAYE_URL_ALPHA="http://printer-alpha.spark.autodesk.com/faye";

    var BASE_URL_FORGE_ALPHA="http://printer-forge-dev.spark.autodesk.com/v1";
    var FAYE_URL_FORGE_ALPHA="http://printer-forge-dev.spark.autodesk.com/faye";

    var BASE_URL_FORGE_BETA="http://printer-forge-stage.spark.autodesk.com/v1";
    var FAYE_URL_FORGE_BETA="http://printer-forge-stage.spark.autodesk.com/faye";

    var STATUS_READY="ready";
    var STATUS_PRINTING="printing";
    var STATUS_PAUSED="paused";
    var STATUS_RECEIVED="received";
    var STATUS_CANCELED="canceled";
    var STATUS_COMPLETED="completed";
    //faye client
    var client;
   
    
    var registrationSub=null;
    var commandSub=null;

    //track the total and current layers and current print command
    var totalLayers;
    var currentLayer
    var currentPrintCommand=null;
    var currentPrinterStatus=STATUS_READY;
    var currentJobStatus="";
    var printCommandTimer=null;
    /**
    * Initialize simulator
    */
    var init= function(){
        
        log("initializing printer...");
        //set up url if local mode
        var local=getQueryVariable('mode');
        if(local!=false&&local.toUpperCase()==='LOCAL'){
            log("Setting url's to local mode");
            BASE_URL=BASE_URL_LOCAL;
            FAYE_URL=FAYE_URL_LOCAL;
            env="local";
            TOKEN_KEY = TOKEN_KEY_BASE+env;
        }
        else if(local!=false&&local.toUpperCase()==='ALPHA'){
            log("Setting url's to alpha mode");
            BASE_URL=BASE_URL_ALPHA;
            FAYE_URL=FAYE_URL_ALPHA;
            env="alpha";
            TOKEN_KEY = TOKEN_KEY_BASE+env;
        }
        else if(local!=false&&local.toUpperCase()==='FORGE_ALPHA'){
            log("Setting url's to forge ALPHA mode");
            BASE_URL=BASE_URL_FORGE_ALPHA;
            FAYE_URL=FAYE_URL_FORGE_ALPHA;
            env="alpha";
            TOKEN_KEY = TOKEN_KEY_BASE+env;
        }
        else if(local!=false&&local.toUpperCase()==='FORGE_BETA'){
            log("Setting url's to forge BETA mode");
            BASE_URL=BASE_URL_FORGE_BETA;
            FAYE_URL=FAYE_URL_FORGE_BETA;
            env="beta";
            TOKEN_KEY = TOKEN_KEY_BASE+env;
        }

        //first set up faye client 
        client = new Faye.Client(FAYE_URL,{timeout: 120,retry:3});
        client.disable('websocket');

        Logger = {
            incoming: function(message, callback) {
            console.log('incoming', message);
            callback(message);
        },
        outgoing: function(message, callback) {
            console.log('outgoing', message);
            callback(message);
        }
        };
        client.addExtension(Logger);

        log("checking token in local storage...");
        var token=getToken();
        if(token==null){
            log("No token found in local storage getting a new one...");
            if(!resetToken()){
                log("failed to initialize...could not get token");
                return;
            }
        }
        else{
            log("retrieved token from local storage:");
            log("token:"+JSON.stringify(token));
            log ("printer id:"+token.printer_id);
            
            if(token.registered==false){
                offline();
                lcdWrite(token.registration_code)
                subscribeRegistrationChannel(token.printer_id);
            }
            else{
                lcdWrite('REGISTERED: '+token.printer_id);
                subscribeCommandChannel();
                online();
            }
        }   
    }

    /**
    *parse query params to check if running in local mode
    */

    var getQueryVariable=function(variable)
    {
       var query = window.location.search.substring(1);
       var vars = query.split("&");
       for (var i=0;i<vars.length;i++) {
               var pair = vars[i].split("=");
               if(pair[0] == variable){return pair[1];}
       }
       return(false);
    }


 
    //get token from local storage
    var getToken = function() {
        var token_str=localStorage.getItem(TOKEN_KEY);
        if(token_str=='undefined')return null;
        var token=jQuery.parseJSON( token_str );
        return token;
        
    };
 
     //put the json token into storage
     var putToken = function(data) {
        localStorage.setItem(TOKEN_KEY,data);
    };

    //get a new token from remote server
    var getNewToken = function(){
        var reg_code = null;

        //Printer firmware and printer type
        var acg = {firmware : "1.1.1.1",
                   type_id : "7FAF097F-DB2E-45DC-9395-A30210E789AA"};

        var api_url = BASE_URL + "/print/printers/registration_code";
        log("Sending POST request to: "+api_url);
        jQuery.ajax({
             type: 'POST',
             url: api_url,
             data:acg,
             success: function(data){
                var json_str=JSON.stringify(data);
                log("Server response:"+json_str);
                reg_code=data;
             },
             error: function(error){
                var json_str=JSON.stringify(error);
                log("Server Error:"+json_str);
             },
             async:   false
        }); 
        return reg_code;
    }

    //get registration state from local printer i.e if the printer has been registered
    var getRegistrationState = function() {
        var token=getToken();
        if(token!=null)return token.registered;
        
    };
 
     //put the REGISTRATION STATE into storage
     var putRegistrationState = function(isRegistered) {
        var token=getToken();
        if(token==null) {
            log("putRegistrationState: No token found in storage!");
        }
        else{
            token.registered=isRegistered;
            var token_str=JSON.stringify(token);
            log("new registration state is:"+token_str);
            putToken(token_str);
        }
    };

  

    //clear the token and registration state in the printer
    var resetToken = function(){
        log("resetting token...");
        var token=getNewToken();
        if(token==null){
            log("failed to get token from server");
            return false;
        }
        var token_str=JSON.stringify(token);
        log("new token is:"+token_str);
        putToken(token_str);
        lcdWrite(token.registration_code);
        var printer_id=token.printer_id;
        subscribeRegistrationChannel(printer_id);
        unsubscribeCommandChannel();
        offline();
        
        return true;

    }

    /**
    *subscribe to the registration channel - this channel is opened after the printer gets a new token 
    *and before it has been registered - it is listening for registration success messages
    */

    var subscribeRegistrationChannel=function(printer_id){
        if(registrationSub!=null){
            log("canceling existing subscription");
            registrationSub.cancel();
        }
        log("Subscribing to server@"+"/printers/" + printer_id + "/users");

        registrationSub = client.subscribe("/printers/" + printer_id + "/users", function(message) {
            log("Received message from server:"+JSON.stringify(message));
            putRegistrationState(true);
            var token=getToken();
            lcdWrite('REGISTERED: '+token.printer_id);
            subscribeCommandChannel();
            online();


        });
        registrationSub.then(function() {
            log('Actively listening to registration success channel');

        });

    }

    /**
    * subscribe to command channel : this channel is opened once the printer has been registered
    */
    var subscribeCommandChannel=function(){
       unsubscribeCommandChannel();
       var token=getToken();
       if(token==null||token.registered==false){
        log("cannot subscribe to command channel, printer not registered");
       }
       var printer_id=token.printer_id;
       log("Subscribing to server@"+"/printers/" + printer_id + "/command");

        commandSub = client.subscribe("/printers/" + printer_id + "/command", function(message) {
            log("Received message from server:"+JSON.stringify(message));
            processCommand(message)
        });
        commandSub.then(function() {
            log('Actively listening to command channel');

        });

    }

    var unsubscribeCommandChannel=function(){
         if(commandSub!=null){
            log("canceling  command channel subscription");
            commandSub.cancel();
        }
    }

    var startLocalPrintJob=function(){
        if(currentPrintCommand!=null){
            log("Cannot Start Local Job:Another print job currently running");
            return;
        }
        else{
            var message={"command":"print_data","file_url":"http://cdn.spark.com/print/abcefg","task_id":""}
            message.task_id="local_"+'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                                    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                                    return v.toString(16);
                                });
            log("Starting local job with this data:"+JSON.stringify(message));
            processCommand(message);
            healthCheck();

            }
    }


    var processCommand=function(message){
        
        var acg={};
        if(message.command=="print_data"){
            log("Print command received");
            if(printCommandTimer!=null){
                log("clearing previous print job...");
                clearTimeout(printCommandTimer);
            }
            totalLayers=50;
            currentLayer=1;
            currentPrintCommand=message;
            currentJobStatus=STATUS_RECEIVED;
            setPrintJobStatus(currentPrinterStatus,currentJobStatus,message.task_id,acg);
            processPrintCommand(message);
            return;
        }
        else if(message.command=="pause"){
            acg.progress=1.0;
            
            if(pause()==true){
                
                acg.data =JSON.stringify({"job_id":currentPrintCommand.task_id,"job_status":STATUS_PAUSED});
            }
            else{
                acg.error_code=400;
                acg.error_message="no running print job";
            }

        }
        else if(message.command=="resume"){
            acg.progress=1.0;
           
            if(resume()==true){
                
                acg.data =JSON.stringify({"job_id":currentPrintCommand.task_id,"job_status":STATUS_PAUSED});
            }
            else{
                acg.error_code=400;
                acg.error_message="no running print job";
            }
            
        }
        else if(message.command=="cancel"){
            acg.progress=1.0;
           
            if(cancel()==true){
                acg.data =JSON.stringify({"job_id":currentPrintCommand.task_id,"job_status":STATUS_CANCELED});
                clearPrintJob();
            }
            else{
                acg.error_code=400;
                acg.error_message="no running print job";
            }
            
        }
         else if(message.command=="calibrate"){
            acg.progress=0.0;
            acg.error_code=400;
            
            acg.error_message="Incorrect Calibration Settings";
            
        }
         else if(message.command=="firmware_upgrade"){
            acg.progress=0.0;
            acg.error_code=404;
            
            acg.error_message="firmware_upgrade not supported";
        }
         else if(message.command=="log"){
            acg.progress=1.0;
            var rand_name=(Math.random() + 1).toString(36).substring(7);
            acg.data=JSON.stringify({"url":"http://logs.com/logs/"+rand_name});
            
        }
        setPrintJobStatus(currentPrinterStatus, currentJobStatus,message.task_id,acg);


    }


    /**
    * print commands sends udpates to a different end point
    */
    var processPrintCommand=function(){
        
         // If the job has been cancel, cancel this print command,
        // reset everything and send the status update.
        if (currentJobStatus === STATUS_CANCELED) {
            clearPrintJob();
            healthCheck();
            return;
        }
        
        var message=currentPrintCommand;
        lcdWrite("LAYER:"+currentLayer +" OF: "+totalLayers);

        if(currentLayer<totalLayers){
            currentPrinterStatus=STATUS_PRINTING;
            currentJobStatus=STATUS_PRINTING;
            setPrintJobStatus(currentPrinterStatus,currentJobStatus,currentPrintCommand.task_id,null);
        }
        else{
            currentPrinterStatus=STATUS_READY;
            currentJobStatus=STATUS_COMPLETED;
            setPrintJobStatus(currentPrinterStatus,currentJobStatus, currentPrintCommand.task_id,null);
        }
        
        if(currentLayer<totalLayers){
            printCommandTimer=setTimeout(processPrintCommand,PRINT_JOB_INTERVAL);
            currentLayer=currentLayer+1;
        }
        else{ //reset everything and send the status update.
            clearPrintJob();
            healthCheck();  //send a status update 
        }
    }



    /*
    *set the status of a print job
    */
    var setPrintJobStatus=function(status,jobStatus,commandToken, acg){
        if(commandToken.indexOf("local_")>-1){
            //log("Local print job no command acknowledge required...");
            return;
        }
        if(acg==null){
            acg={};
        }
        acg.printer_status=status;
        acg.progress=1.0;
        if(currentPrintCommand!=null){
            acg.job_id=currentPrintCommand.task_id;
            acg.job_progress=currentLayer/totalLayers;
            acg.progress=acg.job_progress;
            acg.job_status=jobStatus;
            setPrintData(acg,jobStatus);
        }

        
        //now send the status to server
        var token=getToken();
        var auth_token=token.auth_token;
        log("sending job status auth code:"+auth_token);
        var api_url=BASE_URL+'/print/printers/command/'+commandToken;
        log("Sending POST request to: "+api_url);
        log("POST data:"+JSON.stringify(acg));

        jQuery.ajax({
         type: 'POST',
         url: api_url,
         headers: { 'X-Printer-Auth-Token': auth_token },
         data:acg,
         success: function(data,testStatus, xhr){
            var json_str=JSON.stringify(data);
            log("Server response status "+xhr.status);
         },
         error: function(error){ 
            var json_str=JSON.stringify(error);
            log("Server Error in Command Acknowledge:"+json_str);
        },
          async:   true
        }); 
    }

    var setPrintData=function(acg,status){
        acg.data={};
        acg.data.job_status=status;
        acg.data.total_layers=totalLayers;
        acg.data.layer=currentLayer;
        acg.data.seconds_left=(totalLayers-currentLayer)*20;
        acg.data.temprature=71;
        acg.data.job_id=currentPrintCommand.task_id;
        return acg;
    }

    /**
    *clear the current print job
    */
    var clearPrintJob=function(){
        currentPrintCommand=null;
        if(printCommandTimer!=null){
            clearTimeout(printCommandTimer);
        }
        printCommandTimer=null;
        currentLayer=1;
        currentPrinterStatus=STATUS_READY;
        currentJobStatus="";
    }

    var resume =function(){
        if(currentPrintCommand==null||printCommandTimer==null){
            log("No running job to resume...")
            return false;
        }
        else{
            log("resuming job "+currentPrintCommand.task_id);
            lcdWrite("Resume");
            currentPrinterStatus=STATUS_PRINTING;
            currentJobStatus=STATUS_PRINTING;
            printCommandTimer=setTimeout(processPrintCommand,PRINT_JOB_INTERVAL);
            healthCheck();//send a status udpate 
            return true;
            
        }

    }

    var cancel =function(){
        if(currentPrintCommand==null||printCommandTimer==null){
            log("No running job to cancel...");
            return false;
        }
        else{

            log("Canceling job "+currentPrintCommand.task_id);
            lcdWrite("Cancel");
            currentPrinterStatus=STATUS_READY;
            currentJobStatus=STATUS_CANCELED;
            healthCheck();//send a status udpate 
            return true;
        }

    }

     var pause =function(){
        if(currentPrintCommand==null||printCommandTimer==null){
            log("No running job to pause...");
            return false;
        }
        else{
            log("pausing job "+currentPrintCommand.task_id);
            lcdWrite("Pause");
            clearTimeout(printCommandTimer);
            currentPrinterStatus=STATUS_PAUSED;
            currentJobStatus=STATUS_PAUSED;
            healthCheck();//send a status udpate 
            return true;
        }

    }

    //show the existing token in the console
    var showToken =function(){
        var token=getToken();
        var token_str=JSON.stringify(token);
        log("Token is:"+token_str);
        lcdWrite(token.registration_code);
    }

    var offline=function(){
        isOnline=false;
        log("set printer state to OFFLINE");
         clearTimeout(healthCheckTimer);
    }

    var online=function(){
        isOnline=true;
        log("set printer state to ONLINE");
        healthCheck();
    }

    var healthCheck=function(){
        if(isOnline){
            
            var token=getToken();

            if(token==null||token.registered==false){
                log("Printer not registered, no health check required");

            }
            else{
                var auth_token=token.auth_token;
                 var acg={};
                acg.printer_status=currentPrinterStatus;
                if(currentPrintCommand!=null){
                    acg.job_id=currentPrintCommand.task_id;
                    acg.job_progress=currentLayer/totalLayers;
                    acg.job_status=currentJobStatus;
                    setPrintData(acg,currentJobStatus);
                }
                log("sending health check ping with auth code:"+auth_token);
                log("POST data:"+JSON.stringify(acg));
                var api_url=BASE_URL+'/print/printers/status';
                log("Sending POST request to: "+api_url);
                jQuery.ajax({
                 type: 'POST',
                 url: api_url,
                 data:acg,
                 headers: { 'X-Printer-Auth-Token': auth_token},
                 success: function(data,testStatus, xhr){
                    var json_str=JSON.stringify(data);
                    log("Server response status "+xhr.status);


                 },
                 error: function(error){ 

                    var json_str=JSON.stringify(error);
                    log("Server Error:"+json_str);
                    

                },
                  async:   true
                }); 

            }

            if(healthCheckTimer!=null){
                clearTimeout(healthCheckTimer);
            }
            
            healthCheckTimer=setTimeout(healthCheck,HEALTH_CHECK_INTERVAL);
            
        }

    }


    

    //log data
    
    var log=function(data){
        console.log('\\n');
        console.log(data);
        var txt = $(".log");
        txt.val( txt.val() + "\n"+data);
        txt.scrollTop(txt[0].scrollHeight);
    }

    //utility function to write to lcd
    var lcdWrite=function(data){
        $(".lcd").html(data);
    }
 
    // Public API
    return {
        init: init,
        showToken:showToken,
        resetToken:resetToken,
        online:online,
        offline:offline,
        pause:pause,
        resume:resume,
        cancel:cancel,
        startLocalPrintJob:startLocalPrintJob

        
    };
})();

$( document ).ready( function() {
    Printer.init();
    $(".get-token").click(Printer.showToken);
    $(".new-token").click(Printer.resetToken);
    $(".printer-online").click(Printer.online);
    $(".printer-offline").click(Printer.offline);

    $(".resume-print").click(Printer.resume);
    $(".cancel-print").click(Printer.cancel);
    $(".pause-print").click(Printer.pause);
    $(".local-print").click(Printer.startLocalPrintJob);
    $('[data-toggle="tooltip"]').tooltip();


});
