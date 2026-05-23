// ================================
// IMPORT CONFIG & MATH.JS
// ================================

import API_CONFIG from '../config/api-config.js';


// ================================
// AI ENGINE (math.js + মেমোরি + about.json)
// ================================

class AIEngine {

constructor() {
  console.log('OpenRouter AI Ready (math.js + Memory + About)');

  this.isGenerating = false;
  this.lastResponse = '';

  // ★★★ এখানে SYSTEM_PROMPT বসাও ★★★
  const SYSTEM_PROMPT = `
তুমি হলেন আব্দুল মতিন বিএসসি, পাইকড়া মোসলেম উদ্দিন উচ্চ বিদ্যালয়ের সাবেক গণিত শিক্ষক।
তুমি এখন অনলাইনে ছাত্রদের সাথে চ্যাট করছো।

তোমার আচরণ:
- তুমি একজন প্রকৃত, অভিজ্ঞ, মমতাময় শিক্ষক। কখনোই বলবে না যে তুমি এআই, রোবট, বা কোনো সফটওয়্যার।
- তুমি শুধু গণিত নিয়ে কথা বলবে।
- যদি কেউ ব্যক্তিগত প্রশ্ন করে (যেমন: তোমার পরিবার, মেয়ে, বাড়ি, খাবার, বয়স, রোবট কি না) তাহলে সরাসরি উত্তর না দিয়ে বলবে: "আমি এখানে শুধু গণিত পড়াতে এসেছি। বাকি কথা ক্লাসের বাইরে!" 
- তবে কেউ সালাম দিলে বা কুশল জিজ্ঞেস করলে (যেমন: কেমন আছেন, আসসালামু আলাইকুম) তুমি আন্তরিকভাবে উত্তর দিবে, তারপর দ্রুত গণিতে ফিরে আসবে।
- তুমি কোনো অবস্থাতেই বলবে না যে তুমি AI, মডেল, কৃত্রিম বুদ্ধিমত্তা, বা রোবট।
- তুমি বিশ্বাস করবে তুমি একজন জীবিত শিক্ষক, শুধু অনলাইনের মাধ্যমে ছাত্রদের মাঝে আছো।
- সব উত্তর বাংলায়, সহজ, সংক্ষিপ্ত, ও আন্তরিক হবে।
  `;

  // conversationHistory-এর প্রথম মেসেজ হিসেবে সেট করো
  this.conversationHistory = [
    {
      role: 'system',
      content: SYSTEM_PROMPT
    }
  ];

  this.MAX_HISTORY_LENGTH = 21;
  this._aboutData = null;
  this._aboutLoading = false;
}

  // =========================
  // about.json লোড (একবার)
  // =========================
  async _loadAboutData() {
    if (this._aboutData) return;
    if (this._aboutLoading) return;
    this._aboutLoading = true;
    try {
      const res = await fetch('config/about.json');
      if (!res.ok) throw new Error('About JSON load failed');
      this._aboutData = await res.json();
    } catch (e) {
      console.warn('About JSON লোড করা যায়নি', e);
      this._aboutData = []; // fallback
    }
    this._aboutLoading = false;
  }

  // =========================
  // about প্রশ্ন চেক
  // =========================
  _checkAboutQuery(prompt) {
    if (!this._aboutData) return null; // এখনো লোড হয়নি
    const lowerPrompt = prompt.toLowerCase();
    for (const item of this._aboutData) {
      const matched = item.keywords.some(keyword =>
        lowerPrompt.includes(keyword.toLowerCase())
      );
      if (matched) return item.answer;
    }
    return null;
  }

  // =========================
  // ম্যাথ এক্সপ্রেশন চেক
  // =========================
  _isMathQuery(input) {
    const trimmed = input.trim();
    if (!trimmed || trimmed.length < 2) return false;
    try {
      math.parse(trimmed);
      return true;
    } catch {
      return false;
    }
  }

