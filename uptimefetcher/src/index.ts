import { WorkerEntrypoint } from "cloudflare:workers";
import { MonitorMonth } from './../../types/src/KvMonitors'
import { createRedis } from "redis-on-workers";
import { Client } from "pg";

import {
  getCheckLocation,
  getKVMonitors,
  setKVMonitors,
} from './../../poller/src/functions/helpers'

function getDate(time: number) {
  return new Date(time).toISOString().split('T')[0]
}
export default class UptimeFetcher extends WorkerEntrypoint {
  // Currently, entrypoints without a named handler are not supported
  async fetch() { return new Response(null, {status: 404}); }
  async checkMonitors( monitorMonthjson: string,myconfigjson: string ,log_verbose: boolean , log_errors: boolean , checkDay: string , monitorCount: number) { 
  let monitorids = []
  let logline=""
  let errline=""
  let monitorMonth: MonitorMonth = JSON.parse(monitorMonthjson)
  //let mymonitors: MonitorMonth = JSON.parse(mymonitorsjson)
  // the worker doesnt know all incidentes
  monitorMonth.checks[checkDay].incidents=[]

  let config: MonitorMonth = JSON.parse(myconfigjson)
  let monCountDown = 0 ;
  let monCountOkay = 0 ;
  //let monitorCount=config.monitors.length
  let mymonitors=config.monitors
  const checkLocation = await getCheckLocation()
  // the first went to fetch location
  let sentRequests=1;
  let now = Date.now()
  const cronStarted = now
  let cronSeconds=0
  let timediffcron=0
  let counter=1;
  const preset_debounce = config.settings.debounce || 300
  const res: {
    t: number
    l: string
    ms: {
      [index: string]: number | null
    }
  } = { t: now, l: checkLocation, ms: {} }
  let checksPerRound=13
  for (const monitor of mymonitors) {
    monitorids.push(monitor.id)
    //console.error("start_mon "+ monitor.id.toString()+" ++ last: "+monitor.lastFetched )
    //console.log(JSON.stringify(monitor))
    let localnow=Date.now()
    cronSeconds=(localnow-cronStarted)/1000
    const realdebounce=monitor.debounce||preset_debounce
    let displayname = monitor.name || monitor.id.toString();
    let monurl= monitor.hidden ?  "https://pages.cloudflare.com" : monitor.url; 
    monitorMonth.info[monitor.id]= { "name": displayname , "url": monurl }
    //let laststr=monitorMonth.lastCheck
    //let nowstr=
    const timesec=((localnow-monitorMonth.lastFetched[monitor.id])/1000).toFixed(2)
    let do_request = true;
    let reasons="";
    let checkResponse={};
    //checkResponse
    if( timesec < realdebounce  ) {
      do_request=false;
      reasons="+t"
    } 
    //subrequest limiter
    if(sentRequests > 3+checksPerRound ) {
      reasons=reasons+"+LimR"
      do_request=false
    } else {
      //cronSeconds=(localnow-cronStarted)/1000
      //console.log("cronseconds:"+ cronSeconds.toString())
      if ( cronSeconds > 13  ) { 
        reasons=reasons+"+LimT"
        do_request=false
      } else { 
        reasons=reasons+" "
      }
    }
    if (do_request) {
      let checknow=Date.now()
      timediffcron=checknow-cronStarted
      cronSeconds=timediffcron/1000
      let monitorStatusChanged=false
      let returnstatus=0
      //console.log(` [ ${counter} / ${monitorCount}  ] ( ${sentRequests} )  ${reasons} |     Checking ${displayname} checkd: ${timesec} s ago | last time: ${monitorMonth.lastCheck}`)
      let monitorOperational=false
      let parserFound=false
      let requestTime = -2
      if(monitor.url.includes("http://")||monitor.url.includes("https://")) {
            parserFound=true
                  // Fetch the monitors URL
          const init: Parameters<typeof fetch>[1] = {
            method: monitor.method || 'GET',
            redirect: monitor.followRedirect ? 'follow' : 'manual',
            headers: {
              //'User-Agent': config.settings.user_agent || 'cf-workers-status-poller',
              //@ts-expect-error
              'User-Agent': monitor.user_agent || 'cf-workers-status-poller',
            },
          }
          // Perform a check and measure time
          const requestStartTime = performance.now()
          checkResponse = await fetch(monitor.url, init)
          requestTime = Math.round(performance.now() - requestStartTime)
          sentRequests=sentRequests+1
          monitorMonth.lastFetched[monitor.id]=localnow
          // Determine whether operational and status changed
          if(Object.prototype.toString.call(monitor.expectStatus) === '[object Array]') { 
            if (monitor.expectStatus.includes(checkResponse.status)) { monitorOperational= true }
          } else {
            //monitorOperational = checkResponse.status === (monitor.expectStatus || 200)
            // be more precise, 200 can also be raised by default placeholders etc
            monitorOperational = checkResponse.status === monitor.expectStatus
          }
          if(!monitorOperational) { 
            console.log(monitor.id+" STATUS_CODES : GOT "+ checkResponse.status + " NEED "+ JSON.stringify(monitor.expectStatus) )
          }
          returnstatus=checkResponse.status
          //check for full text
          if (monitor.matchText && monitorOperational) {
            //const results = await gatherResponse(checkResponse)
            let mytxt=await checkResponse.text();
            // next level:       if(Object.prototype.toString.call(monitor.matchText) === '[object Array]') { 
            if( mytxt.includes(monitor.matchText)  ) { 
              monitorMonth.operational[monitor.id] = true;
              monitorOperational = true;
            } else {
              console.log("STR NOT FOUND "+monitor.matchText);
              monitorMonth.operational[monitor.id] = false;
              monitorOperational = false;
            }
          }
          monitorStatusChanged = monitorMonth.operational[monitor.id] ? monitorMonth.operational[monitor.id] !== monitorOperational : false
          // Save monitor's last check response status
          monitorMonth.operational[monitor.id] = monitorOperational;
    } // end http monitors
    if(monitor.url.includes("rediss://")) {
      parserFound=true
      //const redis = createRedis("rediss://user:the_token@host.of.redis.lan:11111");
      const requestStartTime = performance.now()
      try {
        const redis = createRedis(monitor.url);
        const value = await redis.sendRawOnce("PING","");
        const redecoder = new TextDecoder();
        monitorOperational=true
        console.log("redis_ping_resp:" + decoder.decode(value)); 
        returnstatus=200
        checkResponse.status=200
        checkResponse.statusText=decoder.decode(value)
        monitorStatusChanged = monitorMonth.operational[monitor.id] ? monitorMonth.operational[monitor.id] !== monitorOperational : false
            } catch (error) {
        console.log("redis_resp_err"+error)
        returnstatus=503
        checkResponse.status=503
        checkResponse.statusText=error.toString()
      }
      requestTime = Math.round(performance.now() - requestStartTime)
      sentRequests=sentRequests+1
      monitorMonth.lastFetched[monitor.id]=localnow
    }
    if (do_request && config.settings.collectResponseTimes && monitorOperational) {
      // make sure location exists in current checkDay
      if (!monitorMonth.checks[checkDay].summary[checkLocation])
        monitorMonth.checks[checkDay].summary[checkLocation] = {}
      if (!monitorMonth.checks[checkDay].summary[checkLocation][monitor.id])
        monitorMonth.checks[checkDay].summary[checkLocation][monitor.id] = {
          n: 0,
          ms: 0,
          a: 0,
        }
      // increment number of checks and sum of ms
      const no = ++monitorMonth.checks[checkDay].summary[checkLocation][monitor.id].n
      const ms = monitorMonth.checks[checkDay].summary[checkLocation][monitor.id].ms += requestTime
      checknow=Date.now()
      timediffcron=checknow-cronStarted
      cronSeconds=timediffcron/1000
      logline=logline+'@CRLF@'+" | "+` [ ${counter} / ${monitorCount}  ] ( ${sentRequests} )  ${reasons} |     Checking ${displayname} checkd: ${timesec} s ago | rqTime ${requestTime} |  crontime: ${cronSeconds} `
      // save new average ms
      monitorMonth.checks[checkDay].summary[checkLocation][monitor.id].a = Math.round(ms / no)
      // back online
       if (monitorStatusChanged && monitorMonth.monitors[monitor.id].incidents.length >0 ) {
           monitorMonth.monitors[monitor.id].incidents.at(-1)!.end = now;
       }
    }

    res.ms[monitor.id] = monitorOperational ? requestTime : null
    if(monitorOperational) { monCountOkay=monCountOkay+1 } else { monCountDown=monCountDown+1 }
    // go dark
    if(!monitorOperational ) {
      if (monitorStatusChanged || log_errors ) {
                 console.log(` [ ${counter} / ${monitorCount}  ] ( ${sentRequests} )  ${reasons} |     FAILING ${displayname} checkd: ${timesec} s ago | last time: ${monitorMonth.lastCheck/1000}`)
      }
    }
    if (!monitorOperational && monitorStatusChanged) {
      console.log("changed status");
//      //console.log(JSON.stringify(monitorMonth))
//       if (!Object.hasOwn(monitorMonth, 'incidents')) {
//                          monitorMonth.incidents=[]
//       }
//      if (!monitorMonth.incidents.includes(monitor.id)) {
//        monitorMonth.incidents[monitor.id]=[]
//      }
       ///////////if (!Object.hasOwn(monitorMonth.monitors[monitor.id], 'incidents')) {
       ///////////                   monitorMonth.monitors[monitor.id].incidents=[]
       ///////////}
       ///////////monitorMonth.incidents[monitor.id].push({ start: now, status: checkResponse.status, statusText: checkResponse.statusText })
       ///////////console.log("get incident count")
       ///////////const incidentNumber = monitorMonth.monitors[monitor.id].incidents.length - 1
       ///////////console.log("save incident month");
       ///////////if(typeof monitorMonth.checks[checkDay].incidents === 'object' && !Array.isArray(monitorMonth.checks[checkDay].incidents) && monitorMonth.checks[checkDay].incidents !== null) {
       ///////////   monitorMonth.checks[checkDay].incidents=[]
       ///////////}
       //////////monitorMonth.checks[checkDay].incidents.push({ start: now, status: checkResponse.status, statusText: checkResponse.statusText, monitor: monitor.id })
     }
  // end timediff
   } else { // dorequest
    const dontchecknow=Date.now()
    timediffcron=dontchecknow-cronStarted
    cronSeconds=timediffcron/1000
    //if(log_verbose) { 
      //console.log(` [ ${counter} / ${monitorCount}  ] ( ${sentRequests} )  ${reasons} | NOT Checking ${displayname}  | lastFetch: ${timesec} s ago dbounce: ${realdebounce} @ time : ${monitorMonth.lastCheck/1000} | crontime: ${cronSeconds} `) 
      logline=logline+'@CRLF@'+" | "+` [ ${counter} / ${monitorCount}  ] ( ${sentRequests} )  ${reasons} | NOT Checking ${displayname}  | lastFetch: ${timesec} s ago dbounce: ${realdebounce} @ time : ${monitorMonth.lastCheck/1000} | crontime: ${cronSeconds} `
    //}
  } // end dorequest
  counter=counter+1
  } 
  let returnstr=JSON.stringify({"checkoutput": logline , "errlog": errline , "fullObj": monitorMonth , "res": res ,"up": monCountOkay ,"down": monCountDown , "monitors": monitorids , "loc": checkLocation } )
  //console.log("sending :"+returnstr)
  return returnstr; 
  }
}