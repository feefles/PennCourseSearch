var config = require('./config')
var path = require('path');
var express = require('express')
var app = express();
var request = require("request");
var currentTerm = '2015A'

SchedCourses = {};

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res) {
  return res.render('index', {
    title: 'PennCourseScheduler',
    currentTerm: currentTerm
  });
})

app.listen(process.env.PORT || 3000, function(){
  console.log("Node app is running at localhost:" + app.get('port'))
})

app.get('/Search', function(req, res) {
	var courseIDSearch = req.query.courseID;
	console.log(courseIDSearch);
	var searchType = req.query.searchType;
	if (courseIDSearch != 'favicon.ico') {
		console.time('  Request Time');
		request({
		  uri: 'https://esb.isc-seo.upenn.edu/8091/open_data/course_section_search?course_id='+courseIDSearch+'&number_of_results_per_page=200',
		  method: "GET",headers: {"Authorization-Bearer": config.requestAB,"Authorization-Token": config.requestAT},
		}, function(error, response, body) {
			console.timeEnd('  Request Time');
			try {
				if (searchType == 'deptSearch') {
					var searchResponse = parseDeptList(body)
				} else if (searchType == 'numbSearch') {
					var searchResponse = parseCourseList(body)
				} else if (searchType == 'sectSearch') {
					var searchResponse = parseSectionList(body)
				} else {var searchResponse = ''}
			} catch(err) {var searchResponse = 'No Results '+err}
			return res.send(searchResponse);
		});
	};
});

app.get('/Sched', function(req, res) {
	var addRem = req.query.addRem;
	var courseID = req.query.courseID;

	if (addRem == 'add') {
		request({
		  uri: 'https://esb.isc-seo.upenn.edu/8091/open_data/course_section_search?course_id='+courseID,
		  method: "GET",headers: {"Authorization-Bearer": "***REMOVED***","Authorization-Token": "***REMOVED***"},
		}, function(error, response, body) {
			resJSON = getSchedInfo(body);
			for (var i = 0; i < Object.keys(resJSON).length; i++) {
				var JSONSecID = Object.keys(resJSON)[i]
				SchedCourses[JSONSecID] = resJSON[JSONSecID];
			};
			console.log('Added: ')
			console.log(resJSON)
			return res.send(SchedCourses);
		});
	} else if (addRem == 'rem') {
		console.log('remove: '+courseID)
		for (meetsec in SchedCourses) {
			if (SchedCourses[meetsec].fullCourseName.replace(/ /g, "") == courseID) {
				delete SchedCourses[meetsec];
			}
		}
		console.log('Removed: ')
		console.log(resJSON)
		return res.send(SchedCourses);
	} else if (addRem == 'clear') {
		SchedCourses = {};
	}
	else {
		return res.send(SchedCourses);
	}

});

function parseDeptList(JSONString) {
	var Res = JSON.parse(JSONString); // Convert to JSON object
	var coursesList = [];
	for(var key in Res.result_data) { // Iterate through each course
      	var courseListName = Res.result_data[key].course_department+' '+Res.result_data[key].course_number; // Get course dept and number
      	if (coursesList.indexOf('<li>'+courseListName+'<span class="CourseTitle"> - '+courseTitle+'</span></li>') == -1) { // If it's not already in the list
      		var courseTitle = Res.result_data[key].course_title;
      		coursesList.push('<li>'+courseListName+'<span class="CourseTitle"> - '+courseTitle+'</span></li>'); // Add and format
      	};
    }
	return coursesList;
}

function getTimeInfo(JSONObj) {
	OCStatus = JSONObj.course_status;
  	if (OCStatus == "O") {
  		var StatusClass = 'OpenSec' // If it's open, add class open
  	} else {
  		var StatusClass = 'ClosedSec' // If it's closed, add class closed
  	};
  	var TimeInfo = [];
	try { // Not all sections have time info
		for(var meetList in JSONObj.meetings) {
			var StartTime = JSONObj.meetings[meetList].start_time.split(" ")[0];
			if (StartTime[0] == '0') {StartTime = StartTime.slice(1)};
			var EndTime = JSONObj.meetings[meetList].end_time.split(" ")[0];
			if (EndTime[0] == '0') {EndTime = EndTime.slice(1)};
			var MeetDays = JSONObj.meetings[meetList].meeting_days;
			meetListInfo = ' - '+StartTime+" to "+EndTime+" on "+MeetDays;
			TimeInfo.push(meetListInfo);
		}
	}
	catch(err) {
		console.log("Error getting times")
		var TimeInfo = [];
	}
	return [StatusClass, TimeInfo];
}

