import { AdventureZoneId, BadgeInfo, QuestDefinition } from '@/types/phygital';

export interface ZoneMeta {
  id: AdventureZoneId;
  name_en: string;
  name_bn: string;
  tagline_en: string;
  tagline_bn: string;
  companion: 'leo' | 'maya' | 'both';
  accentBg: string;
  accentBorder: string;
  accentText: string;
  badgeCode: string;
}

export const ADVENTURE_ZONES: ZoneMeta[] = [
  {
    id: 'potion_gadget_lab',
    name_en: 'Potion & Gadget Lab',
    name_bn: 'জাদু ও যন্ত্রের পরীক্ষাগার',
    tagline_en: 'Test everyday wonders safely with Leo!',
    tagline_bn: 'লিওর সাথে নিরাপদে রোজকার বিজ্ঞানের জাদু দেখো!',
    companion: 'leo',
    accentBg: 'bg-sun/35',
    accentBorder: 'border-sun',
    accentText: 'text-ink',
    badgeCode: 'mini_scientist',
  },
  {
    id: 'world_explorers_compass',
    name_en: "World Explorer's Compass",
    name_bn: 'বিশ্ব অভিযাত্রীর কম্পাস',
    tagline_en: 'Spot nature patterns, weather & map your room with Maya!',
    tagline_bn: 'মায়ার সাথে প্রকৃতি, আবহাওয়া আর নিজের ঘরের মানচিত্র আঁকো!',
    companion: 'maya',
    accentBg: 'bg-sage/35',
    accentBorder: 'border-sage',
    accentText: 'text-ink',
    badgeCode: 'nature_detective',
  },
  {
    id: 'time_travelers_attic',
    name_en: "Time-Traveler's Attic",
    name_bn: 'সময়-ভ্রমণকারীর চিলেকোঠা',
    tagline_en: 'Collect family stories & old treasures with elders!',
    tagline_bn: 'দাদু-দিদার কাছ থেকে পুরনো দিনের গল্প আর স্মৃতি জোগাড় করো!',
    companion: 'maya',
    accentBg: 'bg-terracotta/20',
    accentBorder: 'border-terracotta',
    accentText: 'text-ink',
    badgeCode: 'story_keeper',
  },
  {
    id: 'word_weavers_treehouse',
    name_en: "Word-Weaver's Treehouse",
    name_bn: 'শব্দ-বোনার গাছবাড়ি',
    tagline_en: 'Weave joyful English & Bengali stories aloud!',
    tagline_bn: 'ইংরেজি ও বাংলায় মজার গল্প আর প্রবাদ বলো!',
    companion: 'both',
    accentBg: 'bg-sun/25',
    accentBorder: 'border-earth/40',
    accentText: 'text-ink',
    badgeCode: 'bengali_word_wizard',
  },
  {
    id: 'daily_hero_training',
    name_en: 'Daily Hero Training',
    name_bn: 'দৈনিক হিরো প্রশিক্ষণ',
    tagline_en: 'Build real-world habits & help at home!',
    tagline_bn: 'ভালো অভ্যাস গড়ো আর পরিবারকে সাহায্য করো!',
    companion: 'both',
    accentBg: 'bg-sage/30',
    accentBorder: 'border-sage',
    accentText: 'text-ink',
    badgeCode: 'everyday_hero',
  },
];

