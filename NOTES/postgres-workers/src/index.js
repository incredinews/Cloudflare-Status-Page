/**
 * Welcome to Cloudflare Workers!
 *
 * This is a template for a Scheduled Worker: a Worker that can run on a
 * configurable interval:
 * https://developers.cloudflare.com/workers/platform/triggers/cron-triggers/
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Run `curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"` to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import { Client } from "pg";

export default {
	async fetch(req) {
		const url = new URL(req.url)
		url.pathname = "/__scheduled";
		url.searchParams.append("cron", "* * * * *");
		return new Response(`To test the scheduled handler, ensure you have used the "--test-scheduled" then try running "curl ${url.href}".`);
	},

	// The scheduled handler is invoked at the interval set in our wrangler.jsonc's
	// [[triggers]] configuration.
	async scheduled(event, env, ctx) {
		// A Cron Trigger can make requests to other endpoints on the Internet,
		// publish to a Queue, query a D1 Database, and much more.
		//
		// We'll keep it simple and make an API call to a Cloudflare API:
//		let resp = await fetch('https://api.cloudflare.com/client/v4/ips');
//		let wasSuccessful = resp.ok ? 'success' : 'fail';
    if(!env.DB_URL) { 
		console.log("ERROR: no DB_URL")
		return "FAIL";
	}
	//console.log(env.DB_URL)
	let pgtarget="NONE"
    if(env.DB_URL!="HYPERDRIVE") {
		console.log("pg:// native client - local_dev or hosted wrangler")
        //const client = new Client(env.DB_URL);
		pgtarget=env.DB_URL
	} else {
		console.log("pg:// hyperdrive client - cf edge")
         //const client = new Client({connectionString: env.HYPERDRIVE.connectionString})
		 pgtarget={connectionString: env.HYPERDRIVE.connectionString}
	}
	//console.log(pgtarget)
	const client = new Client(pgtarget)
    await client.connect();
    console.log("DB connected")
    const resultsel = await client.query({
      text: "SELECT * FROM public.info WHERE id NOT LIKE 'summary_%';SELECT * from ping;SELECT version();",
    });
    console.log("res2: (len: " + resultsel.length +")" )
	console.log(JSON.stringify(resultsel));
	//const stmt = 'INSERT INTO info(id, record) VALUES($1, $2) RETURNING *'
	const stmt = 'INSERT INTO info(id, record) VALUES($1, $2) ON CONFLICT (id) DO UPDATE SET record = $2 RETURNING id'
	
    //const values = ['aaaa', 'ababa']
    
    // async/await
    try {
	  const myfoo={"bar": "f000"}
      const res = await client.query(stmt, [ "testme111" , JSON.stringify(myfoo)  ])
      console.log(res.rows[0])
      // { name: 'brianc', email: 'brian.m.carlson@gmail.com' }
    } catch (err) {
      console.log(err.stack)
    }

    //console.log(JSON.stringify(resultsel.rows));
  //  const respsel = Response.json(result.rows);
  
    // Close the database connection, but don't block returning the response
    ctx.waitUntil(client.end());
    console.log("db closed")
		// You could store this result in KV, write to a D1 Database, or publish to a Queue.
		// In this template, we'll just log the result:
		console.log(`trigger fired at ${event.cron}:`);
	},
};
