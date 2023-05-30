import language from '@google-cloud/language';

export const EXTREMELY_NEGATIVE = -4;
export const VERY_NEGATIVE = -3;
export const NEGATIVE = -2;
export const NEUTRAL_NEGATIVE = -1;
export const NEUTRAL = 0;
export const NEUTRAL_POSITIVE = 1;
export const POSITIVE = 2;
export const VERY_POSITIVE = 3;
export const EXTREMELY_POSITIVE = 4;

const client = new language.LanguageServiceClient();

export async function annotateText(text) {
    const document = {
        content: text,
        type: 'PLAIN_TEXT'
    };
    const features = {
        extractSyntax: true,
        extractDocumentSentiment: true,
        extractEntitySentiment: true,
        classifyText: true
    };
    const [ result ] = await client.annotateText({ document, features });
    return result;
}

export async function analyzeSyntax(text) {
    const document = {
        content: text,
        type: 'PLAIN_TEXT'
    };
    const [ result ] = await client.analyzeSyntax({ document });
    // TODO: map and simplify 
    return result;
}

export async function analyzeEntitySentiment(text) {
    const document = {
        content: text,
        type: 'PLAIN_TEXT'
    };
    const [ result ] = await client.analyzeEntitySentiment({ document });
    return result;
}

export async function analyzeSentiment(text) {
    const document = {
        content: text,
        type: 'PLAIN_TEXT'
    };
    const [ { sentences } ] = await client.analyzeSentiment({ document });
    return sentences.map(({ text: { content }, sentiment: { magnitude, score } }) => {
        const weight = (score + (magnitude * Math.sign(score))) / 2;
        const result = {
                content,
                score,
                magnitude
        };
        if (weight < -0.88) {
            return {
                ...result,
                sentiment: EXTREMELY_NEGATIVE,
            };
        }
        if (weight < -0.67) {
            return {
                ...result,
                sentiment: VERY_NEGATIVE,
            };
        }
        if (weight < -0.3) {
            return {
                ...result,
                sentiment: NEGATIVE,
            };
        }
        if (weight < -0.15) {
            return {
                ...result,
                sentiment: NEUTRAL_NEGATIVE,
            };
        }
        if (weight < 0.15) {
            return {
                ...result,
                sentiment: NEUTRAL
            };
        }
        if (weight < 0.3) {
            return {
                ...result,
                sentiment: NEUTRAL_POSITIVE,
            };
        }
        if (weight < 0.67) {
            return {
                ...result,
                sentiment: POSITIVE,
            };
        }
        if (weight < 0.88) {
            return {
                ...result,
                sentiment: VERY_POSITIVE,
            };
        }
        return {
            ...result,
            sentiment: EXTREMELY_POSITIVE,
        };
    });
}

export async function autoSSML(text) {
    const sentences = await analyzeSentiment(text);
    let ssml = '<speak>';
    for (const { content, sentiment } of sentences) {
        ssml += '<s>';
        if (sentiment === EXTREMELY_NEGATIVE) {
            ssml += `<prosody rate="x-slow" pitch="-3st">${content}</prosody>`;
        } else if (sentiment === VERY_NEGATIVE) {
            ssml += `<prosody rate="fast" pitch="-2st">${content}</prosody>`;
        } else if (sentiment === NEGATIVE) {
            ssml += `<prosody pitch="-1st">${content}</prosody>`;
        } else if (sentiment === POSITIVE) {
            ssml += `<prosody pitch="+1st">${content}</prosody>`;
        } else if (sentiment === VERY_POSITIVE) {
            ssml += `<prosody rate="fast" pitch="+1st">${content}</prosody>`;
        } else if (sentiment === EXTREMELY_POSITIVE) {
            ssml += `<prosody rate="x-slow" pitch="+2st">${content}</prosody>`;
        } else {
            ssml += content;
        }
        ssml += '</s>';
    }
    ssml += '</speak>';
    return ssml;
}

