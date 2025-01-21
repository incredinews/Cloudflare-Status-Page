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
  // the first went to fetch kv
  let sentRequests=1;
  let monitorCount=config.monitors.length
  for (const monitor of config.monitors) {
    console.error("start_mon")
    console.log(JSON.stringify(monitor))
    const localnow=Date.now()
    const realdebounce=monitor.debounce||preset_debounce
    let displayname = monitor.name || monitor.id;
    //let laststr=monitorMonth.lastCheck
    //let nowstr=
    let timediffglobal=now-monitorMonth.lastCheck
    if (!monitorMonth.lastFetched[monitor.id]) {
      monitorMonth.lastFetched[monitor.id]=localnow-999999999
    }
    const timediff=localnow-monitorMonth.lastFetched[monitor.id]
    const timesec=timediff/1000

    let do_request = false;
    let reasons="";

    if( timesec > realdebounce  ) {
      do_request=true;
      reasons="T"
    } else { 
      reasons="t"
    }
    //subrequest limiter
    if(sentRequests > 42 ) {
      reasons=reasons+"F"
      do_request=false
    } else {
      reasons=reasons+" "
    }
    if (do_request) {
      console.log(` [ ${counter} / ${monitorCount}  ] ( ${sentRequests} )  ${reasons} |     Checking ${displayname} ... last time: ${monitorMonth.lastCheck} diff: ${timediff}`)
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
          'User-Agent': config.settings.user_agent || 'cf-workers-status-poller',
        },
      }
      // Perform a check and measure time
      const requestStartTime = performance.now()
      const checkResponse = await fetch(monitor.url, init)
      requestTime = Math.round(performance.now() - requestStartTime)
      sentRequests=sentRequests+1
      // Determine whether operational and status changed
      monitorOperational = checkResponse.status === (monitor.expectStatus || 200)
      // const monitorStatusChanged = monitorMonth.operational[monitor.id] ? monitorMonth.operational[monitor.id] !== monitorOperational : false
  
      // Save monitor's last check response status
      monitorMonth.operational[monitor.id] = monitorOperational;
      //check for full text
      if (monitor.matchText && monitorOperational) {
        //const results = await gatherResponse(checkResponse)
        let mytxt=await checkResponse.text();
        if( mytxt.includes(monitor.matchText)  ) { 
          monitorMonth.operational[monitor.id] = true;
          monitorOperational = true;
        } else {
          console.log("STR NOT FOUND "+monitor.matchText);
          monitorMonth.operational[monitor.id] = false;
          monitorOperational = false;
        }
      }
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

  // Save monitorMonth to KV storage
  console.log("KV_write_1")
  await setKVMonitors(namespace,checkDay.slice(0, 7), monitorMonth)

  return new Response('OK')
}
