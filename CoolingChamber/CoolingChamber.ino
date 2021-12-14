#include "project.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <DHT.h>

/* Timers */
unsigned long executionTime = 500, actualTime = 0, previous, actual;

/* Wifi Properties */
WiFiClientSecure wifiClient = WiFiClientSecure();
WiFiManager wifiManager;

/* Broker MQTT Properties */
PubSubClient mqttClient(wifiClient);
const char* OUT_TOPIC = "your_out_topic";

/* MCU ESP32 Properties */
const char* CLIENT_ID = "YOUR_ID"; // unique client id
const char* OUT_SHADOW = "out_shadow";

/* DHT Temperature-Humidity Sensor */
const int DHT_PIN = 4;
const int DHT_TYPE = 11;
DHT dht(DHT_PIN, DHT_TYPE);

/* Servo Motor */
Servo servomotor;
const int SERVO_PIN = 12;

/* Ventilador 12-V*/
const int COOLER_PIN = 0;

/* Json Format */
StaticJsonDocument<JSON_OBJECT_SIZE(1)> outputDoc;
StaticJsonDocument<JSON_OBJECT_SIZE(1)> inputDoc;
char outputBuffer[128];

/* Functions */
void turnOnServo() {
  servomotor.write(60);
}

void turnOffServo() {
  servomotor.write(180);
}
void coolerOff() {
  pinMode(COOLER_PIN, OUTPUT);
  digitalWrite(COOLER_PIN, HIGH);
}
void coolerOn() {
  pinMode(COOLER_PIN, OUTPUT);
  digitalWrite(COOLER_PIN, LOW);
}

void servodegrees(const char* topic, byte* payload, String message){
  if (String(topic) == OUT_TOPIC) {
    Serial.println("Message from topic " + String(topic) + ": " + message);
    DeserializationError err = deserializeJson(inputDoc, payload);
    if (!err) {
      String action = String(inputDoc["action"].as<char*>());
      if (action == "ON") {
        turnOnServo();
        coolerOn();
      }
      else if (action == "OFF") {
        turnOffServo();
        coolerOff();
      }
    }
  }
}

// PubSubClient callback function
void callback(const char* topic, byte* payload, unsigned int length) {
  String message;
  for (int i = 0; i < length; i++) {
    message += String((char) payload[i]);
  }
  servodegrees(topic, payload, message);
}

void connectToWiFi() {
  Serial.println("Connecting to WiFi...");
  wifiManager.autoConnect("MY_ESP32_WIFI", "basti12345");
  wifiClient.setCACert(AMAZON_ROOT_CA1);
  wifiClient.setCertificate(CERTIFICATE);
  wifiClient.setPrivateKey(PRIVATE_KEY);
}

void connectToMQTT() {
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(callback);
}

void subscribeToTopic(const char* topic) {
  mqttClient.subscribe(topic);
  Serial.println("Subscribed to \"" + String(topic) + "\"");
}

boolean mqttClientConnect() {
  Serial.println("Connecting to MQTT broker...");
  if (mqttClient.connect(CLIENT_ID)) {
    Serial.println("Connected to " + String(MQTT_BROKER));
    subscribeToTopic(OUT_SHADOW);
	subscribeToTopic(OUT_TOPIC);
  }
  else {
    Serial.println("Couldn't connect to MQTT broker.");
  }
  return mqttClient.connected();
}

void publishMessage(const char* topic, String message) {
  mqttClient.publish(topic, message.c_str());
}

void publishMessageJson(const char* topic, float temperature, float humidity, float dht_voltage, float cooler_voltage, float processTime) {
  String message = "{\"state\":{\"desired\":{\"temperature\":" + String(temperature) + "," + 
                                            "\"humidity\":" + String(humidity) + "," + 
                                            "\"dht_voltage\":" + String(dht_voltage) + "," +
                                            "\"cooler_voltage\":" + String(cooler_voltage) + "," +
                                            "\"process_time\":" + String(processTime) + "}}}";
  publishMessage(topic, message);
}

void connectMyThings() {
  dht.begin();
  servomotor.attach(SERVO_PIN);
  coolerOff();
}

void readDataFromThings() {
  previous = micros();
  float temperature = dht.readTemperature(); // Gets the values of the temperature
  float humidity = dht.readHumidity(); // Gets the values of the humidity
  float dht_voltage = 3.284 - (float)analogRead(DHT_PIN)/4096 * 3.3 * (1 + 3.3 - 3.284);
  float cooler_voltage = 4.857 - (float)analogRead(COOLER_PIN)/4096 * 5 * (1 + 5 - 4.857);
  actual = micros();
  float processTime = (float) actual - previous;
  publishMessageJson(OUT_SHADOW, temperature, humidity, dht_voltage, cooler_voltage, processTime);
}

void setup() {
  Serial.begin(115200);
  connectMyThings();
  connectToWiFi();
  connectToMQTT();
}

void loop() {
  if (millis() > actualTime + executionTime) {
    actualTime = millis();
    if (!mqttClient.connected()) {
      bool connected = mqttClientConnect();
    }
    else {
      mqttClient.loop();
      readDataFromThings();
    }
  }
}
