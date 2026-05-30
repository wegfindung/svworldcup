import type { Pool, PoolClient } from 'pg'

// A query executor that is either the pool (auto-commit, one statement per checkout) or a checked-out
// client (used to run several statements inside one BEGIN/COMMIT transaction). Repository write
// methods accept an optional Queryable so a caller can thread them all onto one transactional client
// — see ScoringRepository.withFixtureLock and services/matchPromotion.ts.
export type Queryable = Pool | PoolClient
