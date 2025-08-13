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

export async function processCronTrigger(namespace: KVNamespace, trigger, event: ScheduledEvent) {
  console.log("cron_function_init "+trigger)
  // Get Worker PoP and save it to monitorMonthMetadata
  const checkLocation = await getCheckLocation()
  const now = Date.now()
  const cronStarted = Date.now()
  const checkDay = getDate(now)
  const preset_debounce = config.debounce || 345 
  // Get monitors state from KV
  console.log("KV_read_1")
  let monitorMonth: MonitorMonth = await getKVMonitors(namespace,checkDay.slice(0, 7))
  // Create empty state objects if not exists in KV storage yet
  if (!monitorMonth) {
    const lastDay = getDate(now - 86400000)
    console.log("KV_read_2")
    const lastMonitorMonth: MonitorMonth = await getKVMonitors( namespace, lastDay.slice(0, 7))

    monitorMonth = {
      lastCheck: now,
      operational: lastMonitorMonth ? lastMonitorMonth.operational : {},
      checks: {
        // incidents: {},
      }
    }
  }

  if (!monitorMonth.checks[checkDay]) {
    monitorMonth.checks[checkDay] = {
      summery: {},
      res: [],
      incidents: {},
    }
  }
  if (!monitorMonth.lastFetched) {
    monitorMonth.lastFetched={}
  }
  const res: {
    t: number
    l: string
    ms: {
      [index: string]: number | null
    }
  } = { t: now, l: checkLocation, ms: {} }
  let counter=1;
  let monCountDown = 0 ;
  let monCountOkay = 0 ;
  // the first went to fetch kv
  let sentRequests=1;
  let monitorCount=config.monitors.length
  
  // we know our fetchlimit of 42, so we do not have to re-sort the whole array
  //let oldestmonitors = []
  //let oldestmonitor=0
  //let newestmonitor=0
  let mymonitors= []
  for (const monitor of config.monitors) {
      let timediffglobal=now-monitorMonth.lastCheck
    if (!monitorMonth.lastFetched[monitor.id]) {
      monitorMonth.lastFetched[monitor.id]=localnow-999999999
    }
  let mymonitor=monitor
  mymonitor.lastFetched=monitorMonth.lastFetched[monitor.id]
  mymonitors.push(mymonitor)
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

  }
  
  //const allpings = youngestmonitors.concat(oldestmonitors);

  mymonitors.sort((a, b) => b.age - a.age)

  for (const monitor of mymonitors) {
    //console.error("start_mon "+ monitor.id.toString()+" ++ last: "+monitor.lastFetched )
    //console.log(JSON.stringify(monitor))
    const localnow=Date.now()
    const realdebounce=monitor.debounce||preset_debounce
    let displayname = monitor.name || monitor.id.toString();
    //let laststr=monitorMonth.lastCheck
    //let nowstr=

    const timediff=localnow-monitorMonth.lastFetched[monitor.id]
    const timesec=timediff/1000

    let do_request = false;
    let reasons="";

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
      const timediffcron=localnow-cronStarted
      const cronSeconds=timediff/1000
      if ( cronSeconds > 9 ) { 
      reasons=reasons+"+LimT"
      } else { 
      reasons=reasons+" "
      }
    }
    if (do_request) {
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
      const checkResponse = await fetch(monitor.url, init)
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
      const monitorStatusChanged = monitorMonth.operational[monitor.id] ? monitorMonth.operational[monitor.id] !== monitorOperational : false
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
      // Save monitor's last check response status
      monitorMonth.operational[monitor.id] = monitorOperational;
    }
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
            } catch (error) {
        console.log("redis_resp_err"+error)
      }
      requestTime = Math.round(performance.now() - requestStartTime)
      sentRequests=sentRequests+1
      monitorMonth.lastFetched[monitor.id]=localnow
    }
    if (do_request && config.settings.collectResponseTimes && monitorOperational) {
      // make sure location exists in current checkDay
      if (!monitorMonth.checks[checkDay].summery[checkLocation])
        monitorMonth.checks[checkDay].summery[checkLocation] = {}
      if (!monitorMonth.checks[checkDay].summery[checkLocation][monitor.id])
        monitorMonth.checks[checkDay].summery[checkLocation][monitor.id] = {
          n: 0,
          ms: 0,
          a: 0,
        }

      // increment number of checks and sum of ms
      const no = ++monitorMonth.checks[checkDay].summery[checkLocation][monitor.id].n
      const ms = monitorMonth.checks[checkDay].summery[checkLocation][monitor.id].ms += requestTime

      // save new average ms
      monitorMonth.checks[checkDay].summery[checkLocation][monitor.id].a = Math.round(ms / no)

      // back online
      // if (monitorStatusChanged) {
      //   monitorMonth.monitors[monitor.id].incidents.at(-1)!.end = now;
      // }
    }

    res.ms[monitor.id] = monitorOperational ? requestTime : null
    if(monitorOperational) { monCountOkay=monCountOkay+1 } else { monCountDown=monCountDown+1 }

    // go dark
    // if (!monitorOperational && monitorStatusChanged) {
    //   monitorMonth.monitors[monitor.id].incidents.push({ start: now, status: checkResponse.status, statusText: checkResponse.statusText })
    //   const incidentNumber = monitorMonth.monitors[monitor.id].incidents.length - 1
    //   monitorMonth.monitors[monitor.id].checks[checkDay].incidents.push(incidentNumber)
    // }
  // end timediff
   } else {

    console.log(` [ ${counter} / ${monitorCount}  ] ( ${sentRequests} )  ${reasons} | NOT Checking ${displayname} ... last : ${monitorMonth.lastCheck} diff: ${timesec}`)

  }
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
  console.log("KV_write_1")
  await setKVMonitors(namespace,checkDay.slice(0, 7), monitorMonth)

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