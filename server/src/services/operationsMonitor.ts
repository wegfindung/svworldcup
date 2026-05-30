import { randomUUID } from 'node:crypto'

export type OperationEventType =
  | 'email_scheduler'
  | 'soccerverse_api'
  | 'influence_snapshot'
  | 'participant_risk'
export type OperationEventStatus = 'ok' | 'warning' | 'error'

export interface OperationEventInput {
  type: OperationEventType
  status: OperationEventStatus
  message: string
  detail?: Record<string, unknown>
}

export interface OperationEvent extends OperationEventInput {
  eventId: string
  createdAt: string
  detail: Record<string, unknown>
}

const maxEvents = 200
const events: OperationEvent[] = []

export function recordOperationEvent(input: OperationEventInput) {
  const event: OperationEvent = {
    eventId: randomUUID(),
    type: input.type,
    status: input.status,
    message: input.message,
    detail: input.detail ?? {},
    createdAt: new Date().toISOString(),
  }

  events.unshift(event)
  if (events.length > maxEvents) {
    events.length = maxEvents
  }

  return event
}

export function listOperationEvents(limit = 50) {
  return events.slice(0, limit)
}
