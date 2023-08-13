import fs from 'node:fs';
import { writeFile } from 'node:fs/promises';

import axios from 'axios';
import textToSpeech from '@google-cloud/text-to-speech';
import { exec, spawn } from './util.js';
import { openai } from './openai.js';

const ssmlPrompt = [
    {
        role: 'system',
        content: `Please liberally annotate user input with SSML tags appropriate to the emotion being conveyed. Represent as much emotion as you can. Your response should consist of just the SSML document without additional commentary.

Use only the following SSML tags:

  - \`speak\`
  - \`break\`
  - \`say‑as\`
  - \`p\`
  - \`s\`
  - \`sub\`
  - \`mark\`
  - \`prosody\`
  - \`emphasis\`
  - \`par\`
  - \`seq\`
  - \`media\`
  - \`audio\`
  - \`phoneme\`

Do not use the \`express-as\` tag.

The \`interpret-as\` attribute of the \`say-as\` tag supports the following values:

  - "currency"
  - "telephone"
  - "verbatim"
  - "spell-out"
  - "date"
  - "characters"
  - "cardinal"
  - "ordinal"
  - "fraction"
  - "expletive"
  - "bleep"
  - "unit"
  - "time"

When using the \`emphasis\` tag make sure to wrap the entire sentence and not just a piece of it.`
    }, {
        role: 'user',
        content: `Wow! This is amazing! But... I'm so sorry that your Dad isn't here to see it. I'm so sorry he died. He would have found the whole situation hilarious. Ha ha! That bastard. I'm so mad at him.`
    }, {
        role: 'assistant',
        content: `<speak>
<p><s><prosody rate="slow" pitch="+3st">Wow!</prosody></s> <break time="100ms"/> <emphasis><s>This is <prosody rate="x-slow" pitch="+2st">amazing</prosody>!</s></emphasis></p>
<p><s><prosody rate="slow">But...</prosody></s> <break time="100ms"/> <s><prosody rate="slow" pitch="-2st">I'm so sorry that your Dad isn't here to see it.</prosody></s></p>
<p><s>I'm so sorry he died.</s></p>
<p><s><prosody rate="fast">He would have found the whole situation</prosody> <prosody rate="slow" pitch="-2st">hilarious</prosody>.</s> <prosody rate="fast" pitch="+2st"><say-as interpret-as="interjection">Ha ha!</say-as></prosody></p>
<p><s>That bastard.</s></p>
<p><emphasis level="strong"><s>I'm so <prosody rate="slow" pitch="+1st">mad</prosody> at him.</s></emphasis></p>
</speak>`
    }
// 
];

const mimicVoices = {

    lyra: 'en_US/vctk_low%23p233', // DEFAULT

    jeeves: 'en_UK/apope_low',
    martin: 'en_US/vctk_low%23p278',
    fiona: 'en_US/vctk_low%23s5',
    cameron: 'en_US/cmu-arctic_low%23jmk',
    simon: 'en_US/cmu-arctic_low%23rxr', // the nervous one
    fatima: 'en_US/cmu-arctic_low%23axb', // chef
    april: 'en_US/cmu-arctic_low%23clb', // nihilist
    cara: 'en_US/hifi-tts_low%2392', // irish scientist
    tara: 'en_US/vctk_low%23p236', // cara's sister?
    maryann: 'en_US/m-ailabs_low%23mary_ann', // ships computer
    kelly: 'en_US/vctk_low%23p250', // ships computer
    jen: 'en_US/vctk_low%23p310',
    zuri: 'en_US/vctk_low%23p269',
};

const setMimicDefaults = options => {

    const config = {};

    config.ssml = options?.ssml ?? false;
    config.voice = options?.voice ?? mimicVoices.lyra;
    config.noiseScale = options?.noiseScale ??  0.667;
    config.noiseW = options?.noiseW ?? 0.8;
    config.lengthScale = options?.lengthScale ?? 1; // speed

    return config;
};

const setGoogleDefaults = options => {

    const config = {};

    config.ssml = options?.ssml ?? false;
    config.voice = options?.voice ?? 'en-US/en-US-Neural2-F/FEMALE';

    return config;
};

const setElevenDefaults = options => {
    const config = {};
    config.voiceID = options?.voice ?? 'J6eke8tT5Kdd5aj78EL7'; // 'nlJhUZySt38JRvrfLx27'; //'ec46ozMJSj85SYCvY1jb';
    config.stability = options?.stability ?? 0.3;
    config.similarityBoost = options?.similarityBoost ?? 0.7;
    config.modelId = options?.modelId ?? 'eleven_multilingual_v1';
    return config;
};


const getSynthProviderConfig = (providerName, options) =>
      providerName === 'mimic'  ? setMimicDefaults(options)
    : providerName === 'google' ? setGoogleDefaults(options)
    : providerName === 'eleven' ? setElevenDefaults(options)
    :                             void 0;

