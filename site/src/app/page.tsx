"use client"

//import 'server-only'

import type { MonitorMonth } from 'cf-status-page-types'
import config from '../../../config.json'
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import Link from '@/components/Link';
import AllStatusWithData, { AllStatus } from '@/components/AllStatus';
import OverallResponseGraph from '@/components/OverallResponseGraph';
import UptimeGraph from '@/components/UptimeGraph';
import { useEffect, useState } from 'react';

export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"
//export const runtime = 'edge'

const getKvMonitors = async (key: string): Promise<MonitorMonth> => {
  //if (!process.env.KV_STATUS_PAGE)
  return fetch(`${config.settings.url}/api/kv/${key}`).then((res) => {
    if (res.ok) {
      return res.json()
    }
    throw new Error('Failed to fetch')
  });
  //const { KV_STATUS_PAGE } = (process.env as unknown as { KV_STATUS_PAGE: KVNamespace });
  //return KV_STATUS_PAGE.get("monitors_data_v1_1", { type: 'json' });
}

const getYearMonth = (date: Date) => {
  return date.toISOString().split('T')[0].slice(0, 7)
}


export default function Home() {
  const [data, setData] = useState<MonitorMonth>({
    checks: {},
    countText: "   ",
    lastCheck: 0,
    operational: {},
  })
  const [_dataLoaded, setDataLoaded] = useState([false, false, false])

  return <div>About</div><script>console.log("loaded")</script><div class="MuiStack-root mui-1ialerq"><h1 class="MuiTypography-root MuiTypography-h3 mui-il834h" style="color: rgb(255, 255, 255); text-align: left;">Loading</h1><p class="MuiTypography-root MuiTypography-body1 mui-gjwoc1" style="color: rgb(255, 255, 255); text-align: right;">51201 Seconds ago</p><p class="MuiTypography-root MuiTypography-body1 mui-gjwoc1" style="color: rgb(255, 238, 255); text-align: left;">  </p></div><div class="MuiContainer-root MuiContainer-maxWidthLg mui-9wvnva" id="contwrap"><div class="MuiBox-root mui-0"><h2 class="MuiTypography-root MuiTypography-h6 mui-8o9j4y" style="color: rgb(46, 204, 113);"><a class="MuiTypography-root MuiTypography-inherit MuiLink-root MuiLink-underlineHover mui-1vbt8lb" style="color:inherit" href="https://pages.cloudflare.com>No Monitors loaded</a><span style="float: right; color: rgb(59, 165, 92);">Unknwonw</span></h2><svg preserveAspectRatio="none" height="34" viewBox="0 0 448 34" style="width:100%"><rect height="34" width="0.6%" x="0" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="5" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="10" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="15" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="20" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="25" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="30" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="35" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="40" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="45" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="50" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="55" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="60" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="65" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="70" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="75" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="80" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="85" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="90" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="95" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="100" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="105" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="110" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="115" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="120" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="125" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="130" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="135" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="140" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="145" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="150" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="155" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="160" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="165" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="170" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="175" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="180" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="185" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="190" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="195" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="200" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="205" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="210" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="215" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="220" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="225" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="230" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="235" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="240" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="245" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="250" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="255" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="260" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="265" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="270" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="275" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="280" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="285" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="290" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="295" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="300" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="305" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="310" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="315" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="320" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="325" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="330" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="335" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="340" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="345" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="350" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="355" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="360" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="365" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="370" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="375" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="380" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="385" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="390" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="395" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="400" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="405" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="410" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="415" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="420" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="425" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="430" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="435" y="0" fill="#B3BAC5" class=""></rect><rect height="34" width="0.6%" x="440" y="0" fill="#3ba55c" class=""></rect><rect height="34" width="0.6%" x="445" y="0" fill="#B3BAC5" class=""></rect></svg><div style="display:flex;color:#72767d"><p class="MuiTypography-root MuiTypography-body2 mui-a9oeij" style="flex:1 1 0;text-align:left">90<!-- --> days ago</p><div class="MuiDivider-root MuiDivider-fullWidth MuiDivider-withChildren mui-1xcpnia" role="separator" aria-orientation="horizontal" style="flex:2 1 0"><span class="MuiDivider-wrapper mui-c1ovea"><p class="MuiTypography-root MuiTypography-body2 mui-a9oeij">100<!-- --> % uptime</p></span></div><p class="MuiTypography-root MuiTypography-body2 mui-a9oeij" style="flex:1 1 0;text-align:right">Today</p></div><div style="height:20vh;width:100%"><div class="recharts-responsive-container" style="width:100%;height:100%;min-width:0"><div class="recharts-wrapper" style="position: relative; cursor: default; width: 852px; height: 113px;"><svg class="recharts-surface" width="852" height="113" style="width: 100%; height: 100%;" viewBox="0 0 852 113"><title></title><desc></desc><defs><clipPath id="recharts1-clip"><rect x="5" y="5" height="103" width="842"></rect></clipPath></defs><g class="recharts-cartesian-grid"><g class="recharts-cartesian-grid-horizontal"><line stroke="#ccc" fill="none" x="5" y="5" width="842" height="103" x1="5" y1="5" x2="847" y2="5"></line><line stroke="#ccc" fill="none" x="5" y="5" width="842" height="103" x1="5" y1="108" x2="847" y2="108"></line></g><g class="recharts-cartesian-grid-vertical"><line stroke="#ccc" fill="none" x="5" y="5" width="842" height="103" x1="5" y1="5" x2="5" y2="108"></line><line stroke="#ccc" fill="none" x="5" y="5" width="842" height="103" x1="847" y1="5" x2="847" y2="108"></line></g></g><g class="recharts-layer recharts-cartesian-axis recharts-xAxis xAxis"><g class="recharts-cartesian-axis-ticks"></g></g><g class="recharts-layer recharts-cartesian-axis recharts-yAxis yAxis"><g class="recharts-cartesian-axis-ticks"></g></g><g class="recharts-layer recharts-line"><path stroke="#82ca9d" name="SLC" stroke-width="1" fill="none" width="842" height="103" class="recharts-curve recharts-line-curve" d="M832.809,14.784Z"></path><g class="recharts-layer"></g></g><g class="recharts-layer recharts-line"><path stroke="#82ca9d" name="MEL" stroke-width="1" fill="none" width="842" height="103" class="recharts-curve recharts-line-curve" d="M832.809,5Z"></path><g class="recharts-layer"></g></g></svg><div tabindex="-1" class="recharts-tooltip-wrapper recharts-tooltip-wrapper-right recharts-tooltip-wrapper-bottom" style="visibility: hidden; pointer-events: none; position: absolute; top: 0px; left: 0px; transform: translate(317.742px, 47px);"><div class="recharts-default-tooltip" style="margin: 0px; padding: 10px; background-color: rgb(255, 255, 255); border: 1px solid rgb(204, 204, 204); white-space: nowrap;"><p class="recharts-tooltip-label" style="margin: 0px; color: rgb(0, 0, 0);">2025-06-19</p></div></div></div></div></div></div></div>


  
//  return (
//    <>
//      {data.lastCheck === 0 ?
//        <AllStatus /> :
//        <AllStatusWithData operational={data.operational} counterText={data.countText}  lastCheck={data.lastCheck} defaultNow={Date.now()} />}
//      <Paper elevation={5} style={{ padding: '5vh 0', margin: '5vh 0' }}>
//        <Container>
//          {config.monitors.map(({ id: monitorName, name, url, hidden }, i) =>
//            <Box key={i}>
//              {i !== 0 && <Divider style={{ margin: '2.5vh 0' }} />}
//              <Typography variant='h6' component='h2' style={{ color: data.operational[monitorName] ? '#2ecc71' : '' }}>
//                <Link style={{ color: 'inherit' }} underline='hover' href={ hidden ? config.settings.url : url }>
//                  {name}
//                </Link>
//                <span style={{ float: 'right', color: data.operational[monitorName] ? '#3BA55C' : '' }}>{data.operational[monitorName] ? 'Operational' : 'Outage'}</span>
//              </Typography >
//              <UptimeGraph checks={data.checks} monitorName={monitorName} key={monitorName} />
//              <div style={{ height: '20vh', width: '100%' }}>
//                <OverallResponseGraph checks={data.checks} monitorName={monitorName} />
//              </div>
//            </Box>
//          )}
//        </Container>
//      </Paper >
//    </>
//  )
}
