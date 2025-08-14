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


const getYearMonth = (date: Date) => {
  return date.toISOString().split('T')[0].slice(0, 7)
}

export default function Home() {

  return <div>About</div>
 
}