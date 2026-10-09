export const documents = {
  orders: document('orders', 'Abberline’s orders', 'Police correspondence', [page('orders-original', 'Temporary assignment', {
    heading: 'Temporary assignment',
    kicker: 'Metropolitan Police · Commercial Street', date: '16 November 1888',
    paragraphs: [
      'Inspectors Reed and Ellis,',
      'You are temporarily assigned to the Whitechapel murder enquiry. We need additional officers to follow up the witness accounts received since the murder in Miller’s Court.',
      'Constable Hale has arranged rooms for you at the Lantern. Mrs Baines is expecting Mr Reed and Mr Ellis this evening. She has not been told your occupation. Wear plain clothes and keep your assignment private while lodging there, so that your arrival does not become common talk.',
      'Report to me at Commercial Street tomorrow morning for your assignments.',
    ], signature: 'F. Abberline\nInspector',
  })]),
  'inn-newspaper': document('inn-newspaper', 'The Evening London Illustrated', 'Illustrated newspaper', [page('inn-newspaper-original', 'The Whitechapel murders', {
    heading: 'The Whitechapel murders',
    kicker: 'The Evening London Illustrated · Friday, 16 November 1888 · One penny',
    paragraphs: [
      'A week has passed since the murder in Miller’s Court, and the murderer is still at large. At the inquests, the surgeons have described throats cut and terrible injuries to the abdomen. Yet after all the questioning of witnesses and examination of suspected men, the police have brought no one to justice.',
      'THE WHITECHAPEL HORRORS.—FROM AN IMAGINARY SKETCH.',
      'The women of the district cannot stay indoors until Scotland Yard solves the case. Work must be found and rent paid. More constables are wanted in the courts and passages after dark; assurances from the authorities will not suffice.',
    ], description: 'The newspaper’s woodcut shows a clothed woman lying in a yard with a scarf across her face.',
  })]),
  'travel-papers': document('travel-papers', 'Nora’s Bristol journey', 'Railway ticket, sleeve and family letter', [
    page('travel-sleeve-original', 'Ticket and addressed sleeve', {
      paragraphs: ['G.W.R. · PADDINGTON TO BRISTOL · THIRD CLASS · SINGLE', 'Miss Nora Finch · The Lantern', 'Saturday, 17 November'],
      description: 'A small stiff card railway ticket rests beside its folded paper sleeve. The passenger name is handwritten on the sleeve, not printed on the ticket.',
    }),
    page('sister-letter-original', 'A place in Bristol', {
      date: 'Bristol · 14 November 1888', paragraphs: [
        'My dear Nora,',
        'I have spoken for you at the sewing room. They will try you on alterations on Monday, and I know they will keep you when they see your work.',
        'Come on Saturday if you can. There is a room near mine, and you can stay with me until it is ready. Bring your sewing things. I have put Finch on the sleeve as you asked.',
        'Write if the journey must wait. You need not explain everything on paper. I shall be glad to have you here.',
      ], signature: 'Your loving sister',
    }),
  ]),
  'work-correspondence': document('work-correspondence', 'Maggie’s work note', 'Workshop correspondence', [page('work-correspondence-original', 'Work left at the workshop', {
    date: '15 November', paragraphs: ['Nora,', 'I have kept the unfinished seams at Shaw’s garment workshop. Do not turn back for them. Bring only what you need for the journey.', 'If you want me before you go, you know where to find me. I shall be at the long table by the window.'], signature: 'Maggie Shaw',
  })]),
  'torn-wedding': document('torn-wedding', 'The torn wedding photograph', 'Mounted photograph', [
    page('torn-wedding-front', 'The remaining photograph', { description: 'Nora stands beside an older woman in a studio portrait. A torn edge cuts through the space beside the bride.' }),
    page('torn-wedding-back', 'The reverse', { paragraphs: ['Our wedding · 8 June 1884'], description: 'The handwritten date is intact on the reverse of the surviving card. No groom’s name remains.' }),
  ]),
  'finch-work-card': document('finch-work-card', 'Nora Finch’s earlier work card', 'Workshop work card', [page('finch-work-card-original', 'Work issued', {
    heading: 'Work issued',
    kicker: 'Garment work', fields: [['Name', 'Nora Finch'], ['Date', 'March 1884']], table: { columns: ['Work', 'Quantity', 'Returned'], rows: [['Shirt cuffs', '12 pairs', 'Complete'], ['Collars', '6', 'Complete']] }, description: 'A ruled work card with handwritten entries for cuffs and collars.',
  })]),
  'complete-wedding': document('complete-wedding', 'Maggie’s wedding photograph', 'Mounted photograph', [
    page('complete-wedding-front', 'The complete print', { description: 'A studio wedding portrait: Nora stands between an older woman and a man. All three figures and the edges of the print are intact.' }),
    page('complete-wedding-back', 'Maggie’s keepsake', { paragraphs: ['Nora Finch and Arthur Vale · 8 June 1884', 'For Maggie'], description: 'The couple’s names, wedding date and dedication are handwritten on the reverse.' }),
  ]),
  'medical-findings': document('medical-findings', 'Alden’s signed findings', 'Surgeon’s account', [page('medical-findings-original', 'Examination of Nora Vale', {
    heading: 'Examination of Nora Vale',
    date: '17 November 1888', paragraphs: [
      'At Constable Hale’s request I attended the rear yard of the Lantern, where I confirmed that Nora Vale was dead. She was subsequently removed for examination.',
      'The injury to the head, caused by a hard, blunt blow, was the cause of death. The wounds to the throat and abdomen were inflicted after death.',
      'These findings establish the order of the injuries, but not an exact hour of death. They do not identify a particular weapon or offender.',
      'The knife wounds did not kill this woman. Resemblance to the reported Whitechapel murders does not establish that the same person was responsible.',
    ], signature: 'William Alden\nSurgeon',
  })]),
  'burned-report': document('burned-report', 'The surviving newspaper portion', 'Burned newspaper', [page('burned-report-original', 'The readable portion', {
    paragraphs: ['THE EVENING LONDON ILLUSTRATED', 'Friday, 16 November 1888', 'THE WHITECHAPEL MURDERS', 'A week has passed since the murder in Miller’s Court, and the murderer is still at large. At the inquests, the surgeons have described throats cut and terrible injuries to the abdomen. Yet after all the questioning of witnesses and examination of suspected men, the police have brought no one to justice.', 'THE WHITECHAPEL HORRORS.—FROM AN IMAGINARY SKETCH.'], description: 'A newspaper with burned edges. The masthead, date, article and woodcut remain visible; the woodcut shows a scarf across a woman’s face.',
  })]),
  'closing-letter': document('closing-letter', 'Maggie’s letter to Nora’s sister', 'Private correspondence', [page('closing-letter-original', 'From the Lantern', {
    date: '17 November 1888', paragraphs: [
      'My dear friend,',
      'The police have sent word of Nora’s death. I wanted you to hear from someone who knew her here as well. Their enquiry is complete, and they will write to you about it.',
      'I shall help with her things when they may be released. Her sewing case is safe. She had your letter with the ticket and had made everything ready.',
      'Mrs Baines is wearing the sleeve Nora mended yesterday. I thought you should know that she was working to the last, and speaking of the work you had found for her.',
      'I am so sorry. I shall write again when I can tell you about the arrangements.',
    ], signature: 'Maggie',
  })]),
};

