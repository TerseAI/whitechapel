export const characters = [
  npc('baines-arrival', 'Mrs Baines', 'Keeper of the Lantern', 'lantern-common', 'baines', 'Mr Reed and Mr Ellis? Come in out of the cold. Hale said to expect you.', [
    t('rooms', 'The reserved rooms', 'That’s us. Thank you for putting us up.', 'You’ve the two rooms at the front. Breakfast’s at seven. Will you be wanting it earlier?', {
      reassure: b('Seven will suit us nicely, thank you. Which way’s upstairs?', ['Through there, then up the front stairs. If you need anything, my room’s down the back passage, beside Nora’s.', 'And if we’re out early, shall we go round the back?', 'Best use the front. George is coming for Nora’s trunk in the morning. You’ll only be in each other’s way.'], 'lodging-arranged'),
      press: b('Don’t trouble yourself if we’re off before then. We won’t disturb anyone leaving early, will we?', ['You’ll be all right at the front. We sleep round the back. Just pull the door to gently when you go.', 'We’ll mind the door. I hope Hale gave you enough notice?', 'Enough to get the beds made. He said there’d be two of you, and here you are.'], 'lodging-arranged'),
    }),
    t('candle', 'The bedside candle', 'Where are you taking that candlestick?', 'Nora’s room, out the back. She needs a candle.', { reassure: b('Is the handle meant to bend like that?', ['Certainly not. It was knocked from a table years ago. The blue candles were cheap, so blue candles she shall have.']) }),
  ]),
  npc('nora', 'Nora Vale', 'Needleworker', 'lantern-common', 'nora', 'There’s room here. Mind the pins.', [
    t('work', 'The sleeve she is mending', 'We’re not keeping you from your work?', 'It’s Mrs Baines’s sleeve. She caught it on a nail and made it worse trying to get free.', {
      reassure: b('Can you mend it?', [
        'Nearly done. Though I did tell her the nail wants seeing to as well.',
        'Do you sew for a living?',
        'Yes. Mostly alterations. I’m starting at another place on Monday.',
      ], 'nora-work'),
    }, { failure: 'Sorry, what did you want to know?' }),
    t('journey', 'Her journey to Bristol', 'Are you travelling tomorrow?', 'Yes. Bristol. My sister’s found me work and a room near hers. The work’s a trial, anyway.', {
      reassure: b('Have you bought your ticket?', [
        'Yes. There’s no putting it off now.',
        'Not looking forward to it?',
        'Seeing my sister, yes. Walking into a room full of women who’ve worked together for years… I’ll be glad when the first day’s over.',
        'Have you much to take?',
        'One trunk. George is taking it to the station. My sewing things will come with me. I’d rather keep hold of those.',
      ], 'nora-plans'),
    }, { failure: 'Sorry, did you mean the journey or the work?' }),
    t('paper', 'The newspaper beside her', 'Something on your mind?', 'Have you read this?', {
      reassure: b('Some of it.', [
        'Is there any truth in this? About the murders?',
        'Which part?',
        'They make it sound as though he could walk into any street, kill another woman, then simply walk away.',
        'I wouldn’t take every word in that paper for the truth.',
        'Mrs Baines reads every word. Then she tells me I shouldn’t worry.',
        'Do you have far to walk after work?',
        'Not far. Far enough when there’s nobody about. Last night I heard someone behind me and crossed the road. It was a woman from the workshop.',
        'Could you walk together?',
        'We did, after that. She’d been trying to catch me up. Neither of us fancied walking alone.',
        'Will your sister meet you?',
        'She’s already said she will. I’ve had two letters telling me where to stand.',
        'Best stand there, then.',
        'I shall. She’ll never let me hear the end of it otherwise. There. Mrs Baines can have her arm back.',
      ]),
    }, { requiresAll: ['nora-plans'], failure: 'I’m asking whether they’ve got it right in the paper.' }),
  ]),
  npc('george-arrival', 'George Moss', 'Carman', 'lantern-common', 'george', 'Mind the step. There’s coal all over it.', [
    t('collection', 'His evening’s work', 'Busy evening?', 'Just finishing. Mrs Baines wanted the coal brought in, and now she’s found me another job for the morning.', {
      reassure: b('Oh?', [
        'A trunk to the station. One of her lodgers is off to Bristol.',
        'An early start, then?',
        'Early enough. I’m leaving the cart here tonight. Just got to take the horse back to his stable.',
        'Save yourself a journey?',
        'Save dragging the cart round again, anyway. I’ll bring the horse over in the morning and fetch the trunk down.',
        'We’d best keep out of your way.',
        'You’ll hear me coming. Especially if it’s as heavy as Mrs Baines says.',
        'Good night, then.',
        'Good night, gentlemen.',
      ], 'collection-arranged'),
    }, { failure: 'Sorry, what was that?' }),
  ]),
  npc('hale', 'Constable Hale', 'Metropolitan Police', 'lantern-common', 'hale', 'Inspectors. Arthur is waiting here with me. A constable is keeping the yard clear.', [
    handover('discovery', 'What Hale found', 'Who found her?', 'hale-discovery', [
      'George Moss, the carman. He came for her trunk this morning. Found her in the yard and came straight for me.',
      'Where exactly?',
      'Beyond the washhouse. You can’t see the corner until you come into the yard.',
      'What did you find when you got here?',
      'She was lying there with her scarf across her face. I sent for Dr Alden.',
      'Did Moss put the scarf there?',
      'He says it was already like that. Says he hadn’t touched it.',
      'Where is she now?',
      'At the mortuary. Alden examined her in the yard first, then we brought a stretcher.',
      'What did he say?',
      'That she was dead. He wanted a proper examination before saying any more. He’s expecting you at his workroom.',
      'And her things?',
      'The trunk’s still here. So’s the cart. We didn’t use either to move her.',
      'The scarf?',
      'Kept with her effects. I wrote down how it lay before she was moved.',
      'Has anyone else told you they saw something?',
      'You’ll want Mrs Baines’s account. I’ve kept people back, but I haven’t had a proper word with her yet.',
      'We’ll speak to her. Does Abberline know?',
      'Yes. He wants you on this enquiry. I’ll remain with Arthur. The constable at the back is keeping her belongings secure.',
      'Keep the yard clear while we have a look.',
      'Of course, sir.',
    ]),
    handover('privacy', 'Keep the search private', 'Who has been allowed into the yard?', 'hale-private-recovery', [
      'Moss, the doctor and the removal men. There’s a constable guarding the yard now. Arthur came after the removal; I’ve kept him here with me.',
      'Keep him there while we search. No one is to discuss what we find within his hearing.',
      'Understood. The rear passage is shut. Speak to Moss in the yard and Mrs Baines in her own room. I won’t let anyone go between them and Arthur.',
    ]),
    handover('knife', 'The knife Hale recovered', 'Was anything lying beside Nora?', 'courtyard-knife', [
      'A knife. It was out in the open beside her. I picked it up before they brought the stretcher. I’ve kept it wrapped here.',
      'May we see it?',
      'Of course. I haven’t established who it belongs to.',
    ], { requiresAll: ['hale-discovery'] }),
    handover('protection', 'Keep watch for Baines', 'Mrs Baines is frightened whoever was here may come back. Will you arrange a watch at the steps while we speak to her?', 'hale-protection', [
      'I’ll put a constable at the back steps. Mrs Baines can see him from her window.',
      'Will he remain there while we finish our enquiries?',
      'Yes, sir. I’ll stay here with Arthur.',
    ], { requiresAll: ['baines-fear', 'hale-discovery'] }),
    handover('address', 'Verify Arthur’s lodgings', 'Have you checked where Arthur and Nora were living?', 'address-verified', [
      'Yes, sir. I sent an officer to Bell’s shop. The landlord confirms Arthur’s still in the upstairs room.',
      'Has he given notice?',
      'No, sir.',
      'Has anyone been inside his room?',
      'No, sir. The officer spoke to the landlord downstairs. Arthur still occupies the room.',
      'We’ll need to search it.',
      'Shall I arrange that?',
      'Please. Arrange access for us. You’ll keep Arthur at Commercial Street.',
    ], { requiresAll: ['maggie-separation'] }),
  ]),
  npc('george', 'George Moss', 'Carman', 'lantern-yard', 'george', 'Can I see to the horse? He’s still waiting outside.', [
    t('arrival', 'This morning’s arrival', 'In a moment, Mr Moss. Tell us what happened this morning.', 'I brought him round to fetch the trunk. Left him outside and came in to see if they were ready.', {
      reassure: b('Who did you speak to?', [
        'Mrs Baines. She said Nora hadn’t come down. Asked if I’d help see what was keeping her.',
        'Where did you find her?',
        'Beyond the washhouse. I was going towards the steps when I saw her.',
        'What did you do?',
        'Went for the constable.',
        'Did you touch her before you went?',
        'No. There was a scarf over her face. I left it where it was.',
        'Had you moved the cart?',
        'Hadn’t got that far. The horse was still outside. I’d only just come through.',
      ], 'george-discovery'),
    }, { failure: 'I’m trying to tell you what happened. Give me a moment.' }),
    t('night', 'The night before', 'All right. What time did you leave here last night?', 'I couldn’t give you the hour. Finished the coal, settled about the trunk, then took the horse back to his stable.', {
      reassure: b('Did you see anyone coming or going?', [
        'No. I wasn’t watching the door. I had the horse to see to.',
        'Did you hear anything from inside?',
        'Nothing. I was off down the street by then.',
        'And you didn’t come back until this morning?',
        'No.',
        'An officer will take you round to the horse. Come back to the yard afterwards—we may need another word.',
        'Right. Thank you.',
      ], 'george-night'),
    }, { requiresAll: ['george-discovery'], failure: 'I’ve told you when I left. I can’t give you an exact hour.' }),
    t('candlestick', 'The candlestick under the sacks', 'Mr Moss. We found this under the coal sacks in your cart.', 'A candlestick? What’s that doing there?', {
      reassure: b('That’s what we’re asking you.', [
        'Well, I didn’t put it there.',
        'When did you last handle those sacks?',
        'Last night, finishing the delivery. I left the cart here afterwards.',
        'Could anyone get at it while you were away?',
        'Anyone who came into the yard. There’s nothing to stop them.',
        'And you hadn’t touched the sacks this morning?',
        'No. I found her and went for Hale. I’ve told you.',
        'We still have to ask.',
        'I know. But I came here to do a job. Then I found that poor woman, and now you’re looking through my cart.',
      ], 'george-candlestick'),
      press: b('It was hidden beneath sacks you handled last night. Why shouldn’t we think you put it there?', [
        'Because I left the cart here. Anyone could get at it after I went.',
        'Had you touched the sacks this morning?',
        'No. I found Nora and fetched Hale. I didn’t put that candlestick there.',
      ], 'george-candlestick'),
    }, { requiresAll: ['cart-candlestick', 'george-discovery'], failure: 'I didn’t put it there. I don’t know who did.' }),
  ]),
  npc('baines', 'Mrs Baines', 'Keeper of the Lantern', 'baines-room', 'baines', 'She was all ready to go. I was expecting her down this morning.', [
    t('visitor', 'Nora’s last evening', 'When did you last see Nora?', 'Last night. I took a candlestick through to her room.', {
      reassure: b('How was she then?', ['Packing. There were clothes everywhere.', 'Did she ask you for anything?', 'Just the candle. George was coming for her trunk in the morning.'], 'baines-last-seen'),
    }, { failure: 'I took her a candle. That’s all I can tell you about her evening.' }),
    handover('friend', 'Someone who knew Nora', 'Who else knew Nora well?', 'workshop-lead', [
      'Maggie Shaw, at the workshop. They worked together. You could try there.',
    ]),
    t('disturbance', 'Return to last night', 'Mrs Baines, we found blood beneath Nora’s rug and inside her trunk.', 'I only lent her a candlestick. I don’t look inside lodgers’ trunks.', {
      reassure: b('Something’s worrying you. What is it?', ['What if he comes back?', 'Who do you mean?', 'The man who’s been killing those women. You haven’t caught him, have you?'], 'baines-fear'),
      challenge: b('The blood means we need to ask about last night again.', ['I can see that. But you’ll go away when you’ve finished here.', 'Are you afraid someone will come back?', 'Wouldn’t you be? With what’s happened to that girl?'], 'baines-fear'),
      press: b('You must have heard something. Tell us.', ['Please. I’ve said all I can.'], undefined, { success: false }),
    }, { requiresDeduction: 'room-to-yard', proof: 'trunk-interior', failure: 'I don’t know what you want me to say about that.' }),
    t('safety', 'A constable is keeping watch', 'Hale has put a constable at the back steps. He’ll stay there while we finish our enquiries.', 'He won’t leave while we’re talking?', {
      reassure: b('He’ll stay. We can sit away from the passage. Take your time.', ['Don’t let anyone come up behind me.', 'He won’t let anyone through.', 'All right. Shut that door, would you?'], 'baines-reassured'),
    }, { requiresAll: ['baines-fear', 'hale-protection'], failure: 'I can’t talk while I’m watching that passage.' }),
    t('sounds', 'What she heard', 'What did you hear last night?', 'Voices, from the back. I was in my room.', {
      reassure: b('Could you make out what they were saying?', ['No. Then a cry. A thud, straight after it.', 'Did you open your door?', 'No. I stayed where I was.'], 'baines-disturbance'),
    }, { requiresAll: ['baines-reassured'], failure: 'I couldn’t make out the words. Don’t ask me to guess.' }),
    t('trunk', 'The man on the steps', 'What happened after that?', 'Later I heard someone on the steps. I looked from my window.', {
      reassure: b('What could you see?', ['A man, carrying Nora’s trunk down.', 'Did you see his face?', 'No. He was turned away from me. I only had a glimpse.'], 'baines-trunk'),
    }, { requiresAll: ['baines-reassured', 'baines-disturbance'], failure: 'I didn’t get a proper look at him.' }),
    t('hiding', 'Why she hid', 'What did you do when you saw him?', 'Drew back. Put the bolt across my door.', {
      reassure: b('You thought it was the man from the papers?', ['After that cry? I was terrified. And then this morning they found her.', 'Did you see what he did with the trunk?', 'No. I kept away from the window. The washhouse hides that end of the yard anyway.'], 'baines-hiding'),
    }, { requiresAll: ['baines-trunk'], failure: 'I was hiding. I didn’t see what happened in the yard.' }),
    t('identify-man', 'Could she recognise him?', 'Could the man you saw have been Arthur Vale?', 'I couldn’t say.', {
      reassure: b('Did you hear his voice?', ['I couldn’t recognise either voice. Please don’t put a name to him for me.']),
      press: b('Are you certain you wouldn’t recognise him?', ['I didn’t see the man’s face. I can’t tell you whether it was Mr Vale.']),
    }, { requiresAll: ['baines-trunk', 'arthur-visit'], failure: 'I can’t tell you who he was.' }),
    t('blanket', 'The trunk’s bedding', 'Can you identify the blanket from the trunk?', 'Let me see the edge.', {
      reassure: b('Do you recognise the edging?', ['Yes. Blue edging, and a darn by that corner.', 'Where did you last leave it?', 'On Nora’s bed. I made the bed myself.'], 'blanket-identification'),
      challenge: b('This was under the loose clothes. Do you recognise it?', ['That is Nora’s bed blanket. I know the blue border and that repair. It wasn’t travelling linen.'], 'blanket-identification'),
    }, { requiresAll: ['trunk-interior'], proof: 'trunk-interior', failure: 'Show me the bedding you mean. I cannot identify a blanket from another person’s account.' }),
    t('missing-candle', 'The empty bedside place', 'What stood beside Nora’s bed?', 'A heavy brass candlestick I lent her.', { reassure: b('How would we recognise it?', ['A bent loop handle and blue wax. I took it in last night.', 'Is it still there?', 'No. That empty ring on the little table is where it stood.'], 'candlestick-description') }),
    t('identify-candle', 'The recovered candlestick', 'Is this the candlestick you put in Nora’s room?', 'Turn the handle towards me.', {
      reassure: b('Do you recognise the damage?', ['Yes. The bend in the loop, and the blue wax. That is mine, from beside her bed.', 'Do you know who put it in the cart?', 'No. I only know where I left it.'], 'candlestick-identification'),
      challenge: b('We recovered this under the coal sacks. Was it Nora’s bedside light?', ['It was. I lent it to her last night. That bent handle is unmistakable to me.', 'You did not see it carried into the yard?', 'No. I did not see what happened behind the washhouse.'], 'candlestick-identification'),
    }, { requiresAll: ['cart-candlestick'], proof: 'cart-candlestick', failure: 'That is not the candlestick. Show me the object with the bent handle.' }),
    handover('cart', 'The overnight cart', 'Why was George’s cart left in the yard?', 'cart-access', ['I arranged his paid job: carry Nora’s trunk in the morning. He left the cart after delivering coal and took the horse away.', 'Was it guarded overnight?', 'No. Anyone in the yard could reach the sacks. He had not moved it when he found Nora.']),
  ]),
  npc('arthur-inn', 'Arthur Vale', 'Calling at the Lantern about Nora', 'lantern-common', 'arthur', 'Arthur Vale. Nora’s brother. The constable said I should speak to you.', [
    t('relationship', 'His relationship to Nora', 'What have you been told?', 'That she was found in the yard. He wouldn’t tell me much else. What happened to her?', {
      reassure: b('We’re still establishing that. When did you last see her?', [
        'Last night. I came here to speak to her.',
      ], 'arthur-brother'),
    }, { failure: 'I’ve only just been told. I’m trying to understand what happened.' }),
    t('visit', 'His visit last night', 'How did the visit go?', 'We had words about Bristol.', {
      reassure: b('What about it?', [
        'I thought she was rushing into it. She thought I ought to mind my own business.',
        'What did you say to that?',
        'More than I should have. You don’t think it’ll be the last time you speak to someone, do you?',
        'How were things when you left?',
        'She was packing. I wasn’t getting anywhere, so I left her to it.',
        'Can you tell us when that was?',
        'I didn’t look at a clock. I’m sorry.',
      ], 'arthur-visit'),
    }, { failure: 'We disagreed about her going. What else did you want to know?' }),
    t('trunk', 'Whether he moved the trunk', 'Did you help take her luggage down?', 'No. I didn’t touch the trunk.', {
      reassure: b('Was someone coming for it?', [
        'A carman. George, I think. She said it was arranged.',
        'Did you meet him?',
        'No. There was a cart in the yard. I took it to be his.',
        'Is there anything else you can tell us about the evening?',
        'Nothing comes to mind. If it does, I’ll tell you.',
        'We may need to speak to you again.',
        'I’ll be here. What happens about her things?',
        'They’ll have to stay where they are for now.',
        'Of course. Just let me know when we can make the arrangements.',
      ], 'arthur-trunk-denial'),
    }, { failure: 'I didn’t carry it. That’s all I can tell you.' }),
    t('trunk-followup', 'The man with the trunk', 'Mrs Baines saw a man carrying Nora’s trunk down last night. She couldn’t see his face.', 'Then she can’t tell you who it was.', {
      reassure: b('Could you have misunderstood us earlier? We meant last night, not this morning.', ['I thought you meant this morning. Yes, I brought it down last night.', 'Was Nora with you?', 'She was still packing. I was helping her with the luggage.'], 'arthur-trunk-reply', { choice: ['inn-trunk-account', 'helping'] }),
      challenge: b('You were there last night. Did you carry it down?', ['I didn’t. She saw someone else.', 'Did you see another man?', 'No. I can only tell you it wasn’t me.'], 'arthur-trunk-reply', { choice: ['inn-trunk-account', 'disputing'] }),
    }, { requiresAll: ['arthur-trunk-denial', 'arthur-visit', 'baines-trunk'], proof: 'baines-trunk', failure: 'You’ve shown me nothing that says I carried it.' }),
  ]),
  npc('alden', 'Dr William Alden', 'Surgeon', 'alden-workroom', 'alden', 'Inspectors. Come in. We can speak here.', [
    handover('findings', 'Alden’s examination', 'You’ve examined Nora Vale?', 'medical-findings', [
      'Yes. I’ve finished writing up my notes.',
      'What killed her?',
      'The injury to her head. A hard, blunt blow. There were also knife wounds.',
      'Did those contribute to her death?',
      'No. Those were inflicted after death. They did not kill her.',
      'You’re certain about that?',
      'Yes. I can establish that sequence. I cannot give you a precise hour, or name the particular object used for the blow.',
      'People will think of the other murders.',
      'I understand why. But the appearance of this case is misleading. Here are my findings.',
    ]),
    handover('knife', 'The knife from the yard', 'Hale found a knife beside Nora. Does that change your findings?', 'alden-knife', [
      'No. The knife wounds were made after death. The injury to her head killed her.',
      'Can you identify that knife as the one used?',
      'I cannot identify a particular knife from those wounds.',
    ], { requiresAll: ['medical-findings', 'courtyard-knife'] }),
    t('room', 'Room and trunk traces', 'There’s blood beneath the rug in her room. We found more inside her trunk, on the bedding.', 'Was there much where she was found?', {
      reassure: b('Very little.', [
        'Then I’d look closely at the room. What you describe would fit her being injured there and carried out afterwards.',
        'In the trunk?',
        'It’s possible. The blood on the bedding would fit that.',
        'Thank you. We’re checking who handled it.',
      ], 'alden-movement'),
    }, { requiresAll: ['room-disturbance', 'trunk-interior', 'yard-discovery', 'medical-findings'], failure: 'Tell me what you found in the room.' }),
    t('candle', 'The possible blunt object', 'Would you have a look at this?', 'Where did you find it?', {
      reassure: b('Under some sacks in the yard. Could it have caused the head injury?', [
        'Yes. Something of this weight and shape could have done it.',
        'Can you say whether this was the object used?',
        'No. I’d be going further than the injury suggests. Where it came from, and who handled it—that may help you more.',
        'Understood.',
      ], 'alden-candlestick'),
    }, { requiresAll: ['cart-candlestick', 'medical-findings'], failure: 'I’d need to examine the object itself.' }),
  ]),
  npc('maggie', 'Maggie Shaw', 'Garment worker at the Commercial Road workshop', 'shaw-workshop', 'maggie', 'Can I help you?', [
    t('privacy', 'Nora’s friend', 'Maggie Shaw? We’re enquiring into Nora Vale’s death.', 'Then it’s true. They said a woman had been found at the Lantern. Before I say anything—is Arthur with you?', {
      reassure: b('He hasn’t come with us. We can speak privately.', [
        'Could you shut the door, please?',
        'Of course.',
        'Nora asked me to keep quiet until she was away. I helped her with a few things.',
      ], 'maggie-cooperation'),
      press: b('What are you afraid he’ll hear?', [
        'That I helped her. She asked me to keep quiet until she was away.',
        'He hasn’t come with us. We can shut the door.',
        'Please. Then I’ll tell you what I can.',
      ], 'maggie-cooperation'),
      challenge: b('Were you helping Nora hide from someone?', [
        'Is Arthur outside? I need to know before I say anything else.',
      ], undefined, { success: false }),
    }, { failure: 'Give me a moment, please.' }),
    t('work', 'Their work together', 'You worked beside Nora?', 'At this table. That’s her work there. I haven’t moved it.', {
      reassure: b('Was she looking forward to Bristol?', [
        'Yes. Worried about making a start somewhere new, of course. She kept asking whether they’d expect her to work faster.',
        'Would that have been a problem?',
        'Not once she knew their ways. She was good.',
      ]),
    }, { requiresAll: ['maggie-cooperation'], failure: 'We worked here together. What did you want to know?' }),
    t('brother', 'Arthur’s account', 'We’ve spoken to Arthur Vale. He says he’s her brother.', 'Her brother?', {
      reassure: b('That’s what he told us.', [
        'Arthur was her husband. I was at their wedding.',
        'You’re certain we’re talking about the same man?',
        'I’ve a photograph. You can see for yourselves.',
      ], 'marriage-identification', { choice: ['marriage-identified', 'confirmed'] }),
    }, { requiresAll: ['maggie-cooperation', 'arthur-brother'], failure: 'Arthur Vale was her husband. I knew them both.' }),
    handover('name', 'The name Finch', 'Her travelling papers are addressed to Nora Finch. Do you know why?', 'finch-work-card', [
      'Finch was her name before she married. She wanted to use it again.',
      'Who did she marry?',
      'Arthur Vale.',
      'Do you have anything with her earlier name on it?',
      'Her old work card. It’ll be with the accounts.',
    ], { requiresAll: ['maggie-cooperation', 'travel-papers'], choice: { id: 'marriage-identified', value: 'confirmed' } }),
    t('marriage', 'Nora’s marriage', 'Was Nora married?', 'To Arthur Vale.', {
      reassure: b('Did you know them both?', [
        'Yes. I was at their wedding. I’ve a photograph. You can see for yourselves.',
      ], 'marriage-identification', { choice: ['marriage-identified', 'confirmed'] }),
    }, { requiresAll: ['maggie-cooperation'], failure: 'I was at the wedding. I knew them both.' }),
    handover('photograph', 'Maggie’s photograph', 'May we see a photograph of Nora?', 'complete-wedding', [
      'Nora and her mother. Arthur on the right.',
      'When was this taken?',
      'Their wedding day. Eighth of June, four years ago. It’s written on the back.',
    ], { requiresAll: ['maggie-cooperation'], choice: { id: 'marriage-identified', value: 'confirmed' } }),
    t('separation', 'Why Nora was at the Lantern', 'Why was Nora staying at the Lantern?', 'She’d left him.', {
      reassure: b('Did she tell you why?', [
        'She asked me not to say anything until she was away.',
        'What was happening between them?',
        'He’d come here for her wages. Wait outside when we finished. If she stopped to speak to someone, he wanted to know who.',
        'You saw that yourself?',
        'Yes. The money, the waiting. What happened at home, I only know what she told me.',
        'What did she tell you?',
        'That she couldn’t go anywhere without having to explain herself afterwards. She wanted to leave, so I helped her take a few things to the Lantern.',
        'Did Arthur know she was going to Bristol?',
        'I didn’t tell him. I don’t know what she said to him.',
        'Where had they been living?',
        'Above Bell’s boot-repair shop, off Commercial Road. The upstairs room.',
        'Is he still there?',
        'As far as I know.',
        'We’ll check. Thank you for speaking to us.',
        'Will someone tell her sister? She’ll be waiting at the station.',
        'We’ll arrange for word to reach her.',
      ], 'maggie-separation'),
    }, { requiresAll: ['maggie-cooperation'], requiresChoice: { id: 'marriage-identified', value: 'confirmed' }, failure: 'I can tell you what I saw myself. The rest is what Nora told me.' }),
  ]),
  ...stationCast(),
  npc('maggie-closing', 'Maggie Shaw', 'Garment worker at the Commercial Road workshop', 'lantern-common', 'maggie', 'I’ve started three times. There is no decent first sentence for a letter like this.', [
    t('sister', 'A letter to Bristol', 'Will you write to her sister?', 'You’ve sent word. But she’ll want to hear from someone who knew Nora here.', {
      reassure: b('Tell her we will write about the enquiry, and that Nora’s things are safe.', ['I will. I’m telling her Nora had everything ready, and that her sewing case is here.', 'We will help with the belongings when they may be released.', 'She should have arrived with them herself.'], 'closing-addressed'),
      press: b('Can you arrange the return of her belongings when they are released?', ['Yes. I know where to send them. I’ll tell her the police are keeping them safe for now.', 'She will also hear from us.', 'Then I can write about Nora, instead of trying to explain every part of the enquiry.'], 'closing-addressed'),
    }),
    handover('letter', 'Read Maggie’s letter', 'May we read what you have written?', 'closing-letter', ['You may. I have said the enquiry is complete, and that you will write to her.', 'And the rest?', 'Her things, her work, the ticket. She should have been in Bristol by now.'], { requiresAll: ['closing-addressed'] }),
  ]),

];