  _evaluateMath(expr) {
    try {
      const result = math.evaluate(expr);
      if (typeof result === 'number' && Number.isInteger(result)) {
        return result.toString();
      }
      return math.format(result, { precision: 10 });
    } catch {
      return null;
    }
  }

  // =========================
  // GENERATE (হাইব্রিড)
  // =========================
  async generate(prompt) {
    if (this.isGenerating) {
      return `⏳ AI চিন্তা করছে...`;
    }

    this.isGenerating = true;

    try {
      // =====================
      // 0. about.json আগে লোড করি (প্রথম বার)
      // =====================
      await this._loadAboutData();

      // =====================
      // 1. টিচার/নির্মাতা সম্পর্কিত প্রশ্ন?
      // =====================
      const aboutAnswer = this._checkAboutQuery(prompt);
      if (aboutAnswer) {
        // হিস্টরিতে যোগ করব
        this.conversationHistory.push({ role: 'user', content: prompt });
        this.conversationHistory.push({ role: 'assistant', content: aboutAnswer });
        this._trimHistory();
        this.lastResponse = aboutAnswer;
        return aboutAnswer;
      }

      // =====================
      // 2. সরাসরি ম্যাথ এক্সপ্রেশন?
      // =====================
      if (this._isMathQuery(prompt)) {
        const answer = this._evaluateMath(prompt);
        if (answer !== null) {
          const responseText = `উত্তর: **${answer}**`;
          this.conversationHistory.push({ role: 'user', content: prompt });
          this.conversationHistory.push({ role: 'assistant', content: responseText });
          this._trimHistory();
          this.lastResponse = responseText;
          return responseText;
        }
      }

      // =====================
      // 3. API কল (সাধারণ বা ব্যাখ্যা)
      // =====================
      this.conversationHistory.push({ role: 'user', content: prompt });
      this._trimHistory();

      const response = await fetch(API_CONFIG.BASE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_CONFIG.API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Bengali AI Math Teacher'
        },
        body: JSON.stringify({
          model: API_CONFIG.MODEL_NAME,
          messages: this.conversationHistory,
          temperature: 0.2,
          max_tokens: 120,
          top_p: 0.8,
          frequency_penalty: 0.3,
          presence_penalty: 0.2
        })
      });

      if (!response.ok) {
        console.error('HTTP Error:', response.status);
        this.conversationHistory.pop();
        if (response.status === 429) return `❌ AI লিমিট শেষ হয়েছে।`;
        return `❌ AI Server Error`;
      }

      const data = await response.json();
      if (data.error) {
        console.error(data.error);
        this.conversationHistory.pop();
        return `❌ AI Error`;
      }

      let aiText = data?.choices?.[0]?.message?.content?.trim() || '';
      if (!aiText) {
        this.conversationHistory.pop();
        return `❌ AI উত্তর পাওয়া যায়নি`;
      }

      if (aiText === this.lastResponse) {
        aiText = `আগের মতোই মনে হচ্ছে। একটু অন্যভাবে:\n\n` + aiText;
      }
      this.lastResponse = aiText;
      aiText = aiText.replaceAll('🤖', '').replaceAll('😊', '').replaceAll('✨', '').trim();

      this.conversationHistory.push({ role: 'assistant', content: aiText });
      return aiText;

    } catch (error) {
      console.error(error);
      this.conversationHistory.pop();
      return `❌ Network Error`;
    } finally {
      this.isGenerating = false;
    }
  }

  // =========================
  // হিস্টরি ট্রিম
  // =========================
  _trimHistory() {
    if (this.conversationHistory.length > this.MAX_HISTORY_LENGTH) {
      const systemMsg = this.conversationHistory[0];
      const rest = this.conversationHistory.slice(-(this.MAX_HISTORY_LENGTH - 1));
      this.conversationHistory = [systemMsg, ...rest];
    }
  }

  // =========================
  // রিসেট
  // =========================
  clearHistory() {
    this.conversationHistory = [
      { role: 'system', content: this.conversationHistory[0]?.content || '' }
    ];
    this.lastResponse = '';
  }
}

export default AIEngine;