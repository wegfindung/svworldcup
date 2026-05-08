import { env } from './config/env.js'
import { createApp } from './app.js'

const app = createApp()

app.listen(env.PORT, () => {
  console.log(`SV World Cup server listening on :${env.PORT}`)
})