export const objectArtwork = {
  'trunk-closed': 'A large, travel-worn wooden trunk with iron corners and leather straps, closed beside the Lantern service entrance. Long enough to contain a curled adult; no body shown.',
  'trunk-open': 'The same open trunk with a few loose travelling clothes on top. Do not expose the concealed bedding yet.',
  'trunk-bedding': 'The same trunk after lifting the loose clothes: folded wool bed blanket and pale lining with dark dried blood stains. No body, wounds or gore.',
  'cart-sacks': 'A coal cart in a brick yard, dusty sacking covering its load. No horse attached; wheels have not moved since last night.',
  'candlestick-recovered': 'A heavy brass chamber candlestick beneath a lifted coal sack, with a visibly bent loop handle and blue wax pooled in its dish.',
  'room-packing': 'Nora’s small rear bedroom: clothes emptied beside a narrow bed, missing blanket, displaced rag rug and a vacant ring on the bedside table.',
  'room-blood': 'The same bedroom with a corner of the rag rug lifted, revealing a small dark dried blood stain on floorboards. No violence or body shown.',
  'sewing-case': 'Nora’s small wooden sewing case, needles, thread, cloth scraps; the torn wedding print lies inside its lid.',
  'service-route': 'Architectural view from the rear service landing down three broad shallow steps to the yard, with room for the large trunk and a projecting washhouse screening the far discovery corner.',
  'window-view': 'View from Baines’s low rear window: the landing and upper broad steps are visible, but the washhouse hides the discovery corner. Do not show the corner through walls.',
  'hearth-surface': 'Cold hearth in Arthur’s lodgings, burned wool clothing and partly burned newspaper among ash. No knife, sheath or clasp.',
  'hearth-clothing': 'Fire-damaged scraps of wool clothing among the ash. Dark stains are not forensically identified. No knife or sheath.',
  'unfinished-work': 'Maggie’s long workshop table with unfinished shirt seams, thread and scissors; practical late Victorian garment work.',
  'opening-sewing': 'A repaired dark sleeve beside Nora’s sewing case on the common-room table. Small careful stitches, work just completed.',
  'opening-trunk': 'Nora’s large strapped travelling trunk near the service entrance before departure, clean and closed; ordinary luggage in use.',
  'opening-candlestick': 'Brass chamber candlestick in ordinary evening use, bent loop handle and blue wax, carried towards Nora’s rear room.',
  'courtyard-knife': 'An ordinary unburned household knife with a plain wooden handle on an unfolded cloth, in Hale’s custody. No sheath, ornament or visible body.',
  'yard-discovery': 'Empty screened corner of the inn yard after official removal, damp brick and very little visible blood. No body and no scarf left behind.',
};

function document(id, title, format, pages) { return { id, title, format, ...(format === 'Mounted photograph' ? { presentation: 'photograph' } : {}), pages }; }
function page(artwork, heading, content) { return { label: heading, artwork, ...content }; }