export const BADGE_CATALOG: BadgeInfo[] = [
  {
    badge_code: 'nature_detective',
    badge_name: 'Nature Detective',
    badge_description: 'Discovered natural wonders in the physical world.',
    zone: 'world_explorers_compass',
  },
  {
    badge_code: 'mini_scientist',
    badge_name: 'Mini Scientist',
    badge_description: 'Explored safe everyday science experiments with Leo.',
    zone: 'potion_gadget_lab',
  },
  {
    badge_code: 'story_keeper',
    badge_name: 'Story Keeper',
    badge_description: 'Preserved a family memory or folk tale.',
    zone: 'time_travelers_attic',
  },
  {
    badge_code: 'bengali_word_wizard',
    badge_name: 'Bengali Word Wizard',
    badge_description: 'Practiced joyful English & Bengali storytelling.',
    zone: 'word_weavers_treehouse',
  },
  {
    badge_code: 'family_explorer',
    badge_name: 'Family Explorer',
    badge_description: 'Completed an intergenerational discovery quest.',
    zone: 'time_travelers_attic',
  },
  {
    badge_code: 'everyday_hero',
    badge_name: 'Everyday Hero',
    badge_description: 'Built helpful real-world habits and responsibilities.',
    zone: 'daily_hero_training',
  },
  {
    badge_code: 'screen_free_champion',
    badge_name: 'Screen-Free Champion',
    badge_description: 'Charged the Offline Sun-Battery away from screens.',
    zone: 'offline_battery',
  },
];

