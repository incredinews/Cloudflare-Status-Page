import { processCronTrigger } from './functions/cronTrigger.js'
import type { addEventListener as AddEventListener } from '@cloudflare/workers-types'
import { Client } from "pg";

/**
 * The DEBUG flag will do two things that help during development:
 * 1. we will skip caching on the edge, which makes it easier to
 *    debug.
 * 2. we will return an error message on exception in your Response rather
 *    than the default 404.html page.
 */
//@ts-ignore
const DEBUG = false;

// addEventListener('fetch', (event) => {
//   try {
//     event.respondWith(
//       handleEvent(event, require.context('./pages/', true, /\.js$/), DEBUG),
//     )
//   } catch (e) {
//     if (DEBUG) {
//       return event.respondWith(
//         new Response(e.message || e.toString(), {
//           status: 500,
//         }),
//       )
//     }
//     event.respondWith(new Response('Internal Error', { status: 500 }))
//   }
// })
interface Env {
  STATUS_PAGE: D1Database;
  DB_URL: string;
}

export default {  
  async scheduled(event, env, ctx) {
    console.log("sched_handler_init")
    //ctx.waitUntil(  (addEventListener as typeof AddEventListener)('scheduled', (event) => {
    //  console.log("fetch_hander_prcoc")
    //  event.waitUntil(processCronTrigger(event))
    //}));
    let mynamespace=await env.KV_STATUS_PAGE
    let mydatabase=await env.STATUS_PAGE
    //const someVariable = `"summary_%"`;
    //const stmt = await env.STATUS_PAGE.prepare("SELECT * FROM info WHERE id NOT like ?").bind(someVariable);
    ////const returnValue = await stmt.raw({columnNames:true});
    //const returnValue = await stmt.run();
    ////console.log(JSON.stringify(Response.json(returnValue)));
    //const responseobj=await Response.json(returnValue)
    //console.log(JSON.stringify(await Response.json(responseobj).length));
    //console.log(JSON.stringify(await Response.json(responseobj)));

    //console.log("FCK_CL0WNFL4RE")
    // THE BR*IND**D D*MB*F*CKS AT CLOWNFLARE DID NOT EVEN MANAGE TO MAKE THEIR CR*P d1 sh*tload queryable as in their own docs

    //const { results } = await env.STATUS_PAGE.prepare(
    //  "SELECT * FROM info WHERE id NOT like ?",
    //).bind("summary_%").run();
    //console.log("results: ", results);
    //console.log(JSON.stringify(results).length);
//CREATE TABLE uptime.ping (
//	ts bigint NOT NULL,
//	"day" varchar NOT NULL,
//	loc varchar NOT NULL,
//	ms json NOT NULL,
//	CONSTRAINT ping_pk PRIMARY KEY (ts)
//);
//CREATE TABLE uptime.info (
//	id varchar NOT NULL,
//	record json NOT NULL
//);

    const client = new Client(env.DB_URL);
    await client.connect();
    console.log("DB connected")
    const result = await client.query({
      text: "SELECT version();",
    });
    console.log(JSON.stringify(result));
//    const resp = Response.json(result.rows);
    const resultsel = await client.query({
      text: "SELECT * from info",

    });
    console.log(JSON.stringify(resultsel.rows));
  //  const respsel = Response.json(result.rows);
  
    // Close the database connection, but don't block returning the response
    ctx.waitUntil(client.end());
    await processCronTrigger(mynamespace,mydatabase,"sched",event)
    console.log("db closed")
  },
  async fetch(request, env, ctx) {
    console.log("fetch_handler_init")
    let mynamespace=await env.KV_STATUS_PAGE
    let mydatabase=await env.STATUS_PAGE
    await processCronTrigger(mynamespace,mydatabase,"fetch",request)
    //ctx.waitUntil(  (addEventListener as typeof AddEventListener)('scheduled', (request) => {
    //  console.log("fetch_hander_prcoc")
    //  event.waitUntil(processCronTrigger(request))
    //}));
    return new Response('DONE');
  },
}

