import { createApp } from './app.js'

const { app, config } = await createApp(process.env)
app.listen(config.port, () => {
  console.log(`Easy Digital Signatures listening on ${config.appUrl} (port ${config.port})`)
  console.log(`Auth ${config.authMode} · email ${config.emailMode} · SMS ${config.smsMode} · payments ${config.stripeMode}`)
})