export const QUEST_CATALOG: QuestDefinition[] = [
  // Zone A: Potion & Gadget Lab
  {
    code: 'lab_salt_dissolve',
    zone: 'potion_gadget_lab',
    category: 'discovery',
    xp: 20,
    title_en: 'The Disappearing Salt Mystery',
    title_bn: 'অদৃশ্য নুনের রহস্য',
    description_en: 'Stir one pinch of kitchen salt into a clear glass of drinking water and watch closely!',
    description_bn: 'এক গ্লাস পরিষ্কার জলে এক চিমটি নুন গুলে মন দিয়ে দেখো কী হয়!',
    safety_en: 'Ask an adult before using kitchen items. Only use plain water and clean table salt—never mix cleaners or unknown liquids.',
    safety_bn: 'রান্নাঘরের জিনিস নেওয়ার আগে বড়দের জিজ্ঞাসা করো। শুধু পরিষ্কার জল ও নুন ব্যবহার করবে।',
    age_hint: {
      junior: 'Count how many stirs it takes until you cannot see the salt grains anymore!',
      curious: 'Compare warm water vs cool water: which dissolves salt faster?',
      trailblazer: 'Think about molecules: where did the salt go even though the water looks clear?',
    },
    interactive_type: 'experiment',
    steps_en: [
      'Fill a clear glass halfway with drinking water.',
      'Add a small pinch of table salt and stir gently with a spoon.',
      'Observe if the salt disappears and explain why to Leo.',
    ],
    steps_bn: [
      'একটি স্বচ্ছ গ্লাসে অর্ধেক জল নাও।',
      'এক চিমটি নুন দিয়ে চামচ দিয়ে আস্তে নাড়ো।',
      'নুন অদৃশ্য হলো কি না দেখে লিওকে বুঝিয়ে বলো।',
    ],
  },
  {
    code: 'lab_three_leaves',
    zone: 'potion_gadget_lab',
    category: 'discovery',
    xp: 20,
    title_en: 'Three Leaf Shapes Detective',
    title_bn: 'তিন রকমের পাতা খোঁজা',
    description_en: 'Step outside or check houseplants to find three leaves with different shapes or edges.',
    description_bn: 'বাড়ির গাছ বা বাগান থেকে তিন রকম আকৃতির তিনটি পাতা খুঁজে দেখো।',
    safety_en: 'Only touch familiar safe plants or fallen leaves with adult permission.',
    safety_bn: 'শুধুমাত্র চেনা গাছ বা ঝরে পড়া পাতা ধরবে, অচেনা কাঁটাওয়ালা গাছ ধরবে না।',
    age_hint: {
      junior: 'Trace the biggest leaf with your finger—is it smooth or bumpy?',
      curious: 'Look at the veins on the underside. Do they look like a tree or straight lines?',
      trailblazer: 'Why might wide leaves vs narrow leaves help different plants survive?',
    },
    interactive_type: 'checklist',
    steps_en: [
      'Find 3 fallen or safe houseplant leaves of different shapes.',
      'Compare their edges (smooth, wavy, or jagged).',
      'Tell Leo one difference you spotted!',
    ],
    steps_bn: [
      'তিনটি আলাদা আকৃতির পাতা খুঁজে বের করো।',
      'তাদের কিনারা ও শিরা-উপশিরা মিলিয়ে দেখো।',
      'কী কী পার্থক্য দেখলে তা লিওকে জানাও!',
    ],
  },
  {
    code: 'lab_ice_floats',
    zone: 'potion_gadget_lab',
    category: 'discovery',
    xp: 20,
    title_en: 'Why Does Ice Float?',
    title_bn: 'বরফ জলে ভাসে কেন?',
    description_en: 'Drop a single ice cube into a glass of water and watch whether it sinks or floats.',
    description_bn: 'এক গ্লাস জলে এক টুকরো বরফ ছেড়ে দিয়ে দেখো সেটা ডোবে না ভাসে।',
    safety_en: 'Use clean drinking water and an ice cube from the freezer.',
    safety_bn: 'ফ্রিজের পরিষ্কার বরফ ও জল ব্যবহার করো।',
    age_hint: {
      junior: 'Does the ice stay at the top or sink to the bottom?',
      curious: 'How much of the ice cube pokes above the water surface?',
      trailblazer: 'Explain how frozen water expands and becomes less dense than liquid water.',
    },
    interactive_type: 'experiment',
    steps_en: [
      'Place one ice cube into a clear glass of water.',
      'Notice how much sits above vs below the waterline.',
      'Share your hypothesis with Leo!',
    ],
    steps_bn: [
      'একটি স্বচ্ছ জলের গ্লাসে এক টুকরো বরফ রাখো।',
      'বরফের কতটুকু জলের ওপরে ভাসছে তা লক্ষ্য করো।',
      'তোমার ধারণা লিওকে বলো!',
    ],
  },

  // Zone B: World Explorer's Compass
  {
    code: 'compass_room_map',
    zone: 'world_explorers_compass',
    category: 'discovery',
    xp: 20,
    title_en: 'Cartographer of My Room',
    title_bn: 'আমার ঘরের মানচিত্র আঁকা',
    description_en: 'Look around your room like an explorer and sketch a bird’s-eye map using our drawing board!',
    description_bn: 'অভিযাত্রীর মতো চারপাশ দেখে তোমার ঘরের ওপর থেকে দেখা একটা মানচিত্র আঁকো!',
    age_hint: {
      junior: 'Draw your bed, door, and favorite window!',
      curious: 'Add a compass rose (N/S/E/W) pointing toward where the morning sun rises.',
      trailblazer: 'Include a map legend and approximate scale steps across the room.',
    },
    interactive_type: 'map_draw',
    steps_en: [
      'Walk around your room and count footsteps along two walls.',
      'Draw the door, bed, desk, and window on the Explorer Canvas.',
      'Mark North or the sunrise window!',
    ],
    steps_bn: [
      'ঘরের চারপাশ হেঁটে দরজা, খাট, টেবিল ও জানালার অবস্থান দেখো।',
      'এক্সপ্লোরার ক্যানভাসে ঘরের মানচিত্র এঁকে ফেলো।',
      'সূর্য ওঠার দিক বা উত্তর দিক চিহ্নিত করো!',
    ],
  },
  {
    code: 'compass_five_natural',
    zone: 'world_explorers_compass',
    category: 'discovery',
    xp: 20,
    title_en: 'Five Natural Wonders Hunt',
    title_bn: 'পাঁচটি প্রাকৃতিক উপাদান খোঁজা',
    description_en: 'Look from your window, balcony, or yard and spot five natural things (clouds, pebbles, birds, bark, soil).',
    description_bn: 'জানালা, বারান্দা বা উঠোন থেকে পাঁচটি প্রাকৃতিক জিনিস খুঁজে দেখো।',
    age_hint: {
      junior: 'Point out 5 natural colors you see without moving from a safe spot!',
      curious: 'Group what you find into living vs non-living nature.',
      trailblazer: 'Describe how weather or sunlight affects one of those natural elements today.',
    },
    interactive_type: 'checklist',
    steps_en: [
      'Spot a cloud, bird, or tree from a window or yard.',
      'Spot a stone, soil, or water droplet.',
      'Note today’s weather (sunny, breezy, rainy, cloudy).',
    ],
    steps_bn: [
      'জানালা বা উঠোন থেকে মেঘ, পাখি বা গাছ খুঁজে দেখো।',
      'পাথর, মাটি বা জলের ফোঁটা লক্ষ্য করো।',
      'আজকের আবহাওয়া কেমন (রোদ, হাওয়া, মেঘলা, বৃষ্টি) তা লেখো।',
    ],
  },

  // Zone C: Time-Traveler's Attic
  {
    code: 'attic_elder_games',
    zone: 'time_travelers_attic',
    category: 'family_story',
    xp: 30,
    title_en: 'Grandparent Childhood Games Capsule',
    title_bn: 'দাদু-দিদার ছোটবেলার খেলার গল্প',
    description_en: 'Ask a grandparent or elder: "What outdoor games did you play when you were my age?"',
    description_bn: 'দাদু, দিদা বা বাড়ির বড় কাউকে জিজ্ঞেস করো: "তোমাদের ছোটবেলায় তোমরা কী খেলা খেলতে?"',
    age_hint: {
      junior: 'Ask what their favorite game was and who they played with!',
      curious: 'Ask if they made any toys from natural materials like clay, paper, or seeds.',
      trailblazer: 'Compare how neighborhood games then differed from digital games today.',
    },
    interactive_type: 'voice_capsule',
    steps_en: [
      'Ask your grandparent or elder for permission before recording.',
      'Record their story or write down what you learned together.',
      'Unlock a Story Keeper Memory Card!',
    ],
    steps_bn: [
      'রেকর্ড করার আগে অবশ্যই বড়দের অনুমতি নাও।',
      'তাঁদের গল্প রেকর্ড করো অথবা একসাথে লিখে রাখো।',
      'একটি মেমরি কার্ড আনলক করো!',
    ],
  },
  {
    code: 'attic_old_object',
    zone: 'time_travelers_attic',
    category: 'discovery',
    xp: 20,
    title_en: 'Mystery Heirloom Detective',
    title_bn: 'পুরনো দিনের জিনিসের রহস্য',
    description_en: 'Find an old household object (brass cup, lantern, radio, or handwritten letter) and ask its story.',
    description_bn: 'বাড়ির পুরনো কোনো জিনিস (কাঁসার গ্লাস, পুরনো চিঠি, রেডিও বা ঘড়ি) খুঁজে তার গল্প জানো।',
    age_hint: {
      junior: 'What is it made of—wood, metal, cloth, or paper?',
      curious: 'How do people use a modern version of this item today?',
      trailblazer: 'Estimate which decade it came from and what daily life was like then.',
    },
    interactive_type: 'checklist',
    steps_en: [
      'Ask a parent to show you an older household item.',
      'Notice what material it is made from.',
      'Describe one thing that has changed in modern versions.',
    ],
    steps_bn: [
      'মা-বাবার কাছ থেকে বাড়ির কোনো পুরনো জিনিস দেখতে চাও।',
      'এটি কী দিয়ে তৈরি তা লক্ষ্য করো।',
      'আজকের আধুনিক জিনিসের সাথে এর একটি পার্থক্য বলো।',
    ],
  },

  // Zone D: Word-Weaver's Treehouse
  {
    code: 'words_bengali_proverb',
    zone: 'word_weavers_treehouse',
    category: 'speaking',
    xp: 25,
    title_en: 'Teach Leo a Bengali Word & Proverb',
    title_bn: 'লিওকে একটি বাংলা শব্দ ও প্রবাদ শেখাও',
    description_en: 'Say or type a favorite Bengali word or proverb (like "একতাই বল" — Unity is Strength) and explain it in English!',
    description_bn: 'তোমার প্রিয় একটি বাংলা শব্দ বা প্রবাদ (যেমন "একতাই বল") ইংরেজিতে লিওকে বুঝিয়ে বলো!',
    age_hint: {
      junior: 'Teach Leo the Bengali word for "sun" (সূর্য), "tree" (গাছ), or "book" (বই)!',
      curious: 'Translate a short Bengali proverb and share a real-life example.',
      trailblazer: 'Create a mini 3-sentence bilingual story mixing English and Bengali naturally.',
    },
    interactive_type: 'speaking',
    steps_en: [
      'Pick a Bengali word or proverb you like.',
      'Say it aloud or type it for Leo & Maya.',
      'Share what it means in your own words!',
    ],
    steps_bn: [
      'তোমার পছন্দের একটি বাংলা শব্দ বা প্রবাদ বেছে নাও।',
      'লিও ও মায়াকে জোরে পড়ে শোনাও বা লিখে দাও।',
      'তোমার নিজের ভাষায় এর মানে বলো!',
    ],
  },
  {
    code: 'words_describe_object',
    zone: 'word_weavers_treehouse',
    category: 'speaking',
    xp: 25,
    title_en: 'Storyteller’s Object Spotlight',
    title_bn: 'জিনিস দেখে গল্প বানানো',
    description_en: 'Hold any object near you and describe its color, texture, and a funny secret adventure it had!',
    description_bn: 'হাতের কাছের যেকোনো জিনিস নিয়ে তার রঙ, গড়ন আর একটা মজার কাল্পনিক গল্প বলো!',
    age_hint: {
      junior: 'Use 3 describing words: soft/hard, shiny/matte, big/tiny.',
      curious: 'Invent one place that object would love to travel to.',
      trailblazer: 'Tell a vivid 4-sentence story using at least one Bengali idiom or simile.',
    },
    interactive_type: 'speaking',
    steps_en: [
      'Pick up a safe everyday object nearby.',
      'Describe how it feels and looks.',
      'Give it a 2-sentence storybook adventure!',
    ],
    steps_bn: [
      'কাছাকাছি থাকা নিরাপদ একটি জিনিস হাতে নাও।',
      'এটি দেখতে ও ছুঁতে কেমন তা বর্ণনা করো।',
      'একে নিয়ে দুই লাইনের একটি মজার গল্প বানাও!',
    ],
  },

  // Zone E: Daily Hero Training
  {
    code: 'hero_tidy_desk',
    zone: 'daily_hero_training',
    category: 'simple',
    xp: 15,
    title_en: 'Banish the Study Desk Clutter Monster',
    title_bn: 'পড়ার টেবিলের অগোছালো দৈত্য তাড়াও',
    description_en: 'Stack your books neatly, put pencils in their cup, and clear paper scraps from your study space.',
    description_bn: 'বইগুলো গুছিয়ে রাখো, পেনসিলগুলো কলমদানিতে রাখো আর পড়ার টেবিল পরিষ্কার করো।',
    age_hint: {
      junior: 'Put 5 items back in their cozy home!',
      curious: 'Sort books by size and recycle scrap papers.',
      trailblazer: 'Set up tomorrow’s study checklist before finishing.',
    },
    interactive_type: 'habit',
    steps_en: [
      'Put pencils and pens into their holder.',
      'Stack notebooks and textbooks neatly.',
      'Wipe or clear any scraps off the desk.',
    ],
    steps_bn: [
      'কলম ও পেনসিলগুলো কলমদানিতে গুছিয়ে রাখো।',
      'বই ও খাতাগুলো সুন্দর করে সাজিয়ে রাখো।',
      'টেবিলের ওপরের অপ্রয়োজনীয় কাগজ সরিয়ে ফেলো।',
    ],
  },
  {
    code: 'hero_water_plant',
    zone: 'daily_hero_training',
    category: 'simple',
    xp: 15,
    title_en: 'Thirsty Plant Caretaker',
    title_bn: 'গাছের যত্ন নেওয়া হিরো',
    description_en: 'Check the soil of a home plant—if it feels dry, gently give it water!',
    description_bn: 'বাড়ির একটি গাছের মাটি ছুঁয়ে দেখো—শুকনো লাগলে অল্প করে জল দাও!',
    age_hint: {
      junior: 'Touch the soil gently first—plants do not like drowning in puddles!',
      curious: 'Notice whether the leaves look perkier after an hour.',
      trailblazer: 'Learn whether your plant prefers direct sun or shade.',
    },
    interactive_type: 'habit',
    steps_en: [
      'Check if the soil feels dry with your fingertip.',
      'Pour a small cup of water near the roots.',
      'Wash your hands afterward!',
    ],
    steps_bn: [
      'আঙুল দিয়ে মাটি শুকনো কি না পরীক্ষা করো।',
      'গাছের গোড়ায় অল্প করে জল দাও।',
      'কাজ শেষে ভালো করে হাত ধুয়ে নাও!',
    ],
  },
  {
    code: 'hero_wash_hands',
    zone: 'daily_hero_training',
    category: 'simple',
    xp: 10,
    title_en: '20-Second Germ-Buster Scrub',
    title_bn: '২০ সেকেন্ডের হাত ধোয়া চ্যালেঞ্জ',
    description_en: 'Wash your hands with soap and water while humming a cheerful song for 20 seconds.',
    description_bn: 'সাবান ও জল দিয়ে আনন্দের একটি ছড়া গাইতে গাইতে ২০ সেকেন্ড হাত ধুয়ে নাও।',
    age_hint: {
      junior: 'Scrub palms, backs of hands, and thumbs like bubbles are magic!',
      curious: 'Remember to turn off the tap while lathering soap to save water.',
      trailblazer: 'Help remind a younger sibling or family member before dinner.',
    },
    interactive_type: 'habit',
    steps_en: [
      'Wet hands, apply soap, and turn off tap while scrubbing.',
      'Scrub for 20 seconds (sing Happy Birthday twice!).',
      'Rinse cleanly and dry with a towel.',
    ],
    steps_bn: [
      'হাত ভিজিয়ে সাবান মাখো, ঘষার সময় কল বন্ধ রাখো।',
      '২০ সেকেন্ড ভালোভাবে আঙুল ও হাত ঘষো।',
      'পরিষ্কার জলে ধুয়ে তোয়ালে দিয়ে মুছে নাও।',
    ],
  },
];

export const OFFLINE_MISSION_TEMPLATES: Array<{
  id: string;
  title_en: string;
  title_bn: string;
  minutes: 15 | 20 | 30;
  energy: number;
  xp: number;
}> = [
  {
    id: 'offline_map_15',
    title_en: 'Paper & Crayon Room Map',
    title_bn: 'কাগজ-কলমে ঘরের মানচিত্র আঁকা',
    minutes: 15,
    energy: 20,
    xp: 20,
  },
  {
    id: 'offline_read_20',
    title_en: 'Cozy Storybook Reading (20 min)',
    title_bn: 'গল্পের বই পড়া (২০ মিনিট)',
    minutes: 20,
    energy: 30,
    xp: 30,
  },
  {
    id: 'offline_family_30',
    title_en: 'Help Prepare Dinner Table & Chat',
    title_bn: 'রাতের খাবারের টেবিল সাজানো ও গল্প করা',
    minutes: 30,
    energy: 40,
    xp: 30,
  },
];
