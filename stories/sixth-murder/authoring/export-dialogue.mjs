export function dialogueOverview(characters) {
  return ['# The Sixth Murder — playable dialogue', '',
    'Generated from the current story. Gates describe when a question is available; recorded denials and admissions remain distinct.', '',
    ...characters.flatMap(character => [
      `## ${character.name} — ${character.id}`, '', `Location: ${character.location}`, '',
      `**${character.name}:** ${character.greeting}`, '',
      ...character.topics.flatMap(topic => topicOverview(character, topic)),
    ]),
  ].join('\n');
}

function topicOverview(character, topic) {
  const lines = [`### ${topic.label}`, '', `Topic: ${character.id}/${topic.id}`, ''];
  for (const key of ['requiresAll', 'requiresDeduction', 'requiresChoice', 'afterUnsuccessfulTopic', 'proof', 'proofAlternatives']) {
    if (topic[key] !== undefined) lines.push(`_${key}: ${JSON.stringify(topic[key])}_`, '');
  }
  lines.push(`**Investigator:** ${topic.ask}`, '');
  if (topic.documentId) lines.push(...responseOverview(character, topic.success));
  else {
    lines.push(`**${character.name}:** ${topic.claim}`, '');
    for (const choice of topic.choices) {
      lines.push(`#### Choice: ${choice.approach}`, '', `**Investigator:** ${choice.label}`, '',
        ...responseOverview(character, topic.responses[choice.approach]));
    }
  }
  lines.push(`_Wrong exhibit / fallback:_ ${topic.failure.text}`, '');
  return lines;
}

function responseOverview(character, response) {
  const turns = response.turns ?? [{ speaker: 'witness', text: response.text }];
  const lines = turns.flatMap(turn => [`**${turn.speaker === 'investigator' ? 'Investigator' : character.name}:** ${turn.text}`, '']);
  if (response.success === false) lines.push('_Unresolved; can return with evidence._', '');
  if (response.reward) lines.push(`_Records: ${response.reward}._`, '');
  if (response.choice) lines.push(`_Choice: ${JSON.stringify(response.choice)}_`, '');
  if (response.endsInterview) lines.push('_Ends the interview after the final line; the report still requires both players’ agreement._', '');
  return lines;
}
