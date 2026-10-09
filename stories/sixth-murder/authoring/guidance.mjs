const lead = (id, title, detail, evidence, target = {}, hints = [], gate = {}) => ({ id, title, detail, completeWhen: { evidence }, ...target, hints, ...gate });
const person = (character, location) => ({ character, location });
const object = (hotspot, location) => ({ hotspot, location });
const finding = (id, title, detail, hints, gate = {}) => ({ id, title, detail, completeWhen: { deduction: id }, hints, ...gate });
const known = (...requiresAll) => ({ requiresAll });

const room = finding('room-to-yard', 'Make your first connection', 'Could Nora have been moved from her room? Gather physical observations and ask Baines about the bedding. Then connect two relevant exhibits on this board.', [
  'Inspect the bed and rug in Nora’s room, then open the trunk in the rear yard and lift the clothing. Ask Baines about the bedding and inspect the service landing.',
  'Once Hale’s discovery, Baines’s bedding identification and the service route are recorded, connect the room disturbance with the trunk interior. Drag between their pins, or select one pin and then the other.',
], known('hale-discovery'));
const trunk = finding('trunk-movement', 'Follow the trunk’s movement', 'Compare the trunk with Baines’s account of the man on the steps. Her account has limits: record what she saw, without assuming who the man was.', [
  'Baines must feel safe before discussing the night. Ask about the disturbance, arrange protection with Hale, then return to her.',
  'After establishing movement from room to yard, connect Baines’s account of the trunk being carried with the trunk interior.',
], { requiresDeduction: 'room-to-yard' });
const sequence = finding('disturbance-sequence', 'Reconstruct Baines’s night', 'Inspect her window and hear what happened before she hid. Compare her accounts to arrange the events.', [
  'Ask Baines what she heard, about the man on the steps, and why she hid. Inspect the landing and window.',
  'Connect the disturbance she heard with her account of the trunk. Put the disturbance first, the trunk movement next, and hiding last.',
], { requiresDeduction: 'room-to-yard' });
const marriage = finding('concealed-marriage', 'Check Arthur’s relationship to Nora', 'Compare his account with independent evidence from someone who knew Nora.', [
  'Ask Arthur about his relationship to Nora. Find Maggie through Baines or the work correspondence in Nora’s room.',
  'Ask Maggie to identify the marriage and share her photograph. Connect the complete wedding photograph with Arthur’s claim to be Nora’s brother.',
], known('arthur-brother', 'workshop-lead'));
const candle = finding('candlestick-origin', 'Trace the object in the cart', 'The cart is a hiding place. Establish where the recovered object came from and who could reach the cart.', [
  'Inspect the coal sacks, then ask Baines about the recovered candlestick and overnight access to the cart.',
  'Connect the recovered candlestick with Baines’s identification after recording cart access.',
], known('cart-candlestick'));
const edition = finding('report-edition', 'Identify the burned paper', 'Compare the hearth remains with the newspaper still at the Lantern.', [
  'Inspect the paper in the hearth and read the newspaper in the common room.',
  'Connect the burned report with the inn’s newspaper.',
]);
const knife = finding('false-knife', 'Check the apparent weapon', 'Compare Hale’s recovery with the medical examination.', [
  'You need Hale’s knife recovery and Alden’s medical findings.',
  'Connect the courtyard knife with the medical findings. Distinguish the fatal injury from later wounds.',
]);
const staging = finding('staged-resemblance', 'Compare the discovery with the illustration', 'Consider the arrangement in the yard in light of the medical findings and the newspaper.', [
  'Identify the report edition first. George’s discovery account, the knife recovery and the medical findings also matter.',
  'Connect the inn’s newspaper with Hale’s discovery. This supports an inference about staging; it does not identify the killer by itself.',
], { requiresDeduction: 'report-edition' });

