import { processCronTrigger } from './functions/cronTrigger.js'
import type { addEventListener as AddEventListener } from '@cloudflare/workers-types'

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


export default {  
  async scheduled(event, env, ctx) {
    console.log("sched_handler_init")
    //ctx.waitUntil(  (addEventListener as typeof AddEventListener)('scheduled', (event) => {
    //  console.log("fetch_hander_prcoc")
    //  event.waitUntil(processCronTrigger(event))
    //}));
    let mynamespace=await env.KV_STATUS_PAGE
    await processCronTrigger(mynamespace,"sched",event)
  },
  async fetch(request, env, ctx) {
    console.log("fetch_handler_init")
    await processCronTrigger(env,"fetch",request)
    //ctx.waitUntil(  (addEventListener as typeof AddEventListener)('scheduled', (request) => {
    //  console.log("fetch_hander_prcoc")
    //  event.waitUntil(processCronTrigger(request))
    //}));
    return new Response('DONE');
  },
}

