import { createApp } from '../server/app.js'

const ready = createApp(process.env)

export default async function handler(req, res) {
  const { app } = await ready
  return app(req, res)
}

export const config = {
  api: { bodyParser: false },
  maxDuration: 60
}
