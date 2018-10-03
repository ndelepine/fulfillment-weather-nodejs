// Copyright 2017, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

const http = require('http');
const functions = require('firebase-functions');

const host = 'api.worldweatheronline.com';
const wwoApiKey = '69d1746bf0224663863131336180310';

function log(message, sid){
  console.log(sid + message)
}

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((req, res) => {
  // Get the city and date from the request
  let city = req.body.queryResult.parameters['geo-city']; // city is a required param

  // Get the date for the weather forecast (if present)
  let date = '';
  let sessionID = req.query.session || req.body.session || 'No ID';
  var parts = sessionID.split('/');
  var answer = parts[parts.length - 1];
  sid = '[' + answer + '] '
  if (req.body.queryResult.parameters['date']) {
    date = req.body.queryResult.parameters['date'];
    log('Date: ' + date, sid);
  }

  // Call the weather API
  callWeatherApi(city, date, sid).then((output) => {
    res.json({ 'fulfillmentText': output }); // Return the results of the weather API to Dialogflow
  }).catch(() => {
    res.json({ 'fulfillmentText': `I don't know the weather but I hope it's good!` });
  });
});

function callWeatherApi (city, date, sid) {
  return new Promise((resolve, reject) => {
    // Create the path for the HTTP request to get the weather
    let path = '/premium/v1/weather.ashx?format=json&num_of_days=1' +
      '&q=' + encodeURIComponent(city) + '&key=' + wwoApiKey + '&date=' + date;
    log('API Request: ' + host + path, sid);

    // Make the HTTP request to get the weather
    http.get({host: host, path: path}, (res) => {
      let body = ''; // var to store the response chunks
      res.on('data', (d) => { body += d; }); // store each response chunk
      res.on('end', () => {
        // After all the data has been received parse the JSON for desired data
        let response = JSON.parse(body);
        let forecast = response['data']['weather'][0];
        let location = response['data']['request'][0];
        let conditions = response['data']['current_condition'][0];
        let currentConditions = conditions['weatherDesc'][0]['value'];

        // Create response
        let output = `Current conditions in the ${location['type']}
        ${location['query']} are ${currentConditions} with a projected high of
        ${forecast['maxtempC']}°C or ${forecast['maxtempF']}°F and a low of
        ${forecast['mintempC']}°C or ${forecast['mintempF']}°F on
        ${forecast['date']}.`;

        // Resolve the promise with the output text
        log(output, sid);
        resolve(output);
      });
      res.on('error', (error) => {
        log(`Error calling the weather API: ${error}`, sid)
        reject();
      });
    });
  });
}
