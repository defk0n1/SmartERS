// Demo runner: orchestrates a quick demo flow using REST endpoints
// - Logs in as operator to get token
// - Creates an incident
// - Dispatches nearest ambulance (autoSelect)
// - Simulates driver location updates along a short path

import axios from 'axios'
import { io } from 'socket.io-client'

const BUSINESS_URL = process.env.BUSINESS_API_URL || 'http://localhost:5000'

async function login(email, password) {
  const { data } = await axios.post(`${BUSINESS_URL}/api/auth/login`, { email, password })
  return data.accessToken
}

async function createIncident(token, { description, latitude, longitude, severity = 'high' }) {
  const { data } = await axios.post(
    `${BUSINESS_URL}/api/incidents`,
    {
      description,
      severity,
      location: { type: 'Point', coordinates: [longitude, latitude] }
    },
    { headers: { Authorization: `Bearer ${token}` } }
  )
  return data
}

async function dispatchNearest(token, incidentId) {
  const { data } = await axios.post(
    `${BUSINESS_URL}/api/incidents/dispatch`,
    { incidentId, autoSelect: true },
    { headers: { Authorization: `Bearer ${token}` } }
  )
  return data.incident
}

async function simulateDriverViaSocket(ambulanceId, path) {
  const socket = io(BUSINESS_URL, { transports: ['websocket', 'polling'] })
  await new Promise(res => socket.on('connect', res))
  socket.emit('join:ambulance', ambulanceId)
  for (const p of path) {
    socket.emit('driver:locationUpdate', {
      ambulanceId,
      location: { latitude: p.latitude, longitude: p.longitude },
      driverId: 'demo-driver'
    })
    const delayMs = parseInt(process.env.DEMO_UPDATE_INTERVAL_MS || '2000', 10)
    await new Promise(r => setTimeout(r, delayMs))
  }
  socket.disconnect()
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function run() {
  try {
    console.log('Logging in as operator...')
    const token = await login('sarah.op@smarters.com', 'operator123')

    console.log('Creating demo incident...')
    const incident = await createIncident(token, {
      description: 'Demo: Person with chest pain near Central Park',
      latitude: 40.7829,
      longitude: -73.9654,
      severity: 'high'
    })
    console.log('Incident created:', incident._id)

    console.log('Dispatching nearest ambulance...')
    const dispatched = await dispatchNearest(token, incident._id)
    const ambId = typeof dispatched.assignedAmbulance === 'string' 
      ? dispatched.assignedAmbulance 
      : dispatched.assignedAmbulance?._id
    console.log('Dispatched ambulance:', {
      _id: ambId,
      plateNumber: dispatched.assignedAmbulance?.plateNumber,
      driver: dispatched.assignedAmbulance?.driver,
      status: dispatched.assignedAmbulance?.status
    })

    console.log('Simulating driver location updates...')
    // Short 5-step path towards the incident
    const path = [
      { latitude: 40.7750, longitude: -73.9800 },
      { latitude: 40.7780, longitude: -73.9730 },
      { latitude: 40.7805, longitude: -73.9690 },
      { latitude: 40.7818, longitude: -73.9665 },
      { latitude: 40.7829, longitude: -73.9654 }
    ]

    await simulateDriverViaSocket(ambId, path)
    console.log('Driver location updates streamed via Socket.IO')

    console.log('Demo flow complete. Check frontend for real-time updates.')
  } catch (err) {
    console.error('Demo run failed:', err.response?.data || err.message)
    process.exit(1)
  }
}

run()
