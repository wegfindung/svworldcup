const prizeUsernameCorrectionParticipantIds = new Set([
  'fe3ec70b-89e5-483f-89ac-44763f4c49e3', // Lumipee
  'e531754c-02af-40cf-812c-2826c6e4112c', // Francris23
  '4b49a9f5-a042-4f81-a9f3-6cb85331e5fb', // Gimbap
  'b3a039e2-d433-459f-a38b-7047558d930d', // micapitanrsg
  'e39bc436-418f-47b9-92c6-78d3a059b9af', // Yabenavi
])

export function canCorrectPrizeSoccerverseUsername(participantId: string) {
  return prizeUsernameCorrectionParticipantIds.has(participantId)
}
