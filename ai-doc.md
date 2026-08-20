import OpenAI from 'openai';

const openai = new OpenAI({
baseURL: 'https://ai.liara.ir/api/6a86a34a2af3df68f74344f8/v1',
apiKey: '<LIARA_API_KEY>',
});

async function main() {
const completion = await openai.chat.completions.create({
model: 'z-ai/glm-5.3',
messages: [
{
role: 'user',
content: 'معنای زندگی چیست؟',
},
],
});

console.log(completion.choices[0].message);
}

main();