//import { pprint } from './util.js';
//pprint(await autoSSML(`Wow! This is amazing! But, I'm so sorry that your Dad isn't here to see it. I'm so sorry he died. He would have found the whole situation hilarious. Ha ha! That bastard. I'm so mad at him. I LOVE YOU MORE THAN YOU CAN EVER KNOW!`));
//pprint(await annotateText(`Wow! This is amazing! But, I'm so sorry that your Dad isn't here to see it. I'm so sorry he died. He would have found the whole situation hilarious. Ha ha! That bastard. I'm so mad at him. I LOVE YOU MORE THAN YOU CAN EVER KNOW!`));
//pprint(await analyzeSyntax(`Wow! This is amazing! But, I'm so sorry that your Dad isn't here to see it. I'm so sorry he died. He would have found the whole situation hilarious. Ha ha! That bastard. I'm so mad at him. I LOVE YOU MORE THAN YOU CAN EVER KNOW!`));
//pprint(await analyzeSentiment(`Wow! This is amazing! But, I'm so sorry that your Dad isn't here to see it. I'm so sorry he died. He would have found the whole situation hilarious. Ha ha! That bastard. I'm so mad at him. I LOVE YOU MORE THAN YOU CAN EVER KNOW!`));
//pprint(await analyzeEntitySentiment(`Wow! This is amazing! But, I'm so sorry that your Dad isn't here to see it. I'm so sorry he died. He would have found the whole situation hilarious. Ha ha! That bastard. I'm so mad at him. I LOVE YOU MORE THAN YOU CAN EVER KNOW!`));



