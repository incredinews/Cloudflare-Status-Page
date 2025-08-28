import { WorkerEntrypoint } from "cloudflare:workers";
import { MonitorMonth } from './../../types/src/KvMonitors'
import { createRedis } from "redis-on-workers";
import { Client } from "pg";
import config from '../../config.json'
interface Env {
  STATUS_PAGE: D1Database;
  DB_URL: string;
}
import {
  getCheckLocation,
  getKVMonitors,
  setKVMonitors,
  md5
} from './../../poller/src/functions/helpers'
import { env } from 'cloudflare:workers'

function getDate(time: number) {
  return new Date(time).toISOString().split('T')[0]
}
export default class UptimeFetcher extends WorkerEntrypoint {
  async fetch() { return new Response(null, {status: 404}); }   // Currently, entrypoints without a named handler are not supported

  async postgrespush_statement( checkDay: string , cronStarted: number, log_verbose: boolean , log_errors: boolean , monitorMonth: MonitorMonth ,pingdata: string,originfostr: boolean,origoperationalstr: boolean, origsummstr: boolean,origlastfetchstr: boolean) {
    let monthname=checkDay.slice(0,7)
    let client
    let allres=JSON.parse(pingdata)
    let okay=true
    let writecount=0
    let pingstring=""
    let strend=""
    let cronSeconds=(Date.now()-cronStarted) /1000
      if(!env.DB_URL) { 
	      	console.log("ERROR: no DB_URL")
	      	return "FAIL";
	      }
	      //console.log(env.DB_URL)
	      let pgtarget="NONE"
          if(env.DB_URL!="HYPERDRIVE") {
	      	if(log_verbose) { console.log("pg://  native client  local_dev or hosted wrangler ") }
          strend="| pg://  native client  local_dev or hosted wrangler "
              //const client = new Client(env.DB_URL);
	      	pgtarget=env.DB_URL
	      } else {
	      	if(log_verbose) { console.log("pg:// hyperdrive client - cf edge") }
          strend="| pg:// hyperdrive client - cf edge "
               //const client = new Client({connectionString: env.HYPERDRIVE.connectionString})
	      	 pgtarget={connectionString: env.HYPERDRIVE.connectionString}
	      }
                            	//const stmt = 'INSERT INTO info(id, record) VALUES($1, $2) RETURNING *'
                    	const pgstmtinfo = 'INSERT INTO info(id, record) VALUES($1, $2) ON CONFLICT (id) DO UPDATE SET record = EXCLUDED.record RETURNING id'
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

                    	    //const myfoo={"bar": "f000"}
                          //const res = await client.query(stmt, [ "testme111" , JSON.stringify(myfoo)  ])
                          if(originfostr) {
                          pgres["info"] = await client.query(pgstmtinfo, [ "info" , info_as_str  ])
                          pingstring=pingstring+"+i"
                          writecount=writecount+1
                          }
                          if(origoperationalstr) {
                          pingstring=pingstring+"+o"
                          pgres["oper"] = await client.query(pgstmtinfo, [ "operational" , operationalstr  ]) 
                          writecount=writecount+1
                          }
                          pingstring=pingstring+"+lc"
                          pgres["lack"] = await client.query(pgstmtinfo, [ "lastCheck" , JSON.stringify({"ts": monitorMonth.lastCheck })  ])
                          writecount=writecount+1
                          if(origlastfetchstr) {
                          pingstring=pingstring+"+lf"
                          pgres["lfet"] = await client.query(pgstmtinfo, [ "lastFetched" , lastfetchstr  ])
                          writecount=writecount+1
                          }
                          if(origsummstr) {
                            //pgres["summ"] = await client.query(pgstmtinfo, [ "summary_"+checkDay  , summstr ])
                            pingstring=pingstring+"+s"
                            pgres["summ"] = await client.query(pgstmtinfo, [ "summary_"+monthname , summstr ])
                            let copystatement="INSERT INTO info(record, id) SELECT record,'"+"summary_"+checkDay+"' FROM info WHERE id='"+"summary_"+monthname+"' ON CONFLICT (id) DO update set record=EXCLUDED.record RETURNING id";
                            pgres["summd"] = await client.query({
                                text: copystatement,
                              })
                            writecount=writecount+2
                          }
                          //pgres["ping"] = await client.query(pgstmtping, [ res.t,checkDay, res.l, JSON.stringify(res.ms) ])
                          let rescount=1
                          for (const res of allres ) { 
                            if(JSON.stringify(res.ms)!='{}') {
                              writecount=writecount+1
                              pgres["ping_"+rescount.toString()] = await client.query(pgstmtping, [ res.t,checkDay, res.l, JSON.stringify(res.ms) ])
                              try {
                                 pingstring=pingstring+"|"+JSON.stringify(pgres["ping_"+rescount.toString()].rows[0] )
                              } catch (pstrerror) {
                                 console.log("pingstringerr: "+pstrerror)
                              }
                              rescount=rescount+1
                            }
                          }
                          //console.log(res.rows[0])
                          //console.log(JSON.stringify(pgres["info"].rows[0])+JSON.stringify(pgres["lack"].rows[0])+JSON.stringify(pgres["lfet"].rows[0])+JSON.stringify(pgres["oper"].rows[0])+JSON.stringify(pgres["ping"].rows[0]))
                          cronSeconds=(Date.now()-cronStarted) /1000
                          try {
                          //console.log("PG_write_FIN crontime:"+cronSeconds.toString()+" s | "+JSON.stringify(pgres["info"].rows[0])+JSON.stringify(pgres["lack"].rows[0])+JSON.stringify(pgres["lfet"].rows[0])+JSON.stringify(pgres["oper"].rows[0])+pingstring)
                          for (const residx in pgres) {
                            pingstring=pingstring+" |+p "+JSON.stringify(pgres[residx].rows[0])
                          }
                          pingstring="PG_write_FIN crontime:"+cronSeconds.toString()+" s | ops: "+writecount.toString()+" |"+pingstring
                          } catch (psqlreserr) { 
                            console.log("PG_ERR |"+pingstring );console.log(psqlreserr)
                          }
    return(JSON.stringify({"status": okay , "msg": pingstring+strend }))
  }
  async postgrespush_string( checkDay: string , cronStarted: number, log_verbose: boolean , log_errors: boolean , monitorMonth: MonitorMonth ,pingdata: string, originfostr: boolean,origoperationalstr: boolean, origsummstr: boolean,origlastfetchstr: boolean) {
    let monthname=checkDay.slice(0,7)
    let client
    let allres=JSON.parse(pingdata)
    let okay=true
    let writecount=0
    let pingstring=""
    let strend=""
    let cronSeconds=(Date.now()-cronStarted) /1000
    try {
      if(!env.DB_URL) { 
	      	console.log("ERROR: no DB_URL")
	      	return "FAIL";
	      }
	      //console.log(env.DB_URL)
	      let pgtarget="NONE"
          if(env.DB_URL!="HYPERDRIVE") {
	      	if(log_verbose) { console.log("pg://  native client  local_dev or hosted wrangler ") }
          strend="| pg://  native client  local_dev or hosted wrangler "
              //const client = new Client(env.DB_URL);
	      	pgtarget=env.DB_URL
	      } else {
	      	if(log_verbose) { console.log("pg:// hyperdrive client - cf edge") }
          strend="| pg:// hyperdrive client - cf edge "
               //const client = new Client({connectionString: env.HYPERDRIVE.connectionString})
	      	 pgtarget={connectionString: env.HYPERDRIVE.connectionString}
	      }
        let pgquery=""
                            	//const stmt = 'INSERT INTO info(id, record) VALUES($1, $2) RETURNING *'
                    	const pgstmtinfo = 'INSERT INTO info(id, record) VALUES($1, $2) ON CONFLICT (id) DO UPDATE SET record = EXCLUDED.record RETURNING id'
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

                    	    //const myfoo={"bar": "f000"}
                          //const res = await client.query(stmt, [ "testme111" , JSON.stringify(myfoo)  ])
                          if(originfostr) {
                          //pgres["info"] = await client.query(pgstmtinfo, [ "info" , info_as_str  ])
                          pgquery=pgquery+" ; "+pgstmtinfo.replace('$1',"'info'").replace('$2',"'"+info_as_str+"'")
                          pingstring=pingstring+"+i"
                          writecount=writecount+1
                          }
                          if(origoperationalstr) {
                          pingstring=pingstring+"+o"
                          //pgres["oper"] = await client.query(pgstmtinfo, [ "operational" , operationalstr  ]) 
                          pgquery=pgquery+" ; "+pgstmtinfo.replace('$1',"'oper'").replace('$2',"'"+operationalstr+"'")
                          writecount=writecount+1
                          }
                          pingstring=pingstring+"+lc"
                          //pgres["lack"] = await client.query(pgstmtinfo, [ "lastCheck" , JSON.stringify({"ts": monitorMonth.lastCheck })  ])
                          pgquery=pgquery+" ; "+pgstmtinfo.replace('$1',"'lastCheck'").replace('$2',"'"+JSON.stringify({"ts": monitorMonth.lastCheck })+"'")
                          writecount=writecount+1

                          if(origlastfetchstr) {
                          pingstring=pingstring+"+lf"
                          //pgres["lfet"] = await client.query(pgstmtinfo, [ "lastFetched" , JSON.stringify(monitorMonth.lastFetched)  ])
                          pgquery=pgquery+" ; "+pgstmtinfo.replace('$1',"'lastFetched'").replace('$2',"'"+JSON.stringify(monitorMonth.lastFetched)+"'")
                          writecount=writecount+1
                          }

                          let summstr=JSON.stringify(monitorMonth.checks[checkDay].summary)
                          if(origsummstr) {
                            //pgres["summ"] = await client.query(pgstmtinfo, [ "summary_"+checkDay  , summstr ])
                            
                            pingstring=pingstring+"+s"
                            pgres["summ"] = await client.query(pgstmtinfo, [ "summary_"+monthname , summstr ])
                            //pgquery=pgquery+" ; "+pgstmtinfo.replace('$1',"'summary_"+monthname+"'").replace('$2',"'"+summstr+"'")
                            //let copystatement="INSERT INTO info(record, id) SELECT record,'"+"summary_"+checkDay+"' FROM info WHERE id='"+"summary_"+monthname+"' ON CONFLICT (id) DO update set record=EXCLUDED.record RETURNING id";
                            //pgres["summd"] = await client.query({
                            //    text: copystatement,
                            //  })
                            pgquery=pgquery+" ; "+copystatement
                            writecount=writecount+2
                          }
                          //pgres["ping"] = await client.query(pgstmtping, [ res.t,checkDay, res.l, JSON.stringify(res.ms) ])
                          let rescount=1
                          for (const res of allres ) { 
                            if(JSON.stringify(res.ms)!='{}') {
                              writecount=writecount+1
                              //pgres["ping_"+rescount.toString()] = await client.query(pgstmtping, [ res.t,checkDay, res.l, JSON.stringify(res.ms) ])
                              pgquery=pgquery+" ; "+pgstmtping.replace('$1',"'"+res.t.toString()+"'").replace('$2',"'"+checkDay+"'").replace('$3',"'"+res.l.toString()+"'").replace('$4',"'"+JSON.stringify(res.ms)+"'")
                              ///try {
                              ///   pingstring=pingstring+"|"+JSON.stringify(pgres["ping_"+rescount.toString()].rows[0] )
                              ///} catch (pstrerror) {
                              ///   console.log("pingstringerr: "+pstrerror)
                              ///}
                              rescount=rescount+1
                            }
                          }
                          if(log_verbose) { console.log("PG_QUERY: "+pgquery) }
                          pingstring=pingstring+" @SEND@ "
                          let pgmainres = await client.query({
                                text: pgquery,
                              })

                          //console.log(res.rows[0])
                          //console.log(JSON.stringify(pgres["info"].rows[0])+JSON.stringify(pgres["lack"].rows[0])+JSON.stringify(pgres["lfet"].rows[0])+JSON.stringify(pgres["oper"].rows[0])+JSON.stringify(pgres["ping"].rows[0]))
                          cronSeconds=(Date.now()-cronStarted) /1000
                          try {
                          //console.log("PG_write_FIN crontime:"+cronSeconds.toString()+" s | "+JSON.stringify(pgres["info"].rows[0])+JSON.stringify(pgres["lack"].rows[0])+JSON.stringify(pgres["lfet"].rows[0])+JSON.stringify(pgres["oper"].rows[0])+pingstring)
                          for (const residx in pgmainres) {
                            if(Object.hasOwn(pgmainres[residx],"rows")) {
                              pingstring=pingstring+" |R: "+JSON.stringify(pgmainres[residx].rows[0])
                            } else {
                              pingstring=pingstring+" |R: "+JSON.stringify(pgmainres[residx])
                            }
                          }
                          for (const residx in pgres) {
                            if(Object.hasOwn(pgres[residx],"rows")) {
                              pingstring=pingstring+" |sR: "+JSON.stringify(pgres[residx].rows[0])
                            } else {
                              pingstring=pingstring+" |sR: "+JSON.stringify(pgres[residx])
                            }
                          }
                          pingstring="PG_write_FIN crontime:"+cronSeconds.toString()+" s | ops: "+writecount.toString()+" |"+pingstring
                          } catch (psqlreserr) { 
                            console.log("PG_ERR |"+pingstring );console.log(psqlreserr)
                          }
    return(JSON.stringify({"status": okay , "msg": pingstring+strend }))
    } catch (operationalerror) { 
      okay=false
    return(JSON.stringify({"status": okay , "msg": "DB_MAIN_ERR: operationalerror+" | "+pingstring }))
    }
  }
  async selectMonitors( log_verbose: boolean , log_errors: boolean , checksPerRound: number = 42 ,checksPerSubrequest: number = 14 ) { 
      //console.log("start_sel")
      if(!env.DB_URL) { 
	      	console.log("ERROR: no DB_URL")
	      	return "FAIL";
	      }
	      //console.log(env.DB_URL)
	      let pgtarget="NONE"
          if(env.DB_URL!="HYPERDRIVE") {
	      	console.log("pg://  native client  local_dev or hosted wrangler ")
              //const client = new Client(env.DB_URL);
	      	pgtarget=env.DB_URL
	      } else {
	      	console.log("pg:// hyperdrive client - cf edge")
               //const client = new Client({connectionString: env.HYPERDRIVE.connectionString})
	      	 pgtarget={connectionString: env.HYPERDRIVE.connectionString}
	      }
      try {
      let batchcount=0
      let sentRequests=1;
      let now = Date.now()
      const cronStarted = now
      const checkDay = getDate(now)
      const lastDay = getDate(now - 86400000)
      const monthname=lastDay.slice(0, 7)
      const lastmonthame=checkDay.slice(0, 7)
      let logline=""
      let errorline=""

      //let config = JSON.parse(myconfigjson)
      //let monitorCount=Object.keys(config.monitors).length
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
        const monitorCount=config.monitors.length
        let cronSeconds=0
        let timediffcron=0

  if (log_verbose) { console.log("init_1_vars_set") }

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
 // let counter=1;
  //let monCountDown = 0 ;
  //let monCountOkay = 0 ;
//  let monitorCount=Object.keys(config.monitors).length
  //let cronSeconds=0
  //let timediffcron=0
  //console.log("init_1_vars_set")
  if (!Object.hasOwn(monitorMonth, 'info')) {
                        monitorMonth["info"]={}
     }

  if (log_verbose) {   console.log("init_1_monitors loaded") }
  if (!Object.hasOwn(monitorMonth, "lastFetched")) {
    monitorMonth.lastFetched={}
  }
  if (log_verbose) {   console.log("init_1_parse_db_info") }
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
  if (log_verbose) {   console.log("init_2_parse_db_sum") }
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
        //console.log("mons:"+monitorCount.toString() +"/"+Object.keys(config.monitors).length.toString()+dbreclog)
        logline=logline+'@CRLF@'+" | "+dbreclog
      }
      //const preset_debounce = config.debounce || 345 
     // let monitorCount=config.monitors.length
      console.log("Total monitors: "+monitorCount)
      let localnow=Date.now()
      //let sentRequests=1;
      const defaultlastfetch=localnow-999999999
      //let counter=1;
      const preset_debounce = config.debounce || (  42 + ( Object.keys(config.monitors).length * 3 )  ) 
      //const minChecksPerRound=6
      let gomonitors=[]
      //console.log("start_for")
      for (const monitor of config.monitors) {
          let localnow=Date.now()
          let cronSeconds=(localnow-cronStarted)/1000
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
          if( (timesec+10) < realdebounce  ) {
            do_request=false;
            reasons="+t"
          } else { 
            reasons="+T"
            do_request=true
          }
          //subrequest limiter
          if(gomonitors.length > 42 ) {
            reasons=reasons+"+LimR"
            do_request=false
          } 
          if(do_request) {
            let mymonitor=monitor
            mymonitor.lastFetched=monitorMonth.lastFetched[monitor.id]
            gomonitors.push(mymonitor)
          } else {
              //  console.log(` [ ${counter} / ${monitorCount}  ].( ${sentRequests} )  ${reasons} | NOT Checking ${displayname} .| lastFetch: ${timesec} s ago dbounce: ${realdebounce} @ time : ${monitorMonth.lastCheck/1000} .| crontime: ${cronSeconds} `) 
              logline=logline+'@CRLF@'+` [ ${counter} / ${monitorCount}  ].( ${sentRequests} )  ${reasons} | NOT Checking ${displayname} .| lastFetch: ${timesec} s ago dbounce: ${realdebounce} @ time : ${monitorMonth.lastCheck/1000} .| crontime: ${cronSeconds} `
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
          //console.log("end_for")
          //console.log("init_2_monitors_filtered:"+gomonitors.length.toString())
          
          //const allpings = youngestmonitors.concat(oldestmonitors);
          gomonitors.sort((a, b) => a.lastFetched - b.lastFetched)
          //console.log("start_batch")
          let mymonitors=[]
          let thisbatch=[]
          let mybatchsize=checksPerRound
          if(checksPerRound<11 ) { mybatchsize= 11 }
          batchcount=1
          for (const monitor of gomonitors) {
            if(batchcount < 3) {
              thisbatch.push(monitor)
              if(thisbatch.length > mybatchsize ) { 
                mymonitors.push(thisbatch)
                thisbatch=[]
                batchcount=batchcount+1
                } 
            }

          }
          return JSON.stringify({ "statusObject": monitorMonth ,"mon": mymonitors,"log": logline , "err": errorline, count: counter , total: monitorCount, batches: batchcount  } )
      } catch (error) {
        console.error(error)
        return JSON.stringify({ "statusObject": monitorMonth ,"mon": {},"log": logline+"@CRLF@"+error , "err": error , count: counter , total: monitorCount, batches: batchcount  } )
      }
  }

  async checkMonitors( monitorMonth: MonitorMonth,myconfigjson: string ,log_verbose: boolean , log_errors: boolean , checkDay: string , monitorCount: number ,checksPerRound: number) { 
  //let monitorMonth: MonitorMonth =
  let monitorids = []
  let logline=""
  let errline=""
  //let monitorMonth: MonitorMonth = JSON.parse(monitorMonthjson)
  //let mymonitors: MonitorMonth = JSON.parse(mymonitorsjson)
  // the worker doesnt know all incidentes
  monitorMonth.checks[checkDay].incidents=[]

  let config = JSON.parse(myconfigjson)
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
  //let checksPerRound=13
  for (const monitor of mymonitors) {

    monitorids.push(monitor.id)
    //console.error("start_mon "+ monitor.id.toString()+" ++ last: "+monitor.lastFetched )
    //console.log(JSON.stringify(monitor))
    let localnow=Date.now()
    const defaultlastfetch=localnow-999999999
    if (!Object.hasOwn(monitorMonth.lastFetched, monitor.id)) {
    monitorMonth.lastFetched[monitor.id]=defaultlastfetch
    }
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
      if ( cronSeconds > 14  ) { 
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
      //logline=logline+'@CRLF@'+` [ ${counter} / ${monitorCount}  ] ( ${sentRequests} )  ${reasons} |     Checking ${displayname} checkd: ${timesec} s ago | last time: ${monitorMonth.lastCheck}`
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
