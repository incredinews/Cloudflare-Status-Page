# Cloudflare-Status-Page
A website monitoring and status page application design to be deploy on cloudflare at no cost
Forked from [JH0project](https://github.com/JH0project/Cloudflare-Status-Page)  with google analytics removed and redeployment of the cron job when changing config
![image](https://github.com/JH0project/Cloudflare-Status-Page/assets/48591478/e16d12eb-1985-423f-b2f5-1af6695e3aec)

## Installing

### Website
1. Fork this repo
2. Go to Cloudflare Workers& Pages, Create an application, Pages, Connect to Git
3. add CF_API_TOKEN and CF_ACCOUNT_ID as action secret in github
4. Choose that repo
5. Change setting Build settings
    - Framework preset: `Next.js`
    - Build command: `cp -rv .yarn .yarnrc.yml yarn.lock site && node ./scripts/removeLocalDeps.js && cd site && yarn install --mode=update-lockfile && npx @cloudflare/next-on-pages@1`
    - Build output directory: `/site/.vercel/output/static`

   Environment variables (advanced)
    - NODE_VERSION `18`
6. Create and deploy
7. Go to Settings, Functions, Compatibility flags add `nodejs_compat`

Monitoring app
- Messure website response time at different locations
- Cloudflare Worker
- Cloudflare KV store

Status/Performance website
- Cloudflare Pages

### config generation

until external config loading is implemented, you may try e.g. :
```


```

and paste the resulting file 

Inspired by https://github.com/eidam/cf-workers-status-page and https://github.com/JH0project/Cloudflare-Status-Page