//[
    //{
      //text: { content: 'Wow', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'X',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 0, label: 'ROOT' },
      //lemma: 'Wow'
    //},
    //{
      //text: { content: '!', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'PUNCT',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 0, label: 'P' },
      //lemma: '!'
    //},
    //{
      //text: { content: 'This', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'DET',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'SINGULAR',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 3, label: 'NSUBJ' },
      //lemma: 'This'
    //},
    //{
      //text: { content: 'is', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'VERB',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'INDICATIVE',
        //number: 'SINGULAR',
        //person: 'THIRD',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'PRESENT',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 3, label: 'ROOT' },
      //lemma: 'be'
    //},
    //{
      //text: { content: 'amazing', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'ADJ',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 3, label: 'ACOMP' },
      //lemma: 'amazing'
    //},
    //{
      //text: { content: '!', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'PUNCT',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 3, label: 'P' },
      //lemma: '!'
    //},
    //{
      //text: { content: 'But', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'CONJ',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 9, label: 'CC' },
      //lemma: 'But'
    //},
    //{
      //text: { content: ',', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'PUNCT',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 9, label: 'P' },
      //lemma: ','
    //},
    //{
      //text: { content: 'I', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'PRON',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'NOMINATIVE',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'SINGULAR',
        //person: 'FIRST',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 9, label: 'NSUBJ' },
      //lemma: 'I'
    //},
    //{
      //text: { content: "'m", beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'VERB',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'INDICATIVE',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'PRESENT',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 9, label: 'ROOT' },
      //lemma: 'be'
    //},
    //{
      //text: { content: 'so', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'ADV',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 11, label: 'ADVMOD' },
      //lemma: 'so'
    //},
    //{
      //text: { content: 'sorry', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'ADJ',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 9, label: 'ACOMP' },
      //lemma: 'sorry'
    //},
    //{
      //text: { content: 'that', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'ADP',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 15, label: 'MARK' },
      //lemma: 'that'
    //},
    //{
      //text: { content: 'your', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'PRON',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'GENITIVE',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'SINGULAR',
        //person: 'SECOND',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 14, label: 'POSS' },
      //lemma: 'your'
    //},
    //{
      //text: { content: 'Dad', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'NOUN',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'SINGULAR',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 15, label: 'NSUBJ' },
      //lemma: 'Dad'
    //},
    //{
      //text: { content: 'is', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'VERB',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'INDICATIVE',
        //number: 'SINGULAR',
        //person: 'THIRD',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'PRESENT',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 11, label: 'CCOMP' },
      //lemma: 'be'
    //},
    //{
      //text: { content: "n't", beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'ADV',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 15, label: 'NEG' },
      //lemma: "n't"
    //},
    //{
      //text: { content: 'here', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'ADV',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'SINGULAR',
        //person: 'THIRD',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 15, label: 'ADVMOD' },
      //lemma: 'here'
    //},
    //{
      //text: { content: 'to', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'PRT',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 19, label: 'AUX' },
      //lemma: 'to'
    //},
    //{
      //text: { content: 'see', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'VERB',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 15, label: 'XCOMP' },
      //lemma: 'see'
    //},
    //{
      //text: { content: 'it', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'PRON',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'ACCUSATIVE',
        //form: 'FORM_UNKNOWN',
        //gender: 'NEUTER',
        //mood: 'MOOD_UNKNOWN',
        //number: 'SINGULAR',
        //person: 'THIRD',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 19, label: 'DOBJ' },
      //lemma: 'it'
    //},
    //{
      //text: { content: '.', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'PUNCT',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 9, label: 'P' },
      //lemma: '.'
    //},
    //{
      //text: { content: 'I', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'PRON',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'NOMINATIVE',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'SINGULAR',
        //person: 'FIRST',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 23, label: 'NSUBJ' },
      //lemma: 'I'
    //},
    //{
      //text: { content: "'m", beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'VERB',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'INDICATIVE',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'PRESENT',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 23, label: 'ROOT' },
      //lemma: 'be'
    //},
    //{
      //text: { content: 'so', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'ADV',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 25, label: 'ADVMOD' },
      //lemma: 'so'
    //},
    //{
      //text: { content: 'sorry', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'ADJ',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 23, label: 'ACOMP' },
      //lemma: 'sorry'
    //},
    //{
      //text: { content: 'he', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'PRON',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'NOMINATIVE',
        //form: 'FORM_UNKNOWN',
        //gender: 'MASCULINE',
        //mood: 'MOOD_UNKNOWN',
        //number: 'SINGULAR',
        //person: 'THIRD',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 27, label: 'NSUBJ' },
      //lemma: 'he'
    //},
    //{
      //text: { content: 'died', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'VERB',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'INDICATIVE',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'PAST',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 25, label: 'CCOMP' },
      //lemma: 'die'
    //},
    //{
      //text: { content: '.', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'PUNCT',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 23, label: 'P' },
      //lemma: '.'
    //},
    //{
      //text: { content: 'He', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'PRON',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'NOMINATIVE',
        //form: 'FORM_UNKNOWN',
        //gender: 'MASCULINE',
        //mood: 'MOOD_UNKNOWN',
        //number: 'SINGULAR',
        //person: 'THIRD',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 32, label: 'NSUBJ' },
      //lemma: 'He'
    //},
    //{
      //text: { content: 'would', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'VERB',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 32, label: 'AUX' },
      //lemma: 'would'
    //},
    //{
      //text: { content: 'have', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'VERB',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 32, label: 'AUX' },
      //lemma: 'have'
    //},
    //{
      //text: { content: 'found', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'VERB',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'PAST',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 32, label: 'ROOT' },
      //lemma: 'find'
    //},
    //{
      //text: { content: 'the', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'DET',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 35, label: 'DET' },
      //lemma: 'the'
    //},
    //{
      //text: { content: 'whole', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'ADJ',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 35, label: 'AMOD' },
      //lemma: 'whole'
    //},
    //{
      //text: { content: 'situation', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'NOUN',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'SINGULAR',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 36, label: 'NSUBJ' },
      //lemma: 'situation'
    //},
    //{
      //text: { content: 'hilarious', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'ADJ',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 32, label: 'ACOMP' },
      //lemma: 'hilarious'
    //},
    //{
      //text: { content: '.', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'PUNCT',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 32, label: 'P' },
      //lemma: '.'
    //},
    //{
      //text: { content: 'Ha', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'X',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'SINGULAR',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 38, label: 'ROOT' },
      //lemma: 'Ha'
    //},
    //{
      //text: { content: 'ha', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'X',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 38, label: 'DEP' },
      //lemma: 'ha'
    //},
    //{
      //text: { content: '!', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'PUNCT',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 38, label: 'P' },
      //lemma: '!'
    //},
    //{
      //text: { content: 'That', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'DET',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'SINGULAR',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 42, label: 'DET' },
      //lemma: 'That'
    //},
    //{
      //text: { content: 'bastard', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'NOUN',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'SINGULAR',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 42, label: 'ROOT' },
      //lemma: 'bastard'
    //},
    //{
      //text: { content: '.', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'PUNCT',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 42, label: 'P' },
      //lemma: '.'
    //},
    //{
      //text: { content: 'I', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'PRON',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'NOMINATIVE',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'SINGULAR',
        //person: 'FIRST',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 45, label: 'NSUBJ' },
      //lemma: 'I'
    //},
    //{
      //text: { content: "'m", beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'VERB',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'INDICATIVE',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'PRESENT',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 45, label: 'ROOT' },
      //lemma: 'be'
    //},
    //{
      //text: { content: 'so', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'ADV',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 47, label: 'ADVMOD' },
      //lemma: 'so'
    //},
    //{
      //text: { content: 'mad', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'ADJ',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 45, label: 'ACOMP' },
      //lemma: 'mad'
    //},
    //{
      //text: { content: 'at', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'ADP',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 47, label: 'PREP' },
      //lemma: 'at'
    //},
    //{
      //text: { content: 'him', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'PRON',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'ACCUSATIVE',
        //form: 'FORM_UNKNOWN',
        //gender: 'MASCULINE',
        //mood: 'MOOD_UNKNOWN',
        //number: 'SINGULAR',
        //person: 'THIRD',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 48, label: 'POBJ' },
      //lemma: 'him'
    //},
    //{
      //text: { content: '.', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'PUNCT',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 45, label: 'P' },
      //lemma: '.'
    //},
    //{
      //text: { content: 'I', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'PRON',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'NOMINATIVE',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'SINGULAR',
        //person: 'FIRST',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 52, label: 'NSUBJ' },
      //lemma: 'I'
    //},
    //{
      //text: { content: 'LOVE', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'VERB',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'INDICATIVE',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'PRESENT',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 52, label: 'ROOT' },
      //lemma: 'LOVE'
    //},
    //{
      //text: { content: 'YOU', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'PRON',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'NOMINATIVE',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'SECOND',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 52, label: 'DOBJ' },
      //lemma: 'YOU'
    //},
    //{
      //text: { content: 'MORE', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'ADJ',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 52, label: 'ADVMOD' },
      //lemma: 'MORE'
    //},
    //{
      //text: { content: 'THAN', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'ADP',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 59, label: 'MARK' },
      //lemma: 'THAN'
    //},
    //{
      //text: { content: 'YOU', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'PRON',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'NOMINATIVE',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'SECOND',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 59, label: 'NSUBJ' },
      //lemma: 'YOU'
    //},
    //{
      //text: { content: 'CAN', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'VERB',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 59, label: 'AUX' },
      //lemma: 'CAN'
    //},
    //{
      //text: { content: 'EVER', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'ADV',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 59, label: 'ADVMOD' },
      //lemma: 'EVER'
    //},
    //{
      //text: { content: 'KNOW', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'VERB',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 52, label: 'ADVCL' },
      //lemma: 'KNOW'
    //},
    //{
      //text: { content: '!', beginOffset: -1 },
      //partOfSpeech: {
        //tag: 'PUNCT',
        //aspect: 'ASPECT_UNKNOWN',
        //case: 'CASE_UNKNOWN',
        //form: 'FORM_UNKNOWN',
        //gender: 'GENDER_UNKNOWN',
        //mood: 'MOOD_UNKNOWN',
        //number: 'NUMBER_UNKNOWN',
        //person: 'PERSON_UNKNOWN',
        //proper: 'PROPER_UNKNOWN',
        //reciprocity: 'RECIPROCITY_UNKNOWN',
        //tense: 'TENSE_UNKNOWN',
        //voice: 'VOICE_UNKNOWN'
      //},
      //dependencyEdge: { headTokenIndex: 52, label: 'P' },
      //lemma: '!'
    //}
  //]
