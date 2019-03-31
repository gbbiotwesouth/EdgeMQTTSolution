//MQTTPublishModule
'use strict';

var Transport = require('azure-iot-device-mqtt').Mqtt;
var Client = require('azure-iot-device').ModuleClient;
var Message = require('azure-iot-device').Message;
const mqtt = require("mqtt");



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

        var mqttBroker;
        var mqttClient;
        // get twin
        client.getTwin(function (err, twin) {
          if (err) {
              console.error('Error getting twin: ' + err.message);
          } else {
              twin.on('properties.desired', function(moduletwin) {
                console.log('Module Twin received.');
                if (moduletwin.MQTTBroker) {
                    mqttBroker = moduletwin.MQTTBroker;
                    console.log('Initialize MQTT Broker connection.');
                    mqttClient = mqtt.connect("mqtt://" + mqttBroker);
                    mqttClient.on('connect', () => {
                      // Inform controllers that mqtt client is connected
                      console.log('MQTT Client is connected.');
                      mqttClient.publish('connected', 'true')
                    });
                }
            });
          }
        });

        // Act on input messages to the module.
        client.on('inputMessage', function (inputName, msg) {
          publishMessage(client, inputName, msg, mqttClient);
        });
      }
    });
  }
});

// This function sends the input message to the MQTT Broker.
function publishMessage(client, inputName, msg, mqttClient) {
  client.complete(msg, function(){console.log('Message received.');});

  var message = msg.getBytes().toString('utf8');
  if (message) {
    //var outputMsg = JSON.parse(message);
    console.log('Message: %s', message);
    console.log('Publish message to MQTT Broker on topic: ' + inputName);
    mqttClient.publish(inputName, message);
  }
}
