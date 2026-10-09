const facts = {
  'baines-arrival': {
    rooms: ['Baines has reserved two front rooms for Reed and Ellis; breakfast is at seven.', 'The front stairs lead to the rooms; Baines sleeps along the back passage beside Nora.'],
    candle: ['Baines is taking her heavy brass candlestick to Nora’s rear room.', 'Its loop handle was bent when it fell from a table years ago; Baines bought the blue candles because they were cheap.'],
  },
  nora: {
    work: ['Nora does sewing and alterations.', 'She is repairing Baines’s sleeve, which caught on a nail.'],
    journey: ['Nora intends to travel to Bristol on Saturday.', 'Her sister found her trial sewing work and a room nearby; Nora is uncertain about the work but intends to go.'],
    paper: ['Nora is unsettled by the newspaper’s accounts of the Whitechapel murders.', 'She does not know whether the reports are true.'],
  },
  'george-arrival': {
    collection: ['Baines paid George to carry Nora’s trunk the next morning; Nora will travel separately.', 'George leaves his coal cart in the yard overnight and takes the horse to its stable, returning with it in the morning.'],
  },
  hale: {
    discovery: ['George found Nora in the screened yard corner and fetched Hale.', 'Hale found a scarf already over her face, summoned Alden and secured the yard.', 'Nora was removed on a separate stretcher; the cart and trunk were not used and remain for examination. Alden is in the mortuary workroom.'],
    privacy: ['Arthur arrived after the removal and has remained with Hale at the front.', 'The rear passage is controlled; the yard search and the interviews with George and Baines are private, away from Arthur.', 'No recovery details have been discussed in Arthur’s hearing.'],
    knife: ['Hale recovered the knife lying openly beside Nora before the stretcher arrived and retains it wrapped for examination.', 'Its owner is unknown and its presence does not establish the cause of death.'],
    protection: ['A constable is now watching the back steps, visible from Baines’s window, throughout the enquiry.', 'Hale remains with Arthur at the front.'],
    address: ['An officer checked Bell’s boot-repair shop and its landlord confirms Arthur still occupies the upstairs room.', 'That verifies the address for a search; Hale does not know what a search will uncover.'],
  },
  george: {
    arrival: ['George brought the horse for the agreed trunk collection, left it outside and entered on foot.', 'Baines asked him to check on Nora; he found her in the screened corner and fetched Hale.', 'George says he did not move Nora or arrange her scarf.'],
    night: ['George says he left after the coal delivery and luggage arrangements, taking the horse to its stable; he gives no exact time.', 'He noticed no visitors, heard nothing inside, and says he did not return until morning; this is his account, not an independently verified alibi.'],
    candlestick: ['George denies knowing how the candlestick came to be under the sacks.', 'His cart stood in the yard all night; he found Nora before moving it.'],
  },
  baines: {
    visitor: ['Baines took a candlestick to Nora’s room the previous night and saw her packing, with clothes about.', 'Nora requested only a candle; George was due to collect her trunk in the morning. Baines does not identify a visitor.'],
    friend: ['Maggie Shaw worked with Nora and can be found at the workshop.'],
    disturbance: ['Baines is frightened that whoever harmed Nora might return once the police leave.', 'She fears the Whitechapel murderer, but this is fear rather than an identification.'],
    safety: ['The arranged constable’s watch reassures Baines enough to speak.', 'She wants to sit away from the passage and asks for the door to be shut.'],
    sounds: ['From her room Baines heard voices at the back, then a cry followed immediately by a thud.', 'She could not identify the speakers or make out the words, and stayed behind her closed door.'],
    trunk: ['Later Baines looked from her window and briefly saw a man carrying Nora’s trunk down the steps.', 'He faced away; she did not see his face and cannot identify him.'],
    hiding: ['Baines withdrew from the window and bolted her door because she was frightened.', 'She did not see the trunk’s contents or what happened behind the washhouse; nobody confronted or threatened her.'],
    'identify-man': ['Baines cannot identify the man or either voice; she did not see his face.', 'She cannot say he was Arthur, George or the Whitechapel murderer.'],
    blanket: ['Baines identifies the blanket from the trunk by its blue edging and darned corner.', 'She herself left that blanket on Nora’s bed; it was bed linen, not travelling linen.'],
    'missing-candle': ['Baines lent Nora a heavy brass candlestick with a bent loop handle and blue wax the previous night.', 'It is missing from its bedside place.'],
    'identify-candle': ['Baines identifies the recovered candlestick as her own, lent to Nora and left beside her bed, by its bent loop and blue wax.', 'She does not know who carried it into the yard or concealed it.'],
    cart: ['Baines arranged George’s paid luggage job; he left the cart after delivering coal and took the horse away.', 'The cart was unguarded overnight and anyone entering the yard could reach its sacks.'],
  },
  'arthur-inn': {
    relationship: ['Arthur claims to be Nora’s brother and asks about arranging her belongings.', 'He says he visited her the previous night. This is his claimed relationship, not the truth.'],
    visit: ['Arthur says he argued with Nora about Bristol, believing she was rushing into it.', 'He claims she was still packing when he left and cannot give an exact time.'],
    trunk: ['Arthur denies touching or moving Nora’s trunk.', 'He says Nora mentioned a carman called George and he saw a cart, but did not meet George.'],
    'trunk-followup': ['Arthur changes his account to acknowledge carrying the trunk downstairs the previous night.', 'He claims he was only helping with luggage while Nora remained in her room packing.'],
  },
  alden: {
    findings: ['Alden’s examination establishes that the blunt head injury killed Nora; the throat and abdominal knife wounds were inflicted after death.', 'He cannot name a unique weapon or offender or give an exact time of death. His written findings are available to the detectives.'],
    knife: ['The knife wounds were inflicted after death; the head injury was fatal.', 'Alden cannot identify a particular knife from the wounds.'],
    room: ['The room’s blood and the stained bedding support movement of Nora’s body when read with the discovery account.', 'Those findings do not identify whoever moved her.'],
    candle: ['The heavy candlestick is compatible with a blunt head injury.', 'Alden cannot uniquely identify it as the weapon; compatibility is not identification.'],
  },
  maggie: {
    privacy: ['Maggie helped Nora prepare to leave and had promised to keep quiet until she was away.', 'She needs reassurance that Arthur is not present before she will discuss Nora’s private affairs.'],
    work: ['Maggie and Nora worked together at the workshop table.', 'Nora worried about keeping up with the new sewing work in Bristol.'],
    brother: ['Arthur is Nora’s husband, not her brother; Maggie attended their wedding.', 'Maggie is Nora’s friend and fellow worker; Nora’s sister lives in Bristol.'],
    name: ['Finch was Nora’s family name before marriage; she wanted to use it again for her Bristol journey.', 'Arthur Vale is her husband.'],
    marriage: ['Nora married Arthur Vale and Maggie attended the wedding.', 'Maggie is a friend and fellow worker, not Nora’s sister.'],
    photograph: ['Maggie can hand over her complete wedding photograph showing Nora, her mother and Arthur on the right.', 'The reverse names Nora Finch and Arthur Vale and records their wedding date; this identifies their marriage.'],
    separation: ['Nora left Arthur after he took her wages and monitored where she went.', 'They had shared the upstairs room above Bell’s boot-repair shop off Commercial Road.', 'Maggie did not witness Nora’s death.'],
  },
  'arthur-station': {
    relationship: ['When confronted with the complete wedding photograph, Arthur acknowledges that Nora was his wife.', 'He says he claimed to be her brother because he feared police would stop looking for anyone else if they knew he was her husband.'],
    'trunk-helping': ['Arthur maintains that he carried the trunk only to help with Nora’s luggage and did not open it.', 'He claims Nora was still packing in her room.'],
    'trunk-disputing': ['Arthur maintains his denial of carrying the trunk, pointing out Baines did not see the man’s face.', 'He says he visited Nora, argued, and left; he denies knowing what happened to the trunk.'],
    fire: ['Arthur acknowledges burning things in his lodging’s hearth.', 'He claims he was clearing out worn-out clothes, rather than acknowledging destruction of evidence.'],
    'finding-nora': ['Arthur waited outside the workshop and followed Nora to the Lantern without her knowledge.', 'He says he learned about Bristol when he visited her room.'],
    departure: ['Arthur wanted Nora to return home; she had decided on Bristol and asked him to leave.', 'He stayed to argue and wanted her to hear him out; this acknowledges unwanted pressure, not the killing.'],
    room: ['Arthur maintains that he argued with Nora and left her packing, unhurt.', 'He suggests any cry and thud could have happened after he left.'],
    candlestick: ['Arthur deflects suspicion onto George and volunteers that the candlestick was hidden under the sacks in George’s cart.', 'He reveals that concealed location without first being told it by the detectives; he does not confess to killing Nora.'],
    source: ['Arthur claims an officer directly told him the candlestick’s hiding place, rather than that he overheard it.', 'He cannot name that officer.'],
    'source-rebuttal': ['Confronted with Hale’s checked account, Arthur cannot provide a credible source for his knowledge of the hidden candlestick.', 'He retreats to claiming somebody must have told him and he cannot remember; he still denies placing it there.'],
    cause: ['Confronted with the fatal blunt injury and post-mortem knife wounds, Arthur denies striking or killing Nora.', 'He insists that Baines did not see him hurt Nora.'],
    yard: ['Arthur acknowledges reading the newspaper but denies arranging Nora to imitate its illustration.', 'He suggests the detectives should pursue the murderer in the papers and claims not to know why Nora was arranged that way.'],
    'room-revisit': ['Arthur now admits taking Nora’s arm and claims she pulled away and struck the washstand.', 'He says he thought she was dead and did not summon help; this contradicts his earlier account of leaving her packing, but does not establish an accident as fact.'],
    purpose: ['Arthur admits putting Nora into the trunk and carrying her to the yard.', 'He admits covering her face with the scarf, claiming fear and an inability to look at her; he has not yet admitted imitation.'],
    disguise: ['Arthur admits hoping the arrangement would make police blame the other Whitechapel murderer.', 'He refuses to discuss the knife, maintains that Nora fell, and denies killing her; this is not a confession to the fatal blow.'],
  },
  'hale-station': {
    disclosure: ['Hale alone spoke to and escorted Arthur, apart from the detectives; he told him only that Nora had been found in the yard, never about the cart search.', 'The rear passage was shut, George and Baines were interviewed separately away from Arthur and neither spoke to him.', 'The removal men left before Arthur arrived; the yard constable and address officer kept away. No officer told Arthur where the candlestick was found.'],
  },
  'maggie-closing': {
    sister: ['Maggie is writing to Nora’s sister in Bristol about Nora’s preparations and sewing case.', 'The police are keeping Nora’s belongings safe pending release; Maggie can help with their return.'],
    letter: ['Maggie permits the detectives to read her letter, which says the enquiry is complete and the police will write.', 'It concerns Nora’s belongings, work and unfulfilled journey, and does not invent a confession.'],
  },
};

