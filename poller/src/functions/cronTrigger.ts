import config from '../../../config.json'
import type { ScheduledEvent } from '@cloudflare/workers-types'
import { MonitorMonth } from 'cf-status-page-types'
import { createRedis } from "redis-on-workers";
import {
  getCheckLocation,
  getKVMonitors,
  setKVMonitors,
} from './helpers'

function getDate(time: number) {
  return new Date(time).toISOString().split('T')[0]
}

export async function processCronTrigger(namespace: KVNamespace,statusdb: Env,  trigger, event: ScheduledEvent) {
  let log_verbose=false
  let log_errors=true
  console.log("cron_function_init "+trigger)
  // Get Worker PoP and save it to monitorMonthMetadata
  const checkLocation = await getCheckLocation()
  // the first went to fetch location
  let sentRequests=1;
  const now = Date.now()
  const cronStarted = now
  const checkDay = getDate(now)
  let dayname=checkDay.slice(0, 7)
  //const preset_debounce = config.debounce || 345 
  const checksPerRound=20

  const preset_debounce = config.debounce || (  42 + ( config.monitors.length * 3 )  ) 
  // Get monitors state from KV
  console.log("KV_read_1")
  let monitorMonth: MonitorMonth = await getKVMonitors(namespace,dayname)
  // Create empty state objects if not exists in KV storage yet
  // the second went to fetch kv once
  sentRequests=2;
  if (!monitorMonth) {
    const lastDay = getDate(now - 86400000)
    console.log("KV_read_2_generate_monitor_month")
    const lastMonitorMonth: MonitorMonth = await getKVMonitors( namespace, lastDay.slice(0, 7))
  // the third went to fetch kv again
  sentRequests=3;
    monitorMonth = {
      lastCheck: now,
      operational: lastMonitorMonth ? lastMonitorMonth.operational : {},
      checks: {}
      //incidents: {},
    }
  }
  //console.log("init_1_getObj")
  if (!monitorMonth.checks[checkDay]) {
    monitorMonth.checks[checkDay] = {
      summary: {},      res: [],      incidents: [],
  } }
  if (!monitorMonth.lastFetched) {
    monitorMonth.lastFetched={}
  }
  //console.log("init_1_lastFetched")
  //console.log(JSON.stringify(monitorMonth))
  const res: {
    t: number
    l: string
    ms: {
      [index: string]: number | null
    }
  } = { t: now, l: checkLocation, ms: {} }
  //console.log("init_1_data_prepared")
  let counter=1;
  let monCountDown = 0 ;
  let monCountOkay = 0 ;
  let monitorCount=config.monitors.length
  let cronSeconds=0
  let timediffcron=0
  //console.log("init_1_vars_set")
  if (!Object.hasOwn(monitorMonth, 'info')) {
                        monitorMonth["info"]={}
     }
    let mymonitors= []
    console.log("init_1_monitors loaded")
    if (!Object.hasOwn(monitorMonth, "lastFetched")) {
      monitorMonth.lastFetched={}
    }
    let timediffglobal=now-monitorMonth.lastCheck
    let localnow=Date.now()
    const defaultlastfetch=localnow-999999999
    for (const monitor of config.monitors) {
    //if (!Object.hasOwn(monitorMonth.info, monitor.id)) {
    // }
    if (!Object.hasOwn(monitorMonth.lastFetched, monitor.id)) {
      monitorMonth.lastFetched[monitor.id]=defaultlastfetch
      }
    let reasons="";
    let displayname = monitor.name || monitor.id.toString();
    let do_request=true
    const timesec=(Date.now()-monitorMonth.lastFetched[monitor.id])/1000
    const realdebounce= Object.hasOwn(monitor,"debounce") ? monitor.debounce : preset_debounce
    if( timesec < realdebounce  ) {
      do_request=false;
      reasons="+t"
    } else { 
      reasons="+T"
      do_request=true
    }
    //subrequest limiter
    //if(sentRequests > 42 ) {
    //  reasons=reasons+"+LimR"
    //  do_request=false
    //} 
    if(do_request) {
      let mymonitor=monitor
      mymonitor.lastFetched=monitorMonth.lastFetched[monitor.id]
      mymonitors.push(mymonitor)
    } else {
         console.log(` [ ${counter} / ${monitorCount}  ].( ${sentRequests} )  ${reasons} | NOT Checking ${displayname} .| lastFetch: ${timesec} s ago dbounce: ${realdebounce} @ time : ${monitorMonth.lastCheck/1000} .| crontime: ${cronSeconds} `) 

    }
    


      //  let lastping=monitorMonth.lastFetched[monitor.id]
      //  if ( newestmonitor == 0 )  {
      //    newestmonitor=monitor.id
      //  }
      //  if ( oldestmonitor == 0 )  {
      //    oldestmonitor=monitor.id
      //  }
      //  if (lastping>oldestmonitor ) {
      //    oldestmonitor=monitor.id
      //    oldestmonitors.push(monitor.id)
      //  }
      //  if (lastping<newestmonitor ) {
      //    newestmonitor=monitor.id
      //    youngestmonitors.unshift(monitor.id)
      //  }
    counter=counter+1
    }
  //console.log("init_2_monitors_filtered")
  
  //const allpings = youngestmonitors.concat(oldestmonitors);

  mymonitors.sort((a, b) => a.lastFetched - b.lastFetched)
  console.log("sorted_and_ready")
  counter=1
  for (const monitor of mymonitors) {
    //console.error("start_mon "+ monitor.id.toString()+" ++ last: "+monitor.lastFetched )
    //console.log(JSON.stringify(monitor))
    let localnow=Date.now()
    const realdebounce=monitor.debounce||preset_debounce
    let displayname = monitor.name || monitor.id.toString();
    let monurl= monitor.hidden ?  "https://pages.cloudflare.com" : monitor.url; 
    monitorMonth.info[monitor.id]= { "name": displayname , "url": monurl }
    //let laststr=monitorMonth.lastCheck
    //let nowstr=

    const timesec=((localnow-monitorMonth.lastFetched[monitor.id])/1000).toFixed(2)

    let do_request = false;
    let reasons="";
    let checkResponse={};
    //checkResponse
    if( timesec > realdebounce  ) {
      do_request=true;
      reasons="+T"
    } else { 
      reasons="+t"
    }
    //subrequest limiter
    if(sentRequests > 42 ) {
      reasons=reasons+"+LimR"
      do_request=false
    } else {
      cronSeconds=(localnow-cronStarted)/1000
      //console.log("cronseconds:"+ cronSeconds.toString())
      if ( cronSeconds > 13  ) { 
        reasons=reasons+"+LimT"
        do_request=false
      } else { 
        reasons=reasons+" "
      }
    }
    if (do_request) {
    let monitorStatusChanged=false
      let returnstatus=0
      console.log(` [ ${counter} / ${monitorCount}  ] ( ${sentRequests} )  ${reasons} |     Checking ${displayname} checkd: ${timesec} s ago | last time: ${monitorMonth.lastCheck}`)
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
              //@ts-expect-error
              //'User-Agent': config.settings.user_agent || 'cf-workers-status-poller',
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
      // save new average ms
      monitorMonth.checks[checkDay].summary[checkLocation][monitor.id].a = Math.round(ms / no)
      // back online
       if (monitorStatusChanged) {
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
////       if (!Object.hasOwn(monitorMonth.monitors[monitor.id], 'incidents')) {
////                          monitorMonth.monitors[monitor.id].incidents=[]
////       }
//       monitorMonth.incidents[monitor.id].push({ start: now, status: checkResponse.status, statusText: checkResponse.statusText })
//       console.log("get incident count")
//       const incidentNumber = monitorMonth.monitors[monitor.id].incidents.length - 1
       console.log("save incident ");
       if(typeof monitorMonth.checks[checkDay].incidents === 'object' && !Array.isArray(monitorMonth.checks[checkDay].incidents) && monitorMonth.checks[checkDay].incidents !== null) {
          monitorMonth.checks[checkDay].incidents=[]
       }
       monitorMonth.checks[checkDay].incidents.push({ start: now, status: checkResponse.status, statusText: checkResponse.statusText })
     }
  // end timediff
   } else { // dorequest
    const dontchecknow=Date.now()
    timediffcron=dontchecknow-cronStarted
    cronSeconds=timediffcron/1000
    //if(log_verbose) { 
      console.log(` [ ${counter} / ${monitorCount}  ] ( ${sentRequests} )  ${reasons} | NOT Checking ${displayname}  | lastFetch: ${timesec} s ago dbounce: ${realdebounce} @ time : ${monitorMonth.lastCheck/1000} | crontime: ${cronSeconds} `) 
    //}
  } // end dorequest
  counter=counter+1
  }
  
  monitorMonth.checks[checkDay].res.push(res)
  monitorMonth.lastCheck = now
  if(monCountDown==monitorCount) { 
      monitorMonth.countText=' ( Down: '+monCountDown.toString()+' )'
  } else {
    if(monCountOkay==monitorCount) {
      monitorMonth.countText="   "
    } else { 
      monitorMonth.countText='( Down: '+monCountDown.toString()+' | Up : '+monCountOkay.toString()+' )'
    }

  }
  // Save monitorMonth to KV storage
  //localnow=Date.now()
  //timediffcron=localnow-cronStarted
  cronSeconds=(Date.now()-cronStarted) /1000
  console.log("KV_write_FIN crontime:"+cronSeconds.toString()+" s")
  await setKVMonitors(namespace,dayname, monitorMonth)
  //INSERT INTO vocabulary(word) VALUES('jovial')   ON CONFLICT(word) DO UPDATE SET count=count+1;
  //const dbResInfo = await statusdb
	//	.prepare('INSERT INTO info (id, record) VALUES (?1, ?2)  ON CONFLICT(id) DO UPDATE SET record=?3')
	//	.bind("info", JSON.stringify(monitorMonth.info),JSON.stringify(monitorMonth.info))
	//	.run();
  //  console.log(JSON.stringify(dbResInfo))

    const stmtgetinfo= await statusdb.prepare('select * from info where id="operational" or id="lastCheck" or id="info"')
  const stmtgetsumm= await statusdb.prepare('select * from info where id="summary_'+checkDay+'"')
  const stmtgetconf= await statusdb.prepare('select * from config where profile=0')
  
  const dbres= await statusdb.batch([
    stmtgetinfo,
    stmtgetsumm,
    stmtgetconf
  ] )
  console.log(JSON.stringify(dbres))
  const stmtinfo = await statusdb.prepare('INSERT INTO info (id, record) VALUES (?1, ?2)  ON CONFLICT(id) DO UPDATE SET record=?2')
  const stmtrest = await statusdb.prepare('INSERT INTO ping (ts, day, loc, ms ) VALUES (?1, ?2, ?3,?4)  ON CONFLICT(ts) DO UPDATE SET ms=?4')
  // second conflict should not happen since the worker runs only once
  const dbResInfo = await statusdb.batch([
    stmtinfo.bind("info",        JSON.stringify(monitorMonth.info)),
    stmtinfo.bind("lastCheck", monitorMonth.lastCheck.toString()),
    stmtinfo.bind("lastFetched", JSON.stringify(monitorMonth.lastFetched)),
    stmtinfo.bind("operational", JSON.stringify(monitorMonth.operational)),
    stmtinfo.bind("summary_"+checkDay, JSON.stringify(monitorMonth.checks[checkDay].summary)),
    stmtrest.bind(res.t,checkDay, res.l, JSON.stringify(res.ms))
  ]);
  console.log(JSON.stringify(dbResInfo))
  cronSeconds=(Date.now()-cronStarted) /1000
  
  console.log("D1_write_FIN crontime:"+cronSeconds.toString()+" s")
  return new Response('OK')
}

  //console.log(JSON.stringify(operational))
  //for ((const key, const value) in operational) {
  //  if(value) { 
  //      let monCountOkay:number = monCountOkay+1
  //  } else {
  //      let monCountDown:number = monCountDown+1 
  //  }
  //}  
