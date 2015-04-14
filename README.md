# Printer Simulator
##Introduction
Printer simulator allows applications to test print management capabilities of spark without requiring a physical printer. It also acts as a reference implementation for printer firmware implementors.

##Getting Started
Printer simulator is simply an html/javascript page, it requires no client side setup except the html and associated js, css files.  
1. Download this entire repo  
2. The simulator runs as a straight html file –no server setup is required – simply click open the html file in chrome (I have only tested chrome but users have reported that Firefox also works).  
3. The Simulator consists of 3 sections: 

a.	LCD Screen mimics a printer display  
b.	Log shows various debug messages such as messages being sent to the spark cloud services and stored state of the printer (token, registration state etc.)  
c.	Buttons : Allow you to perform actions in 3 areas - Registration, Health Check (printer online/offline), Print Job control (resume, pause, cancel)



##Authorization
All the api calls originating from the application require an Authorization header token. This token can be recieved by going through the login process on spark using the application key provided.  

Here is an example login end point for Alpha (please replace the application key with the key provided to your specific app!):
https://api-alpha.spark.autodesk.com/api/v1/oauth/authorize?response_type=code&client_id=<your application key>  

Once the login process is complete, you should see a json as follows.  

You will use the "access_token" key in the returned json and pass it in the api request headers. We would strongly recommend using a rest client such as postman so you can update the token in a single location without having to update each end point. 
 
```

{
    "member_id": "",
    "access_token": "jDG4YLSTAUlI33k79KYJ2f4Q5nAZ",
    "refresh_token": "kX4V6V1AANvYWn6uYEAfeiUEigRmstfE",
    "content": {
        "application_name": "4e2891b7-95e8-459c-bb75-61dc7754bd11",
        "scope": "DELETE READ WRITE",
        "spark_secure_session": "57FD9ECB9418BD5E5423EC48D2B1DB00A13DA72040A494AF92BF9392BDE88034",
        "refresh_token_issued_at": "1427994689319",
        "refresh_token_status": "approved",
        "expires_in": "7199",
        "spark_session_id": "234ECD2F-4845-4ABC-88A8-1397E865B2B9",
        "client_id": "G0ysmvG5HwQrGOBqvijhc0G9Nl6l7L5K",
        "access_token": "jDG4YLSTAUlI33k79KYJ2f4Q5nAZ",
        "refresh_count": "0",
        "issued_at": "1427994689319",
        "grant_type": "authorization_code",
        "status": "approved",
        "api_product_list": "[sandbox_spark_readwrite]",
        "spark_member_id": "20707258",
        "developer.email": "spark.developer@autodesk.com",
        "spark_first_login": "NA",
        "organization_id": "0",
        "token_type": "BearerToken",
        "refresh_token": "kX4V6V1AANvYWn6uYEAfeiUEigRmstfE",
        "spark_opt_in": "NA",
        "refresh_token_expires_in": "0",
        "organization_name": "spark"
    }
}

```
 
**Please note** that applications and printers need to go against different end points.  
Applications: https://api-alpha.spark.autodesk.com
Printers: http://alpha.spark.autodesk.com

##Registration

*	Click “New Token” to fetch a new token from server -it should look like below once you call New Token. The simulator users local storage so once token is fetched - it will be retrieved from local storage even on page refresh. 


*	In postman call Register Token api as below.  

```
POST /api/v1/print/printers/register HTTP/1.1
Host: api-alpha.spark.autodesk.com
Authorization: Bearer jDG4YLSTAUlI33k79KYJ2f4Q5nAZ
Cache-Control: no-cache
Content-Type: application/x-www-form-urlencoded
 
printer_name=my+makerbot®istration_code=YKNRKT
 
Response:
{
    "registered": true,
    "printer_id": 1643
}
```

*	This print simulator is actively listening for registration events. So calling registration api should update the Print Simulator and you should see the below UI:


*	 Please note that simulator stores its registration state also in its local storage so if you want to completely reset printer state - press "New Token". But please Beware - this will issue you a new printer id and all subsequent calls should go against the new printer id. 
*	Get Token simply returns the locally stored token. This is useful in case you have refreshed the page and need to check the current token issued by the server - of course this token is also displayed in the logs on page startup. 

##Health Check


*	Once the printer is registered, it will start sending health check messages to the server - the simulator is configured to send a message every 60 seconds. You should see the following message in Print  



```
Simulator logs:
sending health check ping with auth code:WfsVvaD84sN3wQoygfNK-JqmB4pvJko5Mrl2xgUFBzM
POST data:{"printer_status":"ready"}
Sending POST request to: http://alpha.spark.autodesk.com/api/v1/print/printers/status
Server response status 200
```

* If the printer is sending health checks regularly - it will appear as online. The application can check the printer online/offline status by calling this api:

```
GET /api/v1/print/printers/status/1643 HTTP/1.1
Host: api-alpha.spark.autodesk.com
Content-Type: application/json
Authorization: Bearer jDG4YLSTAUlI33k79KYJ2f4Q5nAZ
Cache-Control: no-cache
Content-Type: application/x-www-form-urlencoded
 
Response:
            {
                "last_check_in": 21000,
                "printer_availability": "offline",
                "last_reported_state":
                { 
                    "printer_status":"paused",
                    "error_code":0,
                    "error_message":"",
                    "job_id":"121333sdsd",
                    "job_status":"paused",
                    "job_progress":0.5,
                    "data":
                    {
                          "job_name":"Part1.stl",
                          "job_id":"121333sdsd",
                          "layer":6,                   
                          "total_layers":12,
                          "seconds_left":37,
                          "temperature":28.6875
                    }
                }
            }
            
```