const conditions = {
  'baines-arrival/rooms': 'When the lodgers discuss their rooms, staying here, breakfast or finding their way upstairs.',
  'baines/disturbance': 'When investigators sensitively ask what is frightening her or probe her reluctance about that night. Pressure can make her evade.',
  'baines/safety': 'When the investigator credibly reassures her about the constable’s watch and privacy.',
  'maggie/privacy': 'When the investigator reassures Maggie that Arthur is not with them and she can speak privately. A greeting alone is insufficient.',
  'arthur-inn/trunk-followup': 'When the investigator follows up the independent sighting of the trunk and gives Arthur room to explain his earlier denial.',
  'arthur-station/candlestick': 'When the investigators mention recovering or examining the candlestick, or follow up his suspicion of George. Deflect blame by volunteering the hiding place without being told it. Never volunteer it during small talk.',
  'arthur-station/source': 'When asked how he knew the hiding place, defend himself by claiming an officer told him.',
  'arthur-station/room-revisit': 'When pressed with the room evidence and contradictions, he may offer an accidental-fall account to protect himself. Do not admit the fatal blow.',
  'arthur-station/disguise': 'When challenged with the newspaper resemblance after admitting movement and the scarf, he can concede diversion of suspicion while maintaining his denial of killing.',
};

export function knowledgeFor(character) {
  const entries = facts[character.id];
  if (!entries) throw new Error(`Missing knowledge profile for ${character.id}`);
  return character.topics.map(topic => {
    if (!entries[topic.id]) throw new Error(`Missing facts for ${character.id}/${topic.id}`);
    const { requiresAll, requiresDeduction, requiresChoice, requiresReport, requiresEvidence, afterUnsuccessfulTopic } = topic;
    const presented = topic.proof && (topic.correct === 'challenge' || ['blanket', 'identify-candle'].includes(topic.id));
    return { id: topic.id, topicId: topic.id, subject: topic.label, facts: entries[topic.id],
      when: conditions[`${character.id}/${topic.id}`] ?? `When the player's message or follow-up concerns ${topic.label.toLowerCase()}. Respect the character's motives; do not require a particular phrase.`,
      ...(requiresAll ? { requiresAll } : {}), ...(requiresDeduction ? { requiresDeduction } : {}),
      ...(requiresChoice ? { requiresChoice } : {}), ...(requiresReport !== undefined ? { requiresReport } : {}),
      ...(requiresEvidence ? { requiresEvidence } : {}), ...(afterUnsuccessfulTopic ? { afterUnsuccessfulTopic } : {}),
      ...(presented ? { requiresPresented: [topic.proof, ...topic.proofAlternatives ?? []] } : {}),
      ...(topic.success.reward ? { reward: topic.success.reward } : {}), ...(topic.success.choice ? { choice: topic.success.choice } : {}),
    };
  });
}
