const RAW = [
    'yes', 'yeah', 'yep', 'yup', 'sure', 'sure thing', 'absolutely', 'definitely', 'of course',
    'ok', 'okay', 'kk', 'roger', 'affirmative', 'sounds good', 'go ahead', 'please', 'do it',
    'confirm', 'fine', 'works for me', 'why not', 'by all means', 'certainly',

    'بله', 'آره', 'اره', 'موافقم', 'حتما', 'لطفا', 'بفرمایید', 'باشه', 'اوکی', 'اوکیه',
    'مشکلی نیست', 'انجام بده', 'ادامه بده', 'تأیید', 'تایید',

    'ja', 'klar', 'sicher', 'natürlich', 'gern', 'gerne', 'ok', 'okay', 'in ordnung',
    'geht klar', 'mach weiter', 'mach es', 'bestätigen', 'kein problem', 'auf jeden fall',
    'absolut', 'jawohl', 'jo', 'jep',

    'oui', 'ouais', "d'accord", 'bien sûr', 'certainement', 'ok', 'okay', 'pas de problème',
    'allez-y', 'vas-y', 'confirmer', 'je confirme', 'entendu', 'absolument', 'volontiers', 'ça marche', 'bien entendu'
];

const normalize = s => s.normalize('NFC').toLowerCase().trim();

const AFFIRMATIONS = RAW.map(normalize);

const _escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const AFFIRMATION_REGEX = new RegExp(
    '\\b(?:' + AFFIRMATIONS.map(_escape).join('|') + ')\\b',
    'i'
);


export {AFFIRMATIONS, AFFIRMATION_REGEX};
export default AFFIRMATIONS;
