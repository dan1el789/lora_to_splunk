const mqtt = require('mqtt')

const host = 'eu1.cloud.thethings.network'
const port = '1883'
const passwordMqtt = process.env.MQTT
const passwordSplunk = process.env.SPLUNK
const clientId = `mqtt_${Math.random().toString(16).slice(3)}`
const topic = 'v3/testsaqewtv@ttn/devices/+/up'

const connectUrl = `mqtt://${host}:${port}`
const client = mqtt.connect(connectUrl, {
  clientId,
  clean: true,
  connectTimeout: 3600000,
  username: 'testsaqewtv@ttn',
  password: passwordMqtt,
  reconnectPeriod: 1000,
})

client.on('connect', () => {
  console.log('Connected')
  client.subscribe([topic], () => {
    console.log(`Subscribe to topic '${topic}'`)
  })
})

client.on('message', (topic, payload) => {
  console.log('Received Message:', topic, payload.toString())
  let data = JSON.parse(payload.toString())
  sendTemperatureDataToSplunk(data.end_device_ids.device_id,data.uplink_message.decoded_payload.temperature)
})

function isGitHubAction(){
  return process.env.GITHUB_ACTION != undefined
}
async function exitGitHubAction(){
   if(isGitHubAction()){
     await new Promise(r => setTimeout(r, 70 * 60 * 1000));
     return process.exit(0);
   }
}

function sendTemperatureDataToSplunk(sensorId, temperature){
  let req = createRequestIgnoringSslCertificate()
  
  let postData = JSON.stringify({
    "event": "meassurement",
    "sourcetype": "manual",
    "fields": {
      "temperatureSensor": sensorId,
      "temperature": temperature
    }
  });
  req.write(postData);
  req.end();
}

function createRequestIgnoringSslCertificate() {
  let https = require('follow-redirects').https
  let fs = require('fs')

  let options = {
    'method': 'POST',
    'hostname': 'inputs.prd-p-wd9is.splunkcloud.com',
    'port': 8088,
    'path': '/services/collector',
    'headers': {
      'Authorization': 'Splunk ' + passwordSplunk,
      'Content-Type': 'application/json'
    },
    'maxRedirects': 20,
    'rejectUnauthorized': false
  }

  let req = https.request(options, function (res) {
    let chunks = []

    res.on("data", function (chunk) {
      chunks.push(chunk)
    })

    res.on("end", function (chunk) {
      var body = Buffer.concat(chunks)
      console.log(body.toString())
    })

    res.on("error", function (error) {
      console.error(error)
    })
  })
  return req
}