function parseCourseList(JSONString) {
	var Res = JSON.parse(JSONString); // Convert to JSON object
	var courseTitle = Res.result_data[0].course_title;
	var sectionsList = '<span>'+courseTitle+'</span>'
	for(var key in Res.result_data) {
      	var tempName = Res.result_data[key].course_department+' '+Res.result_data[key].course_number+' '+Res.result_data[key].section_number;
      	var TimeInfoArray = getTimeInfo(Res.result_data[key]);
      	var StatusClass = TimeInfoArray[0];
      	var TimeInfo = TimeInfoArray[1][0];
		if (sectionsList.indexOf(tempName) == -1) { // If it's not already in the list
      		sectionsList += '<li><span>&nbsp + &nbsp</span><span class="'+StatusClass+'">&nbsp&nbsp&nbsp&nbsp&nbsp</span>&nbsp;&nbsp;<span>'+tempName+TimeInfo+'</span></li>'; // Add and format
      	};
    }
    if (sectionsList == "") {sectionsList = "No results"}; // If there's nothing, return 'No results'
    return sectionsList;
}

function parseSectionList(JSONString) {
	var Res = JSON.parse(JSONString); // Convert to JSON Object
	var entry = Res.result_data[0];
	try {
		var Title = entry.course_title;
		var FullID = entry.section_id_normalized.replace(/-/g, " "); // Format name
		try {
			var Instructor = "<br><br>Instructor: " + entry.instructors[0].name;
		} catch(err) {
			var Instructor = "";
		}
		var Desc = entry.course_description;
		var TimeInfoArray = getTimeInfo(entry);
      	var StatusClass = TimeInfoArray[0];
      	var meetArray = TimeInfoArray[1];
      	var TimeInfo = '';
      	for(var listing in meetArray) {
      		TimeInfo += meetArray[listing].split("-")[1] + '<br>';
      	}

      	if (StatusClass == "OpenSec") {var OpenClose = 'Open'} else {var OpenClose = 'Closed'};

		if (entry['recitations'] != false) { // If it has recitations
			var AsscList = '<br>Associated Recitations: <ul>';
			for(var key in entry.recitations) {
				AsscList += '<li>'+entry.recitations[key].subject+' '+entry.recitations[key].course_id+' '+entry.recitations[key].section_id+'</li>'
			};
			AsscList += '</ul>';

		} else if (entry['labs'] != false) { // If it has labs
			var AsscList = '<br>Associated Labs: <ul>';
			for(var key in entry.labs) {
				AsscList += '<li>'+entry.labs[key].subject+' '+entry.labs[key].course_id+' '+entry.labs[key].section_id+'</li>'
			};
			AsscList += '</ul>';

		} else if (entry['lectures'] != false) { // If it has lectures
			var AsscList = '<br>Associated Lectures: <ul>';
			for(var key in entry.lectures) {
				AsscList += '<li>'+entry.lectures[key].subject+' '+entry.lectures[key].course_id+' '+entry.lectures[key].section_id+'</li>'
			};
			AsscList += '</ul>';

		} else {
			AsscList = '';
		};

		return FullID + " - " + Title + Instructor +  "<br><br>" + Desc + "<br><br>Status: " + OpenClose + "<br><br>" + TimeInfo + AsscList; // Format the whole response
	}
 	catch(err) {
		return 'No Results';
	}
}

function getSchedInfo(JSONString) {
	var Res = JSON.parse(JSONString); // Convert to JSON Object
	var entry = Res.result_data[0];
	try {
		var Title = entry.course_title;
		var SectionName = entry.section_id_normalized.replace(/-/g, " "); // Format name
		var SectionID = entry.section_id_normalized.replace(/-/g, ""); // Format name
		var Desc = entry.course_description;
		var resJSON = { };
		try { // Not all sections have time info
			for (var meeti in entry.meetings) {
				var StartTime = (entry.meetings[meeti].start_hour_24) + (entry.meetings[meeti].start_minutes)/60;
				var EndTime = (entry.meetings[meeti].end_hour_24) + (entry.meetings[meeti].end_minutes)/60;
				var halfLength = EndTime - StartTime;
				var MeetDays = entry.meetings[meeti].meeting_days;
				var OpenClose = entry.course_status_normalized;

				resJSON[SectionID.replace(/ /g, "")+MeetDays+StartTime] = {'fullCourseName': SectionName,
		    		'HourLength': halfLength,
		    		'meetDay': MeetDays,
		    		'meetHour': StartTime};
	    	}
		}
		catch(err) {
			console.log("Error getting times")
			var TimeInfo = '';
		}
		return resJSON;
	}
 	catch(err) {
		return 'No Results';
	}
}
