import config from '../../../config.json'
import type { ScheduledEvent } from '@cloudflare/workers-types'
import { MonitorMonth } from 'cf-status-page-types'
import { createRedis } from "redis-on-workers";
import { Client } from "pg";
import {
  getCheckLocation,
  getKVMonitors,
  setKVMonitors,
} from './helpers'
//import { env } from 'cloudflare:workers'
function getDate(time: number) {
  return new Date(time).toISOString().split('T')[0]
}
import { env } from 'cloudflare:workers'

//export async function processCronTrigger(namespace: KVNamespace,statusdb: Env, client: Client,  trigger, event: ScheduledEvent, ctx: context) {
export async function processCronTrigger(namespace: KVNamespace,statusdb: Env, pgtarget: string,  trigger, event: ScheduledEvent, ctx: context ) {
  let log_verbose=false
  let log_errors=true
  if(log_verbose) { console.log("cron_function_init "+trigger) }
  // Get Worker PoP and save it to monitorMonthMetadata
//  const checkLocation = await getCheckLocation()
  // the first went to fetch location
  let sentRequests=1;
  let now = Date.now()
  const cronStarted = now
  const checkDay = getDate(now)
  const lastDay = getDate(now - 86400000)
  const monthname=lastDay.slice(0, 7)
  const lastmonthame=checkDay.slice(0, 7)
  //let client;
//
  //function connect() {
  //    client = new Client(pgtarget);
  //    client.on('error', error => {
  //        // ⋮
  //        connect();
  //    });
  //    client.on('end', (client) => {
  //            console.log('PG:1:disconnect')
  //           connect();
  //    })
  //    return client.connect();
  //}
  //
  //connect();
  let client
  client = new Client(pgtarget);
  //const client = new Client(pgtarget)
  await client.connect();
  if (log_verbose) { console.log("DB connected") }
  client.on('error', (err) => {
          console.error('PG:something bad has happened:', err.stack)
        connect();
  })
  client.on('end', (client) => {
                if (log_verbose) {  console.log('PG:1:disconnect') }
             connect();
  })
  ///let pginit="SELECT * FROM info WHERE id NOT LIKE 'summary_%'; SELECT * FROM info WHERE id = 'summary_"+monthname+"'  ;SELECT * FROM info WHERE id LIKE 'summary_"+monthname+"-%' ORDER BY id desc limit 3; delete from ping where  ms::text = '{}'  ;"
  let pginit="SELECT * FROM info WHERE id NOT LIKE 'summary_%'; SELECT * FROM info WHERE id = 'summary_"+monthname+"'  ; delete from ping where  ms::text = '{}'  ;"
  if( log_verbose ) { console.log(" asking db: "+pginit) }
  const resultsel = await client.query({
      text: pginit,
    });
  await client.end()
if(log_verbose) {  console.log("db_incoming: (len: " + resultsel.length +")" ) }
	//console.log(JSON.stringify(resultsel[0].forw));

// dump results per row
//for (const dbelem of resultsel) {
//  // code block to be executed
////  console.log(JSON.stringify(await dbelem));
//  console.log("DB_RES_"+dbelem.command+" rows: "+dbelem.rowCount )
//  if (dbelem.rowCount > 0 && dbelem.command != "DELETE") { 
//    for (const thisrow of dbelem.rows) {
//      console.log(JSON.stringify(thisrow))
//    }
//  }
//}

  // Get monitors state from KV
  
  //if (log_verbose) {   console.log("KV_read_1")  }
  //let monitorMonth: MonitorMonth = await getKVMonitors(namespace,monthname)
  //// Create empty state objects if not exists in KV storage yet
  //// the second went to fetch kv once
  //sentRequests=3;
  //if (!monitorMonth) {
  //if (log_verbose) {   console.log("KV_read_2_generate_monitor_month")  }
  //  const lastMonitorMonth: MonitorMonth = await getKVMonitors( namespace, lastmonthame)
  //// the third went to fetch kv again
  //sentRequests=4;
  //  monitorMonth = {
  //    lastCheck: now,
  //    operational: lastMonitorMonth ? lastMonitorMonth.operational : {},
  //    checks: {}
  //    //incidents: {},
  //  }
  //}
  // do not use KV , fill it from postgresql
  let monitorMonth: MonitorMonth = {
    lastCheck: now,
    operational: {},
    checks: {}
    //incidents: {},
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
  //const res: {
  //  t: number
  //  l: string
  //  ms: {
  //    [index: string]: number | null
  //  }
  //} = { t: now, l: checkLocation, ms: {} }
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

  if (log_verbose) {   console.log("init_1_monitors loaded") }
  if (!Object.hasOwn(monitorMonth, "lastFetched")) {
    monitorMonth.lastFetched={}
  }

//parse info from db
let dbreclog=""
if (resultsel.length > 0) {
  if(resultsel[0].rowCount>0) {
    for (const myrow of resultsel[0].rows ) {
      //console.log(myrow)
      if(Object.hasOwn(myrow,"id")) {
        // console.log("hit :"+myrow["id"])
        if(["lastCheck","info","operational","lastFetched"].includes(myrow["id"])) {
        dbreclog=dbreclog+"|found db record:"+myrow["id"]
          if(myrow["id"]=="lastCheck") {
            monitorMonth["lastCheck"]=myrow["record"]["ts"] 
          } else { 
            monitorMonth[myrow["id"]]=myrow["record"]
          }
          //monitorMonth.lastFetched=myrow.record
        }
      }
    }
  }
}

//parse month summary from db
if (resultsel.length > 1) { // 2 queries
  if(resultsel[1].rowCount>0) { 
    for (const myrow of resultsel[1].rows ) {
      //console.log(myrow)
      if(Object.hasOwn(myrow,"id")) {
        // console.log("hit :"+myrow["id"])
        if(("summary_"+monthname)==myrow["id"]) {
        dbreclog=dbreclog+"|found db summary:"+myrow["id"]
          //monitorMonth[myrow["id"]]=myrow["record"]
          monitorMonth.checks[checkDay].summary=myrow["record"]
        }
      }
    }
  }
}
if(dbreclog!="") {
  console.log(dbreclog)
}
//const preset_debounce = config.debounce || 345 
const checksPerRound=12
const preset_debounce = config.debounce || (  42 + ( config.monitors.length * 3 )  ) 
const minChecksPerRound=6

//monitorMonth.checks[checkDay].summary

let timediffglobal=now-monitorMonth.lastCheck
  //console.log("selecting")
  let selectresjson=await env.UPTIMEFETCHER.selectMonitors( monitorMonth ,  JSON.stringify(config), log_verbose ,log_errors, checksPerRound )
  let selectres=JSON.parse(selectresjson)
  //console.log("selected")
  let mymonitorbatches=selectres.mon
  let counter=1
  console.log("sorted_and_ready: "+selectres.count.toString()+" / "+config.monitors.length.toString()+" | version: COMMITSHA | COMMITMSG | ")
  if( mymonitorbatches.length > 0 ) {
  //let checkoutput=""
  //async checkMonitors( monitorMonthjson: string,mymonitorsjson: string ,myconfigjson: string ,log_verbose: boolean , log_errors: boolean ) { 
  // console.log("sending")
//      const allpromises=[]
      for (const mymonitors of mymonitorbatches) {        
          let sendconfig=config
          sendconfig.monitors=mymonitors
     //     allpromises.push(env.UPTIMEFETCHER.checkMonitors(monitorMonth, JSON.stringify(config), log_verbose,log_errors, checkDay , monitorCount))
     // }
     // let promiseres=await Promise.allSettled(allpromises)
     // for (const thisres of promiseres) {  
     //    if(thisres.status=="fulfilled") {
                      // let result=thisres.value
                      //console.log(result.status) 
                       let subfetchresjson=await env.UPTIMEFETCHER.checkMonitors(monitorMonth, JSON.stringify(config), log_verbose,log_errors, checkDay , monitorCount)
                      //console.log(subfetchresjson)
                      let subfetchres=JSON.parse(subfetchresjson)
                      //let subfetchres=JSON.parse(thisres.value)
                      let checkoutput=subfetchres.checkoutput.replaceAll("@CRLF@",'\n')
                      if(checkoutput!="") {
                       console.log(checkoutput)
                      }
                      const res: {
                                t: number
                                l: string
                                ms: {
                                  [index: string]: number | null
                                }
                              } = { t: now, l: "FAILED", ms: {} }
                      try {
                          res=subfetchres.res
                      } catch (error) {
                          console.error("RETURN_RES NOT PARSED ");console.error(error)
                      }
                      let parseline=""
                      try {
                    
                        //   monitorMonth=subfetchres.fullObj
                         //let FetchedMonitorMonth=subfetchres.fullObj
                            parseline=parseline+"+incM"
                         if (subfetchres.fullObj.checks[checkDay].incidents.length > 0) {
                          monitorMonth.checks[checkDay].incidents=monitorMonth.checks[checkDay].incidents.concat(subfetchres.fullObj.checks[checkDay].incidents)
                         }
                         for (const fetchedmonid of subfetchres.monitors) { 
                            parseline=parseline+"+op"
                            monitorMonth.operational[fetchedmonid]=subfetchres.fullObj.operational[fetchedmonid]
                            parseline=parseline+"+lf"
                            monitorMonth.lastFetched[fetchedmonid]=subfetchres.fullObj.lastFetched[fetchedmonid]
                            parseline=parseline+"+if"
                            monitorMonth.info[fetchedmonid]=subfetchres.fullObj.info[fetchedmonid]
                            //parseline=parseline+"+in"
                            //if (subfetchres.fullObj.monitors[fetchedmonid].incidents.length > 0) { 
                            //  monitorMonth.monitors[fetchedmonid].incidents=subfetchres.fullObj.monitors[fetchedmonid].incidents
                            //}
                            parseline=parseline+"+sum"
                            if(!Object.hasOwn(monitorMonth.checks[checkDay].summary, subfetchres.loc)) {
                              monitorMonth.checks[checkDay].summary[subfetchres.loc]={}
                            }
                            monitorMonth.checks[checkDay].summary[subfetchres.loc][fetchedmonid]=subfetchres.fullObj.checks[checkDay].summary[subfetchres.loc][fetchedmonid]
                         }
                         //monitorMonth.
                      } catch (error) {
                              console.error("RETURN_OBJ NOT PARSED |"+parseline);console.error(error)
                      }
                      monCountDown=subfetchres.down
                      monCountOkay=subfetchres.up
                      monitorMonth.checks[checkDay].res.push(res)
                      monitorMonth.lastCheck = now
                    
                    //  if(monCountDown==monitorCount) { 
                    //      monitorMonth.countText=' ( Down: '+monCountDown.toString()+' )'
                    //  } else {
                    //    if(monCountOkay==monitorCount) {
                    //      monitorMonth.countText="   "
                    //    } else { 
                    //      monitorMonth.countText='( Down: '+monCountDown.toString()+' | Up : '+monCountOkay.toString()+' )'
                    //    }
                    //
                    //  }
                    
                      // Save monitorMonth to KV storage
                      ////localnow=Date.now()
                      ////timediffcron=localnow-cronStarted
                      //cronSeconds=(Date.now()-cronStarted) /1000
                      //console.log("KV_write_FIN crontime:"+cronSeconds.toString()+" s")
                      //await setKVMonitors(namespace,monthname, monitorMonth)
                       cronSeconds=(Date.now()-cronStarted) /1000
                       console.log("00_start_FIN crontime:"+cronSeconds.toString()+" s")
                    
                    	//const stmt = 'INSERT INTO info(id, record) VALUES($1, $2) RETURNING *'
                    	const pgstmtinfo = 'INSERT INTO info(id, record) VALUES($1, $2) ON CONFLICT (id) DO UPDATE SET record = $2 RETURNING id'
                    	const pgstmtping = 'INSERT INTO ping(ts, day, loc, ms) VALUES($1, $2,$3,$4) ON CONFLICT (ts) DO NOTHING RETURNING ts'
                        //const values = ['aaaa', 'ababa']
                      client = new Client(pgtarget);
                      //const client = new Client(pgtarget)
                      let pgres={}
                      await client.connect();
                      if (log_verbose) { console.log("DB connected") }
                      client.on('error', (err) => {
                              console.error('PG:something bad has happened:', err.stack)
                            connect();
                      })
                      client.on('end', (client) => {
                                  console.log('PG:2:disconnect')
                                 //connect();
                      })
                    
                        // async/await
                        try {
                    	    //const myfoo={"bar": "f000"}
                          //const res = await client.query(stmt, [ "testme111" , JSON.stringify(myfoo)  ])
                          pgres["info"] = await client.query(pgstmtinfo, [ "info" , JSON.stringify(monitorMonth.info)  ])
                          pgres["lack"] = await client.query(pgstmtinfo, [ "lastCheck" , JSON.stringify({"ts": monitorMonth.lastCheck })  ])
                          pgres["lfet"] = await client.query(pgstmtinfo, [ "lastFetched" , JSON.stringify(monitorMonth.lastFetched)  ])
                          pgres["oper"] = await client.query(pgstmtinfo, [ "operational" , JSON.stringify(monitorMonth.operational)  ])
                          pgres["summ"] = await client.query(pgstmtinfo, [ "summary_"+checkDay , JSON.stringify(monitorMonth.checks[checkDay].summary) ])
                          pgres["summ"] = await client.query(pgstmtinfo, [ "summary_"+monthname , JSON.stringify(monitorMonth.checks[checkDay].summary) ])
                          pgres["ping"] = await client.query(pgstmtping, [ res.t,checkDay, res.l, JSON.stringify(res.ms) ])
                          //console.log(res.rows[0])
                          //console.log(JSON.stringify(pgres["info"].rows[0])+JSON.stringify(pgres["lack"].rows[0])+JSON.stringify(pgres["lfet"].rows[0])+JSON.stringify(pgres["oper"].rows[0])+JSON.stringify(pgres["ping"].rows[0]))
                          cronSeconds=(Date.now()-cronStarted) /1000
                          console.log("PG_write_FIN crontime:"+cronSeconds.toString()+" s | "+JSON.stringify(pgres["info"].rows[0])+JSON.stringify(pgres["lack"].rows[0])+JSON.stringify(pgres["lfet"].rows[0])+JSON.stringify(pgres["oper"].rows[0])+JSON.stringify(pgres["ping"].rows[0]))
                        const stmtinfo = await statusdb.prepare('INSERT INTO info (id, record) VALUES (?1, ?2)  ON CONFLICT(id) DO UPDATE SET record=?2')
                      const stmtrest = await statusdb.prepare('INSERT INTO ping (ts, day, loc, ms ) VALUES (?1, ?2, ?3,?4)  ON CONFLICT(ts) DO UPDATE SET ms=?4')
                      // second conflict should not happen since the worker runs only once
                      const dbResInfo = await statusdb.batch([
                        stmtinfo.bind("info",        JSON.stringify(monitorMonth.info)),
                        stmtinfo.bind("lastCheck",   JSON.stringify({"ts": monitorMonth.lastCheck })),
                        stmtinfo.bind("lastFetched", JSON.stringify(monitorMonth.lastFetched)),
                        stmtinfo.bind("operational", JSON.stringify(monitorMonth.operational)),
                        stmtinfo.bind("summary_"+checkDay, JSON.stringify(monitorMonth.checks[checkDay].summary)),
                        stmtinfo.bind("summary_"+monthname, JSON.stringify(monitorMonth.checks[checkDay].summary)),
                        stmtrest.bind(res.t,checkDay, res.l, JSON.stringify(res.ms))
                      ]);
                      //console.log(JSON.stringify(dbResInfo))
                      let donewritestring=""
                      for (const d_one_res of dbResInfo ) {
                        donewritestring=donewritestring+"|"+d_one_res["success"]+" "+d_one_res["meta"]["duration"].toString() + " LOC: "+d_one_res["meta"]["served_by_region"]
                      }
                      //if (donewritestring!="") {
                      //  console.log(donewritestring+" |")
                      //}
                      cronSeconds=(Date.now()-cronStarted) /1000
                    
                    
                      console.log("D1_write_FIN crontime:"+cronSeconds.toString()+" s | "+donewritestring)
                    //  const { dbresults } = await statusdb.prepare(
                    //        'select * from info where id NOT like "summary_%"',
                    //      ).raw();
                    
                    ///  const { dbresults } = await statusdb.prepare(
                    ///        'select * from info ',
                    ///      ).raw();
                    ///  console.log(typeof(dbresults))
                    ///  console.log("got:")
                    ///  console.log(JSON.stringify(await dbresults))
                    
                    
                    //////////////////////////////const someVariable = `"summary_%"`;
                    //////////////////////////////const stmt = await statusdb.prepare("SELECT * FROM info WHERE id NOT like ?").bind(someVariable);
                    //////////////////////////////const returnValue = await stmt.raw({columnNames:true});
                    ////////////////////////////////console.log(JSON.stringify(Response.json(returnValue)));
                    //////////////////////////////const responseobj=Response.json(returnValue)
                    //////////////////////////////
                    //////////////////////////////console.log(JSON.stringify(Response.json(responseobj).length));
                    //////////////////////////////console.log(JSON.stringify(Response.json(responseobj)));
                    
                      //const stmtgetinfo= await statusdb.prepare('select * from info where id="operational" or id="lastCheck" or id="info"')
                      //const stmtgetsumm= await statusdb.prepare('select * from info where id="summary_'+checkDay+'"')
                      //const stmtgetconf= await statusdb.prepare('select * from config where profile=0')
                      //const stmtgetall= await statusdb.prepare('select * from info where id="operational" or id="lastCheck" or id="info"')
                      //const resgetall=await stmtgetall.run()
                      //console.log("alldbres:")
                      //console.log(JSON.stringify(resgetall))
                      //console.log("alldbres..:")
                      //let allresjson=Response.json(resgetall)
                      //console.log(JSON.stringify(allresjson))
                      //const dbres= await statusdb.batch([
                      //  stmtgetinfo,
                      //  stmtgetsumm,
                      //  stmtgetconf
                      //])
                      //let resjson=Response.json(dbres)
                      //console.log("dbres:")
                      //console.log(JSON.stringify(resjson))
                    //
                        } catch (err) {
                          console.log(err.stack)
                        }
         // } else { console.log(JSON.stringify(thisres))  }
        } // end for mymonitors batches
  } else { console.log("no checks scheduled")}
  await client.end()
    //ctx.waitUntil(client.end());
  cronSeconds=(Date.now()-cronStarted) /1000
  console.log("cron_done crontime:"+cronSeconds.toString()+" s")
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