* You can stop the printer from sending health checks by clicking the "Offline" button. Once the last_check_in value exceeds 60 seconds, the status for GET healthcheck will automatically flip to "offline"

```

{
    "status": "Offline",
    "last_check_in": 61000
}
```
* And of course you can resume health checks by clicking the "Online" button. 
Sending Print Jobs
* Once the printer is registered, it also starts listening on the command channel for incoming commands. 
* To send a print job to a printer - call the below api. This will return you a job id, please note this down as you will then use it to check print status. 

```

POST /api/v1/print/printers/1652/jobs HTTP/1.1
Host: api-alpha.spark.autodesk.com
Authorization: Bearer jDG4YLSTAUlI33k79KYJ2f4Q5nAZ
Content-Type: application/json
Cache-Control: no-cache
 
{ "printable_url": "http://cdn.spark.com/print/abcefg", "settings": { "FirstApproachRPM": 6, "FirstZLiftMicrons": 2000, "FirstSeparationMicronsPerSec": 5000, "FirstApproachMicronsPerSec": 5000, "FirstRotationMilliDegrees": 60000 } }
 
Response:
{
    "printer_id": "327",
    "job_id": "a66de680-b35f-4cb7-baf6-c845062edbdb",
    "status": "sent"
}

```
 
* Meanwhile on the print simulator side - the simulated print job is now kicked off and you should see the following messages:

* From the application side you can now get the status of the job with following api. This will return the current status of the job.

```
GET /api/v1/print/jobs/6e0880a9-ce65-44c2-bfa6-e6ba44d947d1 HTTP/1.1
Host: api-alpha.spark.autodesk.com
Authorization: Bearer S787KIuuBJAH43QU2FgaROqUCC8S
Cache-Control: no-cache
 
Response:
{
    "job_id": "6e0880a9-ce65-44c2-bfa6-e6ba44d947d1",
    "job_status": {
        "printer_status": "paused",
        "job_id": "6e0880a9-ce65-44c2-bfa6-e6ba44d947d1",
        "job_progress": "0.62",
        "job_status": "paused",
        "data": {
            "job_status": "paused",
            "total_layers": "50",
            "layer": "31",
            "seconds_left": "380",
            "temprature": "71",
            "job_id": "6e0880a9-ce65-44c2-bfa6-e6ba44d947d1"
        }
    },
    "job_date_time": "April 02, 2015 07:33:37",
    "job_status_time": "April 02, 2015 07:34:30",
    "local_job": false
}
```
##Print Commands
14. The print simulator can be sent additional commands. Commands with job scope e.g pause/resume/cancel require job_id as a parameter. See apiary docs for details on how to call commands:

```
POST /api/v1/print/printers/1652/command HTTP/1.1
Host: api-alpha.spark.autodesk.com
Authorization: Bearer S787KIuuBJAH43QU2FgaROqUCC8S
Cache-Control: no-cache
Content-Type: application/x-www-form-urlencoded
 
command=resume&job_id=6e0880a9-ce65-44c2-bfa6-e6ba44d947d1
 
 
Response:
{
    "task_id": "4b435ff3-d3c7-44b4-b593-ffd8db718a9f"
}
```
* Commands are asynchronous so the result of a command can be checked as follows:

```
GET /api/v1/print/printers/command/abba0331-b23a-4da1-8f9c-07e983adad69 HTTP/1.1
Host: api-alpha.spark.autodesk.com
Authorization: Bearer S787KIuuBJAH43QU2FgaROqUCC8S
Cache-Control: no-cache
Content-Type: application/x-www-form-urlencoded
 
Response:
{
    "progress": "0.72",
    "data": {
        "job_status": "printing",
        "total_layers": "50",
        "layer": "36",
        "seconds_left": "280",
        "temprature": "71",
        "job_id": "6e0880a9-ce65-44c2-bfa6-e6ba44d947d1"
    },
    "printer_status": "printing",
    "job_id": "6e0880a9-ce65-44c2-bfa6-e6ba44d947d1",
    "job_progress": "0.72",
    "job_status": "printing",
    "status_update_time": "April 02, 2015 07:37:59",
    "command": "resume"
}
```

* You should also see the command issued on the print simulator LCD display:

 
##Pause/Resume/Cancel Commands
* While other commands (calibrate, firmware_upgrade, logs) etc. return dummy data – "pause", "cancel" and "resume" commands have an actual impact on the running print job.  if you call the print command api with "pause" for example and then check the running job status - you will see the following:

```

{
  "printer_status": "printing",
  "progress": 0.5,
  "error_code": 404,
  "error_message": "unknown command",
  "job_id": "121333sdsd",
  "job_status": "paused",
  "job_progress": 0.5,
  "data": {
    "state": "printing",
    "change": " ",
    "ui_sub_state": "",
    "is_error": false,
    "error_code": 123,
    "error": 123,
    "error_message": "lorem ipsum",
    "layer": 14,
    "total_layers": 23,
    "seconds_left": 3643,
    "temperature": 71,
    "job_id": 123
  }
}
```

* In addition you will notice that the layers have stopped processing on the printer simulator.
* Please note that you can also trigger pause, resume, cancel from the print simulator UI. They have the same impact on updating the print job status and the running job in the simulator. 

##Local Jobs
*	The simulator can start a local job - the spark platform allows the printers to register a local job. The only requirement is that each local job should have a unique id. When spark encounters an unknown job id in the printer status - it will automatically register this job and assign it to the primary owner for this printer. This job can then be manipulated like any other cloud initiated job. 
While not required - we highly recommend using a "local_" prefix for local job ids. This will help in debugging etc. 

*	This is how a local job appears when the app retrieves printer status (pretty much similar to regular jobs)