export const getSynthProvider = providerName =>
      providerName == 'mimic'   ? getMimicSynthAudio
    : providerName == 'google'  ? getGoogleSynthAudio
    : providerName == 'eleven'  ? getElevenSynthAudio
    :                             void 0;

export async function getSynthAudio(providerName, text, options) {
    if (!text) {
        console.error('@getSynthAudio - no text');
        return;
    }
    const provider = getSynthProvider(providerName);
    const providerConfig = getSynthProviderConfig(providerName, options);
    return provider(text, providerConfig);
};

export async function getMimicSynthAudio(text, options) {
    // echo 'Hello World' | http POST :59125/api/tts?voice=en_US/vctk_low%23s5 > output.wav && afplay output.wav
    const { ssml, voice, noiseScale, noiseW, lengthScale } = options;
    text = ssml ? text.replace(/>\s+</g, '><') : text; // because mimic is bugging in ssml mode and makes extraneous staticy noises when there is whitespace between ssml tags
    const config = {
        method: 'post',
        url: `http://localhost:59125/api/tts?voice=${voice}&noiseScale=${noiseScale}&noiseW=${noiseW}&lengthScale=${lengthScale}&ssml=${ssml}`,
        responseType: 'arraybuffer',
        headers: {
            'Content-Type': 'text/plain',
            'Accept': 'audio/wav'
        },
        transformResponse: r => r,
        data: text
    };
    console.log('about to post tts request', config);
    try {
        const response = await axios.request(config);
        return response.data;
    } catch (error) {
        console.log('error posting tts request', error);
    }
}

export async function getGoogleSynthAudio(text, options) {
    const { ssml = false, voice:voice_key = 'en-US/en-US-Neural2-F/FEMALE' } = options;
    const client = new textToSpeech.TextToSpeechClient();
    const input = ssml ? { ssml: text } : { text };
    const [ languageCode, name, ssmlGender ] = voice_key.split('/');
    const voice = {
        languageCode,
        name,
        ssmlGender
    };
    const request = {
        input,
        voice,
        audioConfig: { audioEncoding: 'MP3' }
    };
    console.log('VOICE', voice);
    const [ response ] = await client.synthesizeSpeech(request);
    return response.audioContent;
}

export async function mimicSynth(text, options) {
    if (!text) return;
    try {
        const audio = await getSynthAudio('mimic', text, options);
        await writeFile('output.wav', audio, 'binary');
        await exec('afplay output.wav');
    } catch (error) {
        console.log('error posting tts request', error);
    }
}

export async function googleSynth(text, options) {
    if (!text) return;
    const audio = await getSynthAudio('google', text, options);
    await writeFile('output.mp3', audio, 'binary');
    await exec('afplay output.mp3');
}

/*
import { Resemble } from '@resemble/node'
Resemble.setApiKey(process.env.RESEMBLE_API_KEY);
export async function resembleSynth(text, options) {
    if (!text) return;
    const response = await Resemble.v2.clips.createSync('c540ea60', {
        body: text,
        raw: true,
        voice_uuid: '66656fbc'
    });
    console.log(response);
    const { raw_audio } = response;
    await writeFile('output.mp3', raw_audio, 'binary');
    await exec('afplay output.mp3');
}
*/

export async function localSynth(text) {
    return spawn('say', [ '-v', 'Samantha', text ]);
}

export async function toSSML(content) {
    const completion = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [ ...ssmlPrompt, { role: 'user', content } ],
        n: 1,
        max_tokens: 1000,
        temperature: 1,
        frequency_penalty: 0,
        presence_penalty: 0
    });
    return completion?.data?.choices?.[0].content;
}

const elevenLabsAPI = 'https://api.elevenlabs.io/v1';

export async function getElevenSynthAudio(text, options) {
    const { voiceID, stability, similarityBoost, modelId } = setElevenDefaults(options);
    if (!voiceID || !text) throw new Error("ERR: Missing parameter");

    const stabilityValue = stability ? stability : 0;
    const similarityBoostValue = similarityBoost ? similarityBoost : 0;
    const response = await axios({
        method: 'POST',
        url: `${elevenLabsAPI}/text-to-speech/${voiceID}`,
        data: {
            text,
            voice_settings: {
                stability: stabilityValue,
                similarity_boost: similarityBoostValue,
            },
            model_id: modelId ? modelId : undefined,
        },
        headers: {
            Accept: 'audio/mpeg',
            'xi-api-key': process.env.ELEVEN_API_KEY,
            'Content-Type': 'application/json',
        },
        responseType: "stream",
    });
    return response.data;
}

export async function elevenSynth(text, options = {}) {
  return new Promise(async (resolve, reject) => {
    const audio = await getElevenSynthAudio(text, options);
    audio.on('end', async () => {
      await exec('afplay output.mp3');
      resolve();
    });
    audio.on('error', reject);
    audio.pipe(fs.createWriteStream('output.mp3'));
  });
}

// http https://api.elevenlabs.io/v1/voices 'xi-api-key:'

//console.log(await elevenSynth('This is a test. A good test. A test for all of time.', setElevenDefaults()));
