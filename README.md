# Printer Simulator
##Introduction
The Printer Simulator allows app developers to test the Forge <a href="https://developer.autodesk.com" target="_blank">Print API</a> without requiring a physical printer.
It provides all the same functionality as a "regular" 3D printer, however its 3D printing is virtual.
The printer simulator also acts as a reference implementation for printer firmware designers.

<b>To see the Forge API documentation and make meaningful use of the Print Simulator, please sign up to the developers' portal at
 <a href="https://developer.autodesk.com" target="_blank">https://developer.autodesk.com</a>.</b>

##Contents
1. Getting Started
2. The Printer Simulator Interface
3. Calling the Printer Simulator from an App

###1. Getting Started
Printer Simulator is a simple HTML/Javascript page, it requires no client side setup except the HTML and associated JS and CSS files.  
1. Download this entire repository.  
2. The simulator runs as a straight HTML file – no server setup is required – simply open the HTML file in Chrome or Firefox.  
3. The simulator has 3 sections: 

a.	The <b>LCD screen</b> mimics a printer display.<br> 
b.	The <b>Log</b> reports printer activity, debug messages sent to Forge cloud services and the storage state of the printer (token, registration state etc.). <br> 
c.	<b>Buttons</b> allow you to perform registration, health check (report the printer's online/offline status) and print job control (resume, pause, cancel).

###2. The Printer Simulator Interface

<h4>a. Registration buttons</h4>

<b>New Token</b> - Completely resets the printer state, issuing a new printer ID and requiring members who have registered to use the printer to re-register as if it were a different printer.

<b>Get Token</b> - Returns the locally stored token. Re-registration is not required, the printer ID remains unchanged.

<h4>b. Health Check buttons</h4>

<b>Online</b> - The printer simulator sends regular messages to the Forge server ("Health Checks") notifying of its status. Print jobs and Commands can be sent to the printer simulator.

<b>Offline</b> - The printer simulator does not communicate with the Forge server. No print jobs or commands can be sent to the printer simulator.

<h4>c. Print buttons</h4>

<b>Resume</b> - Resume printing a paused print job: Only active if the printer simulator is "printing" a print job and the Pause button was pressed. The printer simulator will send a status check message to the Forge server, saying it has resumed work.

<b>Pause</b> - Pause printing an active print job: Only active if the printer simulator is "printing" a print job. The printer simulator will send a status check message to the Forge server saying that it is paused.

<b>Cancel</b> - Cancel printing an active print job: Only active if the printer simulator is "printing" a print job. The printer simulator will send a status check message to the Forge server saying that it is paused.

<h4>d. Local Print Job buttons</h4>

<b>Local</b> - Start printing a virtual print job on the print simulator. This print job is "locally initiated" and not one sent by an app. If the printer is online it will notify the Forge server of the local print job and apps can send commands to the printer simulator affecting the print job.

###3. Calling the Printer Simulator from an App
Except for Authentication API calls, all the API calls shown below are documented in the Forge <a href="https://developer.autodesk.com" target="_blank">Print API</a> section.

<h4> a. Authentication </h4>
All API calls originating from the application require an Authorization header with an "access-token".
For a guide to obtaining an access-token see our tutorial on <a href="https://developer.autodesk.com" target="_blank">Generating an Access Token</a> and/or the <a href="https://developer.autodesk.com" target="_blank">Authentication API</a> documentation.

<h4> b. Testing REST API calls</h4>
API calls can be tested from our Print API documentation or by using a REST client such as Postman so you can update the token in a single location without having to update each end point. 

<h4>c. Registering to use the printer simulator</h4>
Unless you register to use the printer simulator you will not be able to send any jobs or commands to it from an app.

1. Click “New Token” to have the printer connect to the Forge server and retrieve a registration code. The registration token will be displayed on the Print Simulator's log. This registers you as the print simulator's "printer owner".
2. Call the Printer Register API (see the Print API's <a href="https://developer.autodesk.com" target="_blank">Printer Registration section</a>).  
The following example uses the <a href="https://www.getpostman.com/" target="_blank">Postman REST client</a>.
```
POST /api/v1/print/printers/register HTTP/1.1
Host: developer.api.autodesk.com
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
The print simulator actively listens for registration events. Calling the Printer Register API will cause the Forge server to notify the print simulator that a registration has taken place and a message will appear in the log:
```
Received message from server:{"registration":"success","type":"primary","printer_id":58,"member_id":20711941}
```
<h4>d. Making a health check</h4>
Once the printer is registered, it will start sending health check messages to the server - the printer simulator is configured to send a message every 60 seconds. The following message appears in the log:  

```
sending health check ping with auth code:WfsVvaD84sN3wQoygfNK-JqmB4pvJko5Mrl2xgUFBzM
POST data:{"printer_status":"ready"}
Sending POST request to: http://developer.api.autodesk.com/api/v1/print/printers/status
Server response status 200
```
If the printer is sending health checks regularly - it will appear as online. The application can check the printer simulator's online/offline status by calling the Printer Status Check API (see the Print API's <a href="https://developer.autodesk.com" target="_blank">Printer Management section</a>):

```
GET /api/v1/print/printers/status/58 HTTP/1.1
Host: developer.api.autodesk.com
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

<h4>e. Sending print jobs to the printer simulator</h4>
Once the printer is registered, it actively listens for incoming commands. 
To send a print job to the printer simulator - use the Print Job Create API. This returns a job id which you can use to check the print job's status or pause/cancel the job. 

```
POST /api/v1/print/printers/58/jobs HTTP/1.1
Host: developer.api.autodesk.com
Authorization: Bearer jDG4YLSTAUlI33k79KYJ2f4Q5nAZ
Content-Type: application/json
Cache-Control: no-cache
 
{ "printable_url": "http://cdn.static.com/print/abcefg", "settings": { "FirstApproachRPM": 6, "FirstZLiftMicrons": 2000, "FirstSeparationMicronsPerSec": 5000, "FirstApproachMicronsPerSec": 5000, "FirstRotationMilliDegrees": 60000 } }
 
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
Host: developer.api.autodesk.com
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
<h4> f. Sending commands to the printer simulator</h4>
Commands can be sent to the printer simulator using the Command Send API. 
While general printer commands such as calibrate, firmware_upgrade and logs, return dummy data, "pause", "cancel" and "resume" commands have an actual impact on the (virtually) running print job.  

Commands with a job scope (pause/resume/cancel) require a job_id as a parameter. See the Forge Print API's <a href="https://developer.api.autodesk.com" target="_blank">Printer Management section</a>) for more information:

```
POST /api/v1/print/printers/58/command HTTP/1.1
Host: developer.api.autodesk.com
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
GET /api/v1/print/printers/command/bf16cf49-86d9-4c7a-8aa4-90e18eb1b689 HTTP/1.1
Host: developer.api.autodesk.com
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
In addition you will notice that the layers have stopped processing on the printer simulator.
Please note that you can also trigger pause, resume, cancel from the print simulator UI. They have the same impact on updating the print job status and the running job in the simulator. 

