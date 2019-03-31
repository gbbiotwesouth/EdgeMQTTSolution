// MQTTSubscribeModule
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
        var mqttTopic;
        // get twin
        client.getTwin(function (err, twin) {
          if (err) {
              console.error('Error getting twin: ' + err.message);
          } else {
              twin.on('properties.desired', function(moduletwin) {
                console.log('Module Twin received.');
                if (moduletwin.MQTTBroker) {
                  mqttBroker = moduletwin.MQTTBroker;
                  mqttTopic = moduletwin.Topic;
                  console.log('Initialize MQTT Broker connection.');
                  mqttClient = mqtt.connect("mqtt://" + mqttBroker);
                  mqttClient.on('connect', () => {
                    // Inform controllers that mqtt client is connected
                    console.log('MQTT Client is connected.');
                    mqttClient.subscribe(mqttTopic);
                  });

                  mqttClient.on('message', (topic, message) => {
                    console.log('Topic: %s, Message: %s', topic, message);
                    var msg = new Message(message);
                    client.sendOutputEvent(topic, msg, printResultFor('Sending received MQTT message'));
                  })
                }
            });
          }
        });
      }
    });
  }
});

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