function stationCast() {
  return [npc('arthur-station', 'Arthur Vale', 'Held at Commercial Street for questioning', 'station-interview', 'arthur', 'How much longer are you keeping me here?', [
    t('relationship', 'Maggie’s account of the marriage', 'We’ve spoken to Maggie Shaw. She says you were Nora’s husband.', 'Who is Maggie Shaw?', {
      reassure: b('She worked with Nora.', ['And why would she say that?', 'She says she attended your wedding.', 'I don’t know what Nora’s been telling people.'], undefined, { success: false }),
      challenge: b('Maggie kept this photograph of your wedding. Is that you beside Nora?', ['Let me see it.', 'Nora and her mother. You’re on the right.', 'All right. We were married.', 'Why tell us she was your sister?', 'Because the moment I said husband, you’d stop looking for anyone else.'], 'station-relationship'),
    }, { proof: 'complete-wedding', failure: 'Where’s the complete photograph she says she has?' }),
    t('trunk-helping', 'The trunk’s contents', 'You said you carried Nora’s trunk down for her.', 'She was going away. I was helping.', {
      reassure: b('Did you know there was blood inside it?', ['No. I didn’t open it.', 'Where was Nora when you carried it down?', 'In her room.', 'Packing?', 'Yes. I wasn’t watching everything she did.'], 'station-trunk'),
      challenge: b('There was blood beneath the clothes. What were you carrying?', ['Her things. That’s what I thought.', 'You didn’t look inside?', 'No.'], 'station-trunk'),
    }, { requiresChoice: { id: 'inn-trunk-account', value: 'helping' }, proof: 'trunk-interior', failure: 'You said there was blood in the trunk. Show me what you mean.' }),
    t('trunk-disputing', 'The man with the trunk', 'Mrs Baines saw a man carrying Nora’s trunk down the steps.', 'And she didn’t see his face. You told me that.', {
      reassure: b('Did you see anyone else near Nora’s room?', ['No. I went to see her, and then I left.', 'There was blood inside the trunk.', 'I didn’t carry it. I don’t know what else you want me to say.'], 'station-trunk'),
      challenge: b('The trunk was stained inside. Were you helping Nora pack?', ['No. She was doing it herself.', 'Was she hurt when you were there?', 'We had an argument. That’s all.'], 'station-trunk'),
    }, { requiresChoice: { id: 'inn-trunk-account', value: 'disputing' }, proof: 'trunk-interior', failure: 'What’s that got to do with the trunk?' }),
    t('fire', 'What he burned', 'You burnt clothing and a newspaper when you got home.', 'I was clearing some things out.', {
      reassure: b('That night?', ['I’d been meaning to do it.', 'Was there something wrong with the clothes?', 'They were worn out. That’s why I got rid of them.'], 'station-fire'),
      challenge: b('We found these remains in your fireplace. Were they what you wore to see Nora?', ['I don’t remember which clothes I put in.', 'You remember burning them?', 'Yes. I’m not denying I lit a fire.'], 'station-fire'),
    }, { proof: 'hearth-clothing', failure: 'That isn’t clothing from my fireplace.' }),
    handover('finding-nora', 'How he found Nora', 'How did you know Nora was staying at the Lantern?', 'arthur-found-nora', [
      'I waited outside the workshop. Followed her when she left.',
      'Did she know you were following her?',
      'She wouldn’t have spoken to me if she had.',
      'When did you learn about Bristol?',
      'When I went to her room. She said she was leaving in the morning.',
    ], { requiresAll: ['station-relationship'] }),
    t('departure', 'Why he went to see Nora', 'Had Nora asked you to come and see her?', 'I didn’t think I needed an invitation to speak to my wife.', {
      reassure: b('What did you want to say to her?', ['That she could come home. We could sort it out between ourselves.', 'What did she say?', 'She’d made up her mind. Bristol, her sister, this job. She wouldn’t listen to reason.', 'She told us she wanted the work.', 'There was work here. She was throwing our marriage away.', 'Did she ask you to leave?', 'Yes. I wanted her to hear me out.'], 'arthur-departure'),
      challenge: b('She had her ticket and work arranged. Did you think she would stay?', ['If she’d stopped and thought about it, yes.', 'Her sister was expecting her.', 'Her sister had been encouraging her. Nora wouldn’t have done this on her own.', 'Nora told us herself that she wanted the job.', 'You spoke to her for a few minutes. She was my wife.', 'And when you asked her to come home?', 'She told me to leave. I wanted to talk.'], 'arthur-departure'),
    }, { requiresAll: ['station-relationship', 'arthur-found-nora', 'nora-plans', 'travel-papers'], proof: 'travel-papers', failure: 'What has that got to do with her going to Bristol?' }),
    t('room', 'His account of leaving', 'What happened when Nora asked you to leave?', 'We argued. Then I went.', {
      reassure: b('Was she hurt when you left?', ['No. She was packing.', 'Mrs Baines heard a cry and a thud.', 'When?', 'During the night.', 'Then it could have been after I’d gone.'], 'station-room'),
    }, { requiresAll: ['arthur-departure', 'station-trunk'] }),
    t('candlestick', 'The recovered candlestick', 'We’ve recovered the candlestick Mrs Baines lent Nora.', 'Then why isn’t George sitting here?', {
      reassure: b('Why George?', ['It was under the sacks in his cart. You ought to be asking him.'], 'arthur-candlestick-slip'),
    }, { requiresAll: ['station-room', 'station-fire', 'cart-candlestick', 'candlestick-identification', 'hale-private-recovery'] }),
    t('source', 'Where he heard about the recovery', 'Who told you where we found the candlestick?', 'One of your men.', {
      reassure: b('Which man?', ['I don’t remember. There were enough of you about.', 'Did someone speak to you, or did you overhear it?', 'Someone told me. I wasn’t taking names.'], 'arthur-source-claim'),
    }, { requiresDeduction: 'unshared-detail' }),
    t('source-rebuttal', 'Hale has checked his claim', 'Hale was the only constable who spoke to you. He says he didn’t mention the candlestick.', 'Then he’s forgotten.', {
      press: b('You knew it was underneath the sacks. How?', ['I’ve told you. Ask him again.', 'You were kept away from the yard while we searched. Nobody discussed the recovery in front of you.', 'Then I must have heard it from someone else. I don’t remember.'], 'station-knowledge'),
      challenge: b('This is where we found it. Hale kept you away from the search, and the recovery wasn’t discussed in front of you.', ['I didn’t put it there.', 'You knew where it was before we told you.', 'I don’t have to remember every word everyone’s said to me today.'], 'station-knowledge'),
    }, { requiresDeduction: 'source-excuse', proof: 'cart-candlestick', failure: 'You said you were asking about the candlestick.' }),
    t('cause', 'What actually killed Nora', 'Hale recovered a knife beside Nora. Alden says it wasn’t what killed her.', 'What did, then?', {
      challenge: b('The blow to her head. The knife wounds were made after she was dead.', ['And you’re saying that was me?', 'You argued with her. Baines heard a cry and a thud. You knew where the candlestick was hidden.', 'She didn’t see me hurt Nora. Nobody did.', 'Did you strike her?', 'No.'], 'station-cause'),
    }, { requiresAll: ['station-knowledge', 'courtyard-knife'], requiresDeduction: 'false-knife', proof: 'medical-findings', failure: 'That isn’t the doctor’s report.' }),
    t('yard', 'The newspaper illustration', 'Had you read the newspaper you burnt?', 'Of course. Everyone’s reading about the murders.', {
      reassure: b('Why burn it that night?', ['I’d finished with it.', 'The illustration shows a woman in a yard with a scarf over her face. Nora was found like that.', 'Then perhaps you ought to be looking for the man in the papers.', 'The wounds were made after her death. Someone wanted them to be seen.', 'I can’t tell you why.'], 'station-yard'),
      challenge: b('The scarf in this illustration is arranged like Nora’s. Did you put hers there?', ['No.', 'George says he didn’t touch it. Hale found it still covering her face.', 'I can’t answer for George.', 'We’re asking about you.', 'I read the paper. I didn’t do what was in it.'], 'station-yard'),
    }, { requiresAll: ['station-cause', 'station-fire'], requiresDeduction: 'staged-resemblance', proof: 'inn-newspaper', proofAlternatives: ['burned-report'], failure: 'That’s not the newspaper you’re talking about.' }),
    t('room-revisit', 'Return to the argument', 'You said Nora was still packing when you left.', 'She wouldn’t stop to listen to me.', {
      press: b('Did you hit her?', ['No. How many times do I have to say it?'], undefined, { success: false }),
      challenge: b('There was blood beneath her rug. Baines heard the disturbance. Tell us what happened when Nora wouldn’t listen.', ['I took her arm. Just to stop her for a moment.', 'Did she try to get away?', 'She pulled back and fell against the washstand.', 'You said she was packing when you left.', 'I didn’t mean for her to fall. She pulled so hard.', 'Did you get anyone?', 'I thought she was dead. I didn’t know what to do.'], 'arthur-fall'),
    }, { requiresAll: ['station-yard', 'station-knowledge'], proof: 'room-disturbance', failure: 'You said you were asking about her room.' }),
    t('purpose', 'From the room to the yard', 'You say Nora fell in her room. She was found outside. What happened in between?', 'I don’t want to go through it again.', {
      press: b('You put her in the trunk and carried her out, didn’t you?', ['You keep telling me what I did. Why bother asking?'], undefined, { success: false }),
      challenge: b('Her bedding was inside the trunk, stained with blood. The packing was left in her room.', ['I couldn’t leave her on the floor.', 'So you put her in the trunk?', 'I was frightened. I thought if I got her out of there, I’d have time to think.', 'You took her into the yard.', 'Yes.', 'And the scarf?', 'I covered her face. I couldn’t bear to look at her.'], 'scarf-admitted'),
    }, { requiresAll: ['station-yard', 'arthur-fall'], requiresDeduction: 'room-to-yard', proof: 'trunk-interior', failure: 'You said you had found something in the trunk. What was it?' }),
    t('disguise', 'Why he covered her face', 'You say you covered her face because you couldn’t bear to look at her.', 'She was my wife. I didn’t want people staring at her.', {
      press: b('You were trying to make it look like one of the other murders.', ['That’s what you think. I’ve told you why I covered her.'], undefined, { success: false }),
      challenge: b('This is how the paper shows it. You’d read it, and then you left Nora like this in the yard.', ['They were going to blame me. You would have. Her husband, after an argument.', 'So you wanted us to think it was him?', 'I thought you might. If she was out there, like the woman in the paper.', 'And the knife?', 'I’m not saying anything about that.', 'Alden says the blow killed her. Did you strike her with the candlestick?', 'She fell.', 'You still haven’t explained how you knew where it was hidden.', 'I didn’t kill her.'], 'disguise-admitted', { endsInterview: true }),
    }, { requiresAll: ['station-yard', 'scarf-admitted'], requiresDeduction: 'staged-resemblance', proof: 'inn-newspaper', proofAlternatives: ['burned-report'], failure: 'Show me the illustration you mean.' }),
  ]), npc('hale-station', 'Constable Hale', 'Metropolitan Police', 'station-interview', 'hale', 'Inspectors. I’m here if you need me.', [
    handover('disclosure', 'Check Arthur’s claimed source', 'Arthur says one of our men told him where the candlestick was found. Who has spoken to him?', 'hale-disclosure-check', [
      'Only me, apart from you. I spoke to him at the front and brought him here myself.',
      'Did you mention the candlestick?',
      'No, sir. I told him Nora had been found in the yard. Nothing about the cart search.',
      'Could he have watched it, or heard us questioning Moss and Mrs Baines?',
      'No. I kept the rear passage shut. Moss spoke in the yard; an officer took him round to his horse and back without passing through the front. Mrs Baines spoke in her own room. Neither has been in to see him.',
      'And the other officers?',
      'The removal men left before he arrived. The yard constable and the officer checking his address kept away from him. He’s been with me throughout. Nobody else has spoken to him.',
    ], { requiresAll: ['arthur-source-claim'] }),
  ])];
}

