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
export async function processCronTrigger( namespace: KVNamespace, statusdb: Env, pgtarget: string,  trigger, event: ScheduledEvent, ctx: context ) {
  let log_verbose=true
  let log_errors=true
  if(log_verbose) { console.log("cron_function_init "+trigger) }
  // Get Worker PoP and save it to monitorMonthMetadata
//  const checkLocation = await getCheckLocation()
  // the first went to fetch location
  let sentRequests=0;
  let now = Date.now()
  const cronStarted = now

  //console.log("init_1_lastFetched")
  //console.log(JSON.stringify(monitorMonth))

const checksPerRound=42
const checksPerSubrequest=42
const preset_debounce = config.debounce || (  42 + ( config.monitors.length * 3 )  ) 
const minChecksPerRound=6

//monitorMonth.checks[checkDay].summary

let timediffglobal=now-monitorMonth.lastCheck
  //console.log("selecting")
let selectresjson=await env.UPTIMEFETCHER.selectMonitors(  pgtarget  ,log_verbose ,log_errors, checksPerRound , checksPerSubrequest )
let selectres=JSON.parse(selectresjson)
///console.log(JSON.stringify(selectres))
if(selectres.log!="") {
  console.log(selectres.log.replaceAll("@CRLF@","\n"))
}
if(selectres.err!="") {
  console.log(selectres.log.replaceAll("@CRLF@","\n"))
}
//console.log(JSON.stringify(selectres.mon))
let monitorMonth: MonitorMonth = selectres.statusObject
let mymonitorbatches=selectres.mon
let counter=1
console.log("sorted_and_ready: "+selectres.count.toString()+" / "+selectres.total.toString()+" batches: "+selectres.batches+" | version: COMMITSHA | COMMITMSG | ")

if( mymonitorbatches.length > 0 ) {
  //let checkoutput=""
  //async checkMonitors( monitorMonthjson: string,mymonitorsjson: string ,myconfigjson: string ,log_verbose: boolean , log_errors: boolean ) { 
  // console.log("sending")
//      const allpromises=[]
      for (const mymonitors of mymonitorbatches) {   
        cronSeconds=(Date.now()-cronStarted) /1000 
        if(cronSeconds<32)  {
          let sendconfig=config
          sendconfig.monitors=mymonitors
     //     allpromises.push(env.UPTIMEFETCHER.checkMonitors(monitorMonth, JSON.stringify(config), log_verbose,log_errors, checkDay , monitorCount))
     // }
     // let promiseres=await Promise.allSettled(allpromises)
     // for (const thisres of promiseres) {  
     //    if(thisres.status=="fulfilled") {
                      // let result=thisres.value
                      //console.log(result.status) 
                       let subfetchresjson=await env.UPTIMEFETCHER.checkMonitors(monitorMonth, JSON.stringify(config), log_verbose,log_errors, checkDay , monitorCount ,checksPerSubrequest)
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
          } // end if crontime
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