export const guidance = [
  {
    introduction: 'This evening is an introduction to the Lantern, not a murder investigation. Complete the three conversations below. Other conversations and objects are optional. When all three are recorded, choose “Retire for the evening” here. In co-op, both detectives must agree.',
    leads: [
      lead('rooms', 'Arrange your rooms with Baines', 'Speak about the reserved rooms and confirm the arrangements.', ['lodging-arranged'], person('baines-arrival', 'lantern-common'), ['Choose “The reserved rooms”, then the response about taking the rooms.']),
      lead('journey', 'Ask Nora about her journey', 'Find out where she is going and why her luggage is ready.', ['nora-plans'], person('nora', 'lantern-common'), ['Choose “Her journey to Bristol”, then ask her about the journey.']),
      lead('collection', 'Ask George about collecting the trunk', 'Meet him in the common room and establish the morning collection.', ['collection-arranged'], person('george-arrival', 'lantern-common'), ['Choose “His evening’s work”, then ask about the morning collection.']),
    ],
  },
  {
    introduction: 'Begin with Hale in the common room. Your first question is whether Nora was moved from her room. Inspect objects, collect accounts, then connect evidence on this board. New leads appear as you learn more; optional conversations are never a requirement just because they remain available.',
    leads: [
      lead('hale', 'Hear Hale’s discovery and instructions', 'Ask what he found and arrange a private search before examining the yard.', ['hale-discovery', 'hale-private-recovery', 'courtyard-knife'], person('hale', 'lantern-common'), ['Ask “What Hale found”, “Keep the search private” and “The knife Hale recovered”.']),
      lead('room', 'Inspect Nora’s room', 'Look closely at the bed, rug and travel papers. The work correspondence can lead you to someone who knew Nora.', ['room-disturbance', 'travel-papers'], { location: 'nora-room' }, ['Inspect both the bed and displaced rug. Read the travelling papers and work correspondence.'], known('hale-discovery')),
      lead('trunk', 'Inspect the trunk', 'Look beneath the packed clothing in the rear yard.', ['trunk-interior'], object('trunk-interior', 'lantern-yard'), ['Open the trunk, then lift the clothing.'], known('hale-private-recovery')),
      lead('bedding', 'Ask Baines about the bedding', 'See whether she recognises what you found inside the trunk.', ['blanket-identification'], person('baines', 'baines-room'), ['Choose “The trunk’s bedding”.'], known('trunk-interior')),
      lead('route', 'Inspect the service landing', 'Check the route between Nora’s room and the yard, including what Baines could see.', ['service-route', 'window-view'], object('service-route', 'baines-room'), ['Inspect both the landing and the view from the window.'], known('hale-discovery')),
      room,
      lead('safety', 'Help Baines feel safe enough to speak', 'Ask about last night. If she is afraid, arrange protection with Hale and return to her.', ['baines-reassured'], person('baines', 'baines-room'), ['Ask “Return to last night”. Then ask Hale to “Keep watch for Baines” and tell Baines a constable is keeping watch.'], { requiresDeduction: 'room-to-yard' }),
      trunk, sequence,
      lead('george', 'Record George’s discovery', 'Ask what he found this morning. Separate what he saw from what he assumed.', ['george-discovery'], person('george', 'lantern-yard'), ['Choose “This morning’s arrival”.'], known('hale-discovery')),
      lead('arthur', 'Record Arthur’s visit and trunk account', 'Ask about his relationship, last night’s visit and the trunk. Return to his account after hearing Baines.', ['arthur-visit', 'arthur-trunk-reply'], person('arthur-inn', 'lantern-common'), ['Ask about his relationship, visit and whether he moved the trunk. After Baines describes the man, use “The man with the trunk” to follow up.'], { requiresDeduction: 'room-to-yard' }),
      lead('cart', 'Search the cart privately', 'Examine the sacks after agreeing with Hale to keep the search private.', ['cart-candlestick'], object('cart-candlestick', 'lantern-yard'), ['Inspect the sacks and lift the covering sack. In co-op, bring both detectives to the yard if the inspection asks you to.'], known('hale-private-recovery')),
      candle,
      lead('medical', 'Hear Alden’s findings', 'Get the medical account before drawing conclusions about the apparent attack.', ['medical-findings'], person('alden', 'alden-workroom'), ['Ask about Alden’s examination.'], { requiresDeduction: 'room-to-yard' }),
      lead('friend', 'Find someone who knew Nora', 'Ask Baines about Nora’s friend or read the work correspondence in Nora’s room.', ['workshop-lead'], person('baines', 'baines-room'), ['Choose “Someone who knew Nora”.'], { requiresDeduction: 'room-to-yard' }),
      lead('maggie', 'Speak privately to Maggie', 'Earn her cooperation, ask about Nora’s marriage and photograph, then why she was living at the Lantern.', ['maggie-separation'], person('maggie', 'shaw-workshop'), ['Begin with “Nora’s friend”. Ask about the marriage, photograph and why Nora was at the Lantern.'], known('workshop-lead')),
      marriage,
      lead('address', 'Have Hale verify the address', 'Follow up the address Maggie has supplied before seeking a search.', ['address-verified'], person('hale', 'lantern-common'), ['Choose “Verify Arthur’s lodgings”.'], known('maggie-separation')),
    ],
  },
  {
    introduction: 'Search the secured lodging. Earlier rooms and witnesses remain available. Make the three comparisons below before returning to the station; the two detectives must agree to continue in co-op.',
    leads: [
      lead('hearth', 'Inspect the hearth remains', 'Examine both the cloth and the paper in the cold hearth.', ['hearth-clothing', 'burned-report'], object('hearth-clothing', 'vale-room'), ['Inspect the surface, then the cloth and the paper.']),
      lead('paper', 'Read the Lantern’s newspaper', 'Find the complete illustration and report in the common room.', ['inn-newspaper'], object('inn-newspaper', 'lantern-common')),
      lead('medical', 'Review the medical and recovery records', 'The knife recovery and medical findings are retained from the morning. Ask Alden for his examination if needed.', ['courtyard-knife', 'medical-findings'], person('alden', 'alden-workroom')),
      edition, knife, staging,
    ],
  },
  {
    introduction: 'Use the collected evidence to test Arthur’s account. The evidence record preserves what he actually says, including denials. Start with the marriage and work through the leads as they open. Further admissions after the required questions are optional.',
    leads: [
      lead('relationship', 'Establish the relationship', 'Put the complete photograph to Arthur.', ['station-relationship'], person('arthur-station', 'station-interview'), ['Choose the marriage topic, select the complete wedding photograph as your exhibit, and use the response that presents it.']),
      lead('trunk', 'Test his trunk account', 'Return to the account he gave at the inn and ask about the contents.', ['station-trunk'], person('arthur-station', 'station-interview'), ['Choose the available trunk topic. You can ask for details or present the trunk interior.']),
      lead('fire', 'Ask what he burned', 'Hear his explanation of the hearth remains.', ['station-fire'], person('arthur-station', 'station-interview'), ['Choose “What he burned”.']),
      lead('visit', 'Return to his visit and departure', 'Ask how he found Nora, why he visited, and his account of leaving.', ['station-room'], person('arthur-station', 'station-interview'), ['Follow “How he found Nora”, “Why he went to see Nora” and “His account of leaving”.'], known('station-relationship', 'station-trunk')),
      lead('recovery', 'Ask about the recovered object', 'Listen carefully to what Arthur volunteers. Avoid supplying details he should account for himself.', ['arthur-candlestick-slip'], person('arthur-station', 'station-interview'), ['Use “The recovered candlestick”. Let Arthur describe what he knows before you question its source.'], known('station-room', 'station-fire')),
      finding('unshared-detail', 'Check Arthur’s knowledge', 'Compare his volunteered description with the private recovery record.', ['Connect Arthur’s candlestick statement with the cart recovery.'], known('arthur-candlestick-slip')),
      lead('source', 'Check his claimed source with Hale', 'Ask Arthur how he heard about the recovery, then check that explanation with Hale.', ['arthur-source-claim', 'hale-disclosure-check'], { location: 'station-interview' }, ['After the knowledge finding, ask Arthur “Where he heard about the recovery”, then ask Hale to check the claimed source.'], { requiresDeduction: 'unshared-detail' }),
      finding('source-excuse', 'Compare the source accounts', 'Does the checked account support Arthur’s explanation?', ['Connect Arthur’s source claim with Hale’s disclosure check.'], known('hale-disclosure-check')),
      lead('knowledge', 'Put the checked source to Arthur', 'Return to Arthur with the contradiction established on the board.', ['station-knowledge'], person('arthur-station', 'station-interview'), ['Choose “Hale has checked his claim” and press for an explanation.'], { requiresDeduction: 'source-excuse' }),
      lead('cause', 'Put the medical findings to Arthur', 'Test his account against the fatal injury.', ['station-cause'], person('arthur-station', 'station-interview'), ['Choose “What actually killed Nora”, select the medical findings and present them.'], known('station-knowledge')),
      lead('yard', 'Ask about the newspaper illustration', 'Compare his account of the yard with the newspaper findings. Then review your report.', ['station-yard'], person('arthur-station', 'station-interview'), ['Choose “The newspaper illustration”. Further admissions are optional once the report is ready.'], known('station-cause')),
      ...[room, trunk, sequence, marriage, candle, edition, knife, staging],
    ],
  },
  {
    introduction: 'Return to the people affected by the case. Speak to Maggie about Nora’s sister, then close the enquiry here. Reading the letter is optional.',
    leads: [lead('sister', 'Speak to Maggie about Nora’s sister', 'Give her room to explain what happens next.', ['closing-addressed'], person('maggie-closing', 'lantern-common'), ['Choose “A letter to Bristol”.'])],
  },
];
