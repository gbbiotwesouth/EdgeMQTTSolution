'use strict';

var Transport = require('azure-iot-device-mqtt').Mqtt;
var Client = require('azure-iot-device').ModuleClient;
var IoTMessage = require('azure-iot-device').Message;
var { EventHubClient, EventPosition } = require('@azure/event-hubs');

Client.fromEnvironment(Transport, function (err, client) {
  if (err) {
    throw err;
  } else {
    client.on('error', function (err) {
      throw err;
    });

    // connect to the Edge instance
    client.open(function (err) {
      if (err) {
        throw err;
      } else {
        console.log('IoT Hub module client initialized');

        // get twin
        client.getTwin(function (err, twin) {
          if (err) {
              console.error('Error getting twin: ' + err.message);
          } else {
              twin.on('properties.desired', function(moduletwin) {
                console.log('Module Twin received.');
                if (moduletwin.IoTHubConnectionstring) {
                  // Connect to the partitions on the IoT Hub's Event Hubs-compatible endpoint.
                  var ehClient;
                  EventHubClient.createFromIotHubConnectionString(moduletwin.IoTHubConnectionstring).then(function (iotHubClient) {
                    console.log("Successully created the EventHub Client from iothub connection string.");
                    ehClient = iotHubClient;
                    return ehClient.getPartitionIds();
                  }).then(function (ids) {
                    console.log("The partition ids are: ", ids);
                    return ids.map(function (id) {
                      console.log("Receiver for partition: %s", id);
                      return ehClient.receive(id, 
                        function(msg) {
                          try
                          {
                            var output = msg.annotations['iothub-connection-device-id'];
                            var data = JSON.stringify(msg.body);
                            console.log('Output: %s, Message: %s', output, data);
                            var message = new IoTMessage(data);
                            client.sendOutputEvent(output, message, printResultFor('Sending received IoTHub message'));
                          }
                          catch(error)
                          {
                            console.log(error);
                          }
                        },
                        printError, { eventPosition: EventPosition.fromEnqueuedTime(Date.now()) });
                    });
                  }).catch(printError);
                }
            });
          }
        });
      }
    });
  }
});

// This function just pipes the messages without any change.
var outputMessage = function(msg) {
  try
  {
    var output = msg.annotations['iothub-connection-device-id'];
    var data = JSON.stringify(msg.body);
    console.log('Output: %s, Message: %s', output, data);
    var message = new IoTMessage(data);
    client.sendOutputEvent(output, message, printResultFor('Sending received IoTHub message'));
  }
  catch(error)
  {
    console.log(error);
  }
}

// Helper function to print results in the console
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) {
      console.log(op + ' error: ' + err.toString());
    }
    if (res) {
      console.log(op + ' status: ' + res.constructor.name);
    }
  };
}

// Print error
var printError = function (err) {
  console.log(err.message);
};