function t(id, label, ask, claim, branches, options = {}) {
  const { failure = 'That does not establish what you are asking. Put the relevant fact to me, and we can return to it.', ...gates } = options;
  const entries = Object.entries(branches);
  const correct = entries.find(([, branch]) => branch.success !== false)?.[0] ?? entries[0][0];
  const responses = Object.fromEntries(entries.map(([approach, { label, ...branch }]) => [approach, { ...branch, success: branch.success !== false }]));
  const { success: _success, ...success } = responses[correct];
  return { id, label, ask, claim, observation: '', choices: entries.map(([approach, branch]) => ({ approach, label: branch.label, ...(approach === 'challenge' && options.proof ? { usesEvidence: true } : {}) })), correct, success, failure: { text: failure }, responses, ...gates };
}
function handover(id, label, ask, reward, lines, options = {}) {
  const { choice, ...gates } = options;
  return { id, label, ask, claim: lines[0], observation: '', documentId: reward, correct: 'reassure', success: { ...reply(lines, reward), ...(choice ? { choice } : {}) }, failure: { text: 'Let us return to that question.' }, ...gates };
}
function b(label, lines, reward, options = {}) {
  const { choice, ...rest } = options;
  return { label, ...reply(lines, reward), ...(choice ? { choice: { id: choice[0], value: choice[1] } } : {}), ...rest };
}
function reply(lines, reward) { return { text: lines[0], ...(lines.length > 1 ? { turns: lines.map((text, index) => ({ speaker: index % 2 ? 'investigator' : 'witness', text })) } : {}), ...(reward ? { reward } : {}) }; }
function npc(id, name, occupation, location, appearanceId, greeting, topics) { return { id, name, occupation, location, appearance: appearance(appearanceId), greeting, historical: 'Fictional character in an invented enquiry set in November 1888.', topics, repeatable: true }; }
function appearance(id) {
  const base = { coat: '#49483e', waistcoat: '#777062', hair: '#3b2e24', skin: '#b98e75', accent: '#c6b69a', hat: 'none', beard: 'none', height: 1, build: 1, face: [1, 1, 1] };
  const cast = {
    baines: { hairStyle: 'braided-coil', garment: 'day-dress', face: [1.12, .98, 1.06], coat: '#5a4540', hair: '#70655b', skin: '#c09a83', hat: 'bonnet', height: .94, build: 1.2, dress: true, apron: '#b0a389', shawl: '#3d4940' },
    nora: { hairStyle: 'chignon', garment: 'day-dress', coat: '#666349', hair: '#493328', skin: '#cfaa94', height: .98, build: .88, dress: true, apron: '#c1b69b', face: [.91, 1.04, .94] },
    george: { garment: 'work-jacket', neckwear: '#73574a', hairStyle: 'short', coat: '#554f43', waistcoat: '#6e6752', skin: '#ac846b', hat: 'cap', beard: 'moustache', height: 1.05, build: 1.18, face: [1.05, .99, 1.03] },
    hale: { garment: 'police-tunic', hairStyle: 'short', face: [.97, 1.03, 1.08], coat: '#263848', waistcoat: '#263848', hat: 'helmet', beard: 'moustache', height: 1.08, build: 1.06, accent: '#b39857' },
    arthur: { garment: 'lounge', neckwear: '#413b48', hairStyle: 'short', coat: '#35383b', waistcoat: '#5d5548', hair: '#302a24', skin: '#c09980', beard: 'moustache', height: 1.06, build: 1.05, face: [.95, 1.08, .96] },
    alden: { garment: 'frock', neckwear: '#262b29', hairStyle: 'short', face: [.92, 1.12, 1], coat: '#3c403e', waistcoat: '#8b8070', hair: '#918779', skin: '#c6a992', beard: 'sideburns', height: 1.02, build: .99, balding: true, chain: true },
    maggie: { hairStyle: 'pinned-plait', garment: 'day-dress', face: [1.08, .97, 1], coat: '#514b60', hair: '#392f2a', skin: '#bb927b', height: .99, build: 1, dress: true, apron: '#aba084', shawl: '#756d60' },
  };
  return { ...base, ...cast[id] };
}
