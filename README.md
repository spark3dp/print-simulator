# Printer Simulator
##Introduction
Printer Simulator allows app developers to test the Spark print management API without requiring a physical printer.
It provides all the same functionality as a "regular" 3D printer, however its 3D printing is virtual.
The printer simulator also acts as a reference implementation for printer firmware designers.

##Contents
1. Getting Started
2. The Printer Simulator Interface
3. Calling the Printer Simulator from an App

###1. Getting Started
Printer Simulator is a simple HTML/Javascript page, it requires no client side setup except the HTML and associated JS and CSS files.  
1. Download this entire repository.  
2. The simulator runs as a straight HTML file – no server setup is required – simply open the HTML file in Chrome or Firefox.  
3. The simulator has 3 sections: 

a.	LCD screen mimics a printer display.<br> 
b.	Log shows functions performe by the printer, debug messages sent to Spark cloud services and the storage state of the printer (token, registration state etc.). <br> 
c.	Buttons allow you to perform registration, health check (report the printer's online/offline status) and print job control (resume, pause, cancel).

###2. The Printer Simulator Interface

<h4>Registration Buttons</h4>

New Token - Completely resets the printer state, issuing a new printer ID and requiring members who have registered to use the printer to re-register as if it were a different printer. 
Get Token - Returns the locally stored token. Re-registration is not required, the printer ID remains unchanged.

<h4>Health Check Buttons</h4>

Online - The printer simulator sends regular messages to the Spark server ("Health Checks") notifying of its status. Print jobs and Commands can be sent to the printer simulator.
Offline - The printer simulator does not communicate with the Spark server. No print jobs or commands can be sent to the printer simulator.

<h4>Print Buttons</h4>

Resume - Resume printing a paused print job: Only active if the printer simulator is "printing" a print job and the Pause button was pressed. The printer simulator will send a status check message to the Spark server, saying it has resumed work.

Pause - Pause printing an active print job: Only active if the printer simulator is "printing" a print job. The printer simulator will send a status check message to the Spark server saying that it is paused.

Cancel - Cancel printing an active print job: Only active if the printer simulator is "printing" a print job. The printer simulator will send a status check message to the Spark server saying that it is paused.

<h4>Local Print Job Buttons</h4>

Local - Start printing a virtual print job on the print simulator. This print job is "locally initiated" and not one sent by an app. If the printer is online it will notify the Spark server of the local print job and apps can send commands to the printer simulator affecting the print job.

###3. Calling the Printer Simulator from an App
Except for Authentication API calls, all the API calls shown below are documented in the Print API section.

<h4> Authentication </h4>
All API calls originating from the application require an Authorization header with an "access-token".
For a guide to obtaining an access-token see our tutorial on Generating an Access Token and/or the Authentication API documentation.

<h4> Testing REST API Calls</h4>
API calls can be tested from our Print API documentation or by using a REST client such as Postman so you can update the token in a single location without having to update each end point. 

<h4>Registering to use the printer simulator</h4>
Unless you register to use the printer simulator you will not be able to send any jobs or commands to it from an app.

1. Click “New Token” to have the printer connect to the Spark server and retrieve a registration code. The registration token will be displayed on the Print Simulator's log. This registers you as the print simulator's "printer owner".
2. Call the Printer Register API (see the Print API's Printer Registration section).  
The following example uses the Postman REST client (https://chrome.google.com/webstore/detail/postman-rest-client).
```
POST /api/v1/print/printers/register HTTP/1.1
Host: sandbox.spark.autodesk.com
Authorization: Bearer jDG4YLSTAUlI33k79KYJ2f4Q5nAZ
Cache-Control: no-cache
Content-Type: application/x-www-form-urlencoded
 
printer_name=my+makerbot&registration_code=YKNRKT
 
Response:
{
    "registered": true,
    "printer_id": 58
}
```
The print simulator actively listens for registration events. Calling the Printer Register API will cause the Spark server to notify the print simulator that a registration has taken place and a message will appear in the log:
```
Received message from server:{"registration":"success","type":"primary","printer_id":58,"member_id":20711941}
```
<h4>Making a Health Check</h4>
Once the printer is registered, it will start sending health check messages to the server - the printer simulator is configured to send a message every 60 seconds. The following message appears in the log:  

```
sending health check ping with auth code:WfsVvaD84sN3wQoygfNK-JqmB4pvJko5Mrl2xgUFBzM
POST data:{"printer_status":"ready"}
Sending POST request to: http://alpha.spark.autodesk.com/api/v1/print/printers/status
Server response status 200
```
If the printer is sending health checks regularly - it will appear as online. The application can check the printer simulator's online/offline status by calling the Printer Status Check API:

```
GET /api/v1/print/printers/status/58 HTTP/1.1
Host: sandbox.spark.autodesk.com
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

You can stop the printer from sending health checks by clicking the "Offline" button. Once the last_check_in value exceeds 60 seconds, the status for GET healthcheck will automatically flip to "offline"

```
{
    "status": "Offline",
    "last_check_in": 61000
}
```

<h4>Sending Print Jobs to the Printer Simulator</h4>
Once the printer is registered, it actively listens for incoming commands. 
To send a print job to the printer simulator - use the Print Job Create API. This returns a job id which you can use to check the print job's status or pause/cancel the job. 

```
POST /api/v1/print/printers/58/jobs HTTP/1.1
Host: sandbox.spark.autodesk.com
Authorization: Bearer jDG4YLSTAUlI33k79KYJ2f4Q5nAZ
Content-Type: application/json
Cache-Control: no-cache
 
{ "printable_url": "http://cdn.spark.com/print/abcefg", "settings": { "FirstApproachRPM": 6, "FirstZLiftMicrons": 2000, "FirstSeparationMicronsPerSec": 5000, "FirstApproachMicronsPerSec": 5000, "FirstRotationMilliDegrees": 60000 } }
 
Response:
{
    "printer_id": "58",
    "job_id": "44964c43-176e-43a5-b36c-7694054fe028",
    "status": "sent"
}

```
The printer will start "printing" the job and display appropriate messages in the log:
```
POST data:{"printer_status":"printing","progress":0.88,"job_id":"44964c43-176e-43a5-b36c-7694054fe028","job_progress":0.88,"job_status":"printing","data":{"job_status":"printing","total_layers":50,"layer":44,"seconds_left":120,"temprature":71,"job_id":"44964c43-176e-43a5-b36c-7694054fe028"}}
```

Your app can view the job's status with the Print Job Status API. This will return the current status of the job.

```
GET /api/v1/print/jobs/44964c43-176e-43a5-b36c-7694054fe028 HTTP/1.1
Host: sandbox.spark.autodesk.com
Authorization: Bearer S787KIuuBJAH43QU2FgaROqUCC8S
Cache-Control: no-cache
 
Response:
{
    "job_id": "44964c43-176e-43a5-b36c-7694054fe028",
    "job_status": {
        "printer_status": "printing",
        "job_id": "44964c43-176e-43a5-b36c-7694054fe028",
        "job_progress": "0.62",
        "job_status": "printing",
        "data": {
            "job_status": "printing",
            "total_layers": "50",
            "layer": "31",
            "seconds_left": "380",
            "temperature": "71",
            "job_id": "6e0880a9-ce65-44c2-bfa6-e6ba44d947d1"
        }
    },
    "job_date_time": "April 02, 2015 07:33:37",
    "job_status_time": "April 02, 2015 07:34:30",
    "local_job": false
}
```
<h4> Sending Commands to the Printer Simulator</h4>
Commands can be sent to the print simulator using the Command Send API. 
Commands with a job scope (pause/resume/cancel) require a job_id as a parameter. See Spark Documentation for more information:

```
POST /api/v1/print/printers/58/command HTTP/1.1
Host: sandbox.spark.autodesk.com
Authorization: Bearer S787KIuuBJAH43QU2FgaROqUCC8S
Cache-Control: no-cache
Content-Type: application/x-www-form-urlencoded
 
command=pause&job_id=44964c43-176e-43a5-b36c-7694054fe028
 
Response:
{
    "task_id": "bf16cf49-86d9-4c7a-8aa4-90e18eb1b689"
}
```
Commands are asynchronous so the result of a command is a task. To check the status of the task use the Command Status API:

```
GET /api/v1/print/printers/58/command?command=pause&task_id=bf16cf49-86d9-4c7a-8aa4-90e18eb1b689 HTTP/1.1
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


<h4>Sending Commands to the Printer Simulator</h4>
 
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
