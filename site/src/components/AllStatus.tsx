"use client"

import React, { useEffect, useState } from 'react';
import type { MonitorMonth } from 'cf-status-page-types';
import { Paper, Skeleton, Stack, Typography } from '@mui/material';

export function AllStatus({ statusText, statusColorCode = '#2ecc71', lastCheck }: { statusText?: string, statusColorCode?: string, lastCheck?: number }) {
  return (
    <Paper elevation={5} style={{ padding: '2.5vh 2vw', margin: '0 0 5vh 0', backgroundColor: statusColorCode }}>
      <Stack direction="row" sx={{
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {statusText ? <Typography variant='h3' component='h1' style={{ color: '#fff', textAlign: 'left' }}>
          {statusText}
        </Typography > :
          <Skeleton variant='rectangular'>
            <Typography variant='h3' component='h1' style={{ color: '#fff', textAlign: 'left' }}>
              All Systems Operational
            </Typography >
          </Skeleton>
        }
        {lastCheck ? <Typography variant='body1' component='p' style={{ color: '#fff', textAlign: 'right' }}>
          {lastCheck} Seconds ago
        </Typography > : <Stack direction="row" spacing={0.5}>
          <Typography variant='body1' component='p' style={{ color: '#fff', textAlign: 'right' }}>
            <Skeleton variant="rectangular" width={30} />
          </Typography >
          <Typography variant='body1' component='p' style={{ color: '#fff', textAlign: 'right' }}>
            {lastCheck} Seconds ago
          </Typography >
        </Stack>}
      </Stack>
    </Paper>
  )
}


export default function AllStatusWithData({ operational, lastCheck, defaultNow }: { operational: MonitorMonth["operational"], lastCheck: number, defaultNow: number }) {
  const [now, setNow] = useState(defaultNow)

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 3456)
    return () => clearInterval(interval)
  }, [])
  const allOperational = Object.keys(operational).map((monitor) => operational[monitor]).every(v => v === true)
  const allOutage = Object.keys(operational).map((monitor) => operational[monitor]).every(v => v === false)
  console.log("countelem")
  let monCountDown=0;
  let monCountOkay=0;
  //console.log(JSON.stringify(operational))
  for (const countelm in Object.keys(operational)) {
    //console.log(JSON.stringify(countelm))
      if(operational[countelm]) { 
        monCountOkay=monCountOkay+1
      } else  { 
        monCountDown=monCountDown+1 }
  }
  let monCountAlive=0;
  return (
    <AllStatus statusText={allOperational ? 'All Systems Operational' : allOutage ? 'Major System Outage <br> ( Down: '+monCountDown.toString()+' )' : 'Partial System Outage <br> ( D: '+monCountDown.toString()+' | U : '+monCountOkay.toString()+' )' } statusColorCode={allOperational ? '#2ecc71' : allOutage ? '#e74c3c' : '#e67e22'} lastCheck={Math.round((now - lastCheck) / 1000)} />
  )
}