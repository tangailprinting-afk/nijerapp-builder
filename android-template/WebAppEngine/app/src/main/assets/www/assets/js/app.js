// ================================
// IMPORTS
// ================================

import GraphEngine from './core/graph-engine.js';
import PromptBuilder from './core/prompt-builder.js';
import ChatUI from './ui/chat-ui.js';
import MathEngine from './core/math-engine.js';
import AIEngine from './core/ai-engine.js';
import MemoryEngine from './core/memory-engine.js';


// ================================
// CHAT UI
// ================================

const chatUI = new ChatUI();


// ================================
// MATH ENGINE
// ================================

const mathEngine = new MathEngine();


// ================================
// AI ENGINE
// ================================

const aiEngine = new AIEngine();


// ================================
// GRAPH ENGINE
// ================================

const graphEngine = new GraphEngine();


// ================================
// PROMPT BUILDER
// ================================

const promptBuilder = new PromptBuilder();


// ================================
// MEMORY ENGINE
// ================================

const memoryEngine = new MemoryEngine();


// ================================
// ELEMENTS
// ================================

const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');


// ================================
// AI LOCK
// ================================

let isGenerating = false;


// ================================
// AI KEYWORDS
// ================================

const AI_KEYWORDS = [
  'বুঝাও', 'বুঝিনি', 'কেন', 'ব্যাখ্যা', 'explain', 'how', 'why',
  'ধাপে', 'step', 'প্রমাণ', 'সূত্র', 'কিভাবে', 'graph', 'গ্রাফ',
  'solve', 'সমাধান', 'বোঝাও', 'details', 'detail'
];


// ================================
// EXTRACT MATH EXPRESSION (নতুন হেল্পার)
// ================================
// পুরো টেক্সট থেকে $...$ বা ফাংশনের অংশ আলাদা করে নেয়
function extractMathExpression(text) {
  // $...$ দিয়ে ঘেরা কিছু থাকলে
  const dollarMatch = text.match(/\$(.+?)\$/);
  if (dollarMatch) {
    return dollarMatch[1].trim().replace(/\s+/g, '');
  }

  // y = ... বা f(x) = ... প্যাটার্ন
  const funcMatch = text.match(/(?:y|f\(x\))\s*=\s*([^\s,]+)/i);
  if (funcMatch) {
    return funcMatch[1].trim();
  }

  // শুধু x, সংখ্যা, অপারেটর থাকলে
  const exprMatch = text.match(/^[\d\sxX\+\-\*\/\^\(\)\.]+$/);
  if (exprMatch) {
    return text.trim();
  }

  // কোলন থাকলে তার পরের অংশ
  const colonMatch = text.match(/[:ঃ]\s*(.+)/);
  if (colonMatch) {
    const afterColon = colonMatch[1].trim().split(' ')[0];
    if (/^[\d\.xX]/.test(afterColon)) {
      return afterColon.replace(/\s/g, '');
    }
  }

  return null;
}


// ================================
// NEEDS AI
// ================================

function needsAI(text, context) {
  const lower = text.toLowerCase();

  const hasKeyword = AI_KEYWORDS.some(keyword =>
    lower.includes(keyword)
  );

  const followUps = ['কিভাবে', 'কেন', 'বুঝিনি', 'আবার', 'বোঝাও', 'explain', 'why', 'how'];
  const isFollowUp = followUps.includes(lower.trim());

  if (isFollowUp && context.length > 0) {
    return true;
  }

  if (text.length > 40) {
    return true;
  }

  return hasKeyword;
}


// ================================
// SIMPLE RESPONSE
// ================================

function createSimpleResponse(text, solution) {
  // এখন গ্রাফ চেক করার সময় extractMathExpression ব্যবহার করি
  const mathExpr = extractMathExpression(text);
  if (mathExpr && graphEngine.isGraphExpression(mathExpr)) {
    return `উত্তর:\n\n${text}\n\nনিচে graph দেখানো হয়েছে।`;
  }

  return `\n${solution.result}\n`;
}


// ================================
// SHOW GRAPH (আপডেটেড)
// ================================

function showGraphIfNeeded(text) {
  // প্রথমে গাণিতিক অংশ বের করি
  const mathExpr = extractMathExpression(text);
  if (!mathExpr) return; // গ্রাফ আঁকার মতো কিছু নেই

  // GraphEngine-কে শুধু এক্সপ্রেশনটা দিই
  if (graphEngine.isGraphExpression(mathExpr)) {
    graphEngine.plot(mathExpr);
  }
}


// ================================
// LOCK / UNLOCK UI
// ================================

function lockUI() {
  isGenerating = true;
  sendBtn.disabled = true;
  userInput.disabled = true;
}

function unlockUI() {
  isGenerating = false;
  sendBtn.disabled = false;
  userInput.disabled = false;
  userInput.focus();
}


// ================================
// SEND MESSAGE (মূল পরিবর্তন ছাড়াই)
// ================================

async function sendMessage() {
  if (isGenerating) return;

  const text = userInput.value.trim();
  if (!text) return;

  lockUI();

  try {
    chatUI.addMessage(text, 'user');
    memoryEngine.addMessage('Student', text);

    const conversationContext = memoryEngine.getContext();
    userInput.value = '';

    chatUI.showTyping();

    const solution = mathEngine.solve(text);
    const useAI = needsAI(text, conversationContext);

    if (solution.success && !useAI) {
      chatUI.removeTyping();
      const localResponse = createSimpleResponse(text, solution);
      await chatUI.streamMessage(localResponse, 'ai');
      showGraphIfNeeded(text);  // এখন এখানে error হবে না
      unlockUI();
      return;
    }

    const prompt = promptBuilder.build({
      userText: text,
      solution: solution.result,
      isMath: solution.success,
      context: conversationContext
    });

    await new Promise(resolve => setTimeout(resolve, 800));

    const aiResponse = await aiEngine.generate(prompt);
    chatUI.removeTyping();
    await chatUI.streamMessage(aiResponse, 'ai');
    showGraphIfNeeded(text);  // সুরক্ষিত
    memoryEngine.addMessage('Teacher', aiResponse);

  } catch (error) {
    console.error(error);
    chatUI.removeTyping();
    chatUI.addMessage('❌ App Error', 'ai');
  } finally {
    unlockUI();
  }
}


// ================================
// EVENT LISTENERS
// ================================

sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});


// ================================
// APP READY
// ================================

console.log('Offline Bengali AI Math Teacher Ready');