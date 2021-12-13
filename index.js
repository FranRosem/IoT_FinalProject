const Alexa = require('ask-sdk-core');
const AWS = require('aws-sdk');
//const ddb = new AWS.DynamoDB.DocumentClient({region: 'ue-east-2'});
const IoTData = new AWS.IotData({endpoint: 'YOUR_ENDPOINT'});
let thingShadow;

const TurnOnParams = {
    topic: 'your_active_topic',
    payload: '{"action": "ON"}',
    qos: 0
};

const TurnOffParams = {
    topic: 'your_passive_topic',
    payload: '{"action": "OFF"}',
    qos: 0
};

var params = {
    thingName: 'your_thing',
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Welcome to your Cooling Chamber Project. What do you want to know?.';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
    
};

const TemperatureIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'TemperatureIntent';
    },
    async handle(handlerInput) {
        function getSensorData() {
            return new Promise((resolve, reject) => {
                IoTData.getThingShadow(params, (err, data) => {
                    if (err) {
                        console.log(err, err.stack)
                        reject(`Failed to update thing shadow: ${err.errorMessage}`)
                    } else {
                        resolve(JSON.parse(data.payload))
                    }
                })
            })
        }
        
        await getSensorData()
             .then((result) => thingShadow = result)
             .catch((err) => console.log(err))
             
        const speechTextTemperature = `Temperature is ${thingShadow.state.desired.temperature} °C`;
        return handlerInput.responseBuilder
            .speak(speechTextTemperature)
            .reprompt()
            .getResponse();
    }
};


const HumidityIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'HumidityIntent';
    },
    async handle(handlerInput) {
        function getSensorData() {
            return new Promise((resolve, reject) => {
                IoTData.getThingShadow(params, (err, data) => {
                    if (err) {
                        console.log(err, err.stack)
                        reject(`Failed to update thing shadow: ${err.errorMessage}`)
                    } else {
                        resolve(JSON.parse(data.payload))
                    }
                })
            })
        }
        
        await getSensorData()
             .then((result) => thingShadow = result)
             .catch((err) => console.log(err))
             
        const speechTextHumidity = `Humidity is ${thingShadow.state.desired.humidity}%`;
        return handlerInput.responseBuilder
            .speak(speechTextHumidity)
            .reprompt()
            .getResponse();
    }
};


const ServoOnIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ServoOnIntent';
    },
    handle(handlerInput) {
        IoTData.publish(TurnOnParams, function(err, data) {
            if (err) {
                console.log(err);
            }
        });
        
        const speakOutput = 'Your window is opened';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt()
            .getResponse();
    }
};

const ServoOffIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ServoOffIntent';
    },
    handle(handlerInput) {
        IoTData.publish(TurnOffParams, function(err, data) {
            if (err) {
                console.log(err);
            }
        });
        
        const speakOutput = 'Your window is closed';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt()
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say tell me if you want to open/close your window or ask from temperature and humidity.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Sorry, I don\'t know about that. Please try again.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt()
            .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom().addRequestHandlers(
        LaunchRequestHandler,
        HumidityIntentHandler,
        TemperatureIntentHandler,
        ServoOffIntentHandler,
        ServoOnIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
        .addErrorHandlers(
        ErrorHandler)
    .withCustomUserAgent('sample/hello-world/v1.2')
    .lambda();
    
