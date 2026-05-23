// ================================
// CHAT UI
// ================================

class ChatUI {

  constructor() {

    this.chatMessages =
      document.getElementById(
        'chatMessages'
      );

    this.typingElement =
      null;

  }

  // =========================
  // RENDER MARKDOWN + KATEX
  // =========================

  renderContent(content, text) {

    content.innerHTML =
      marked.parse(text);

    // =====================
    // KATEX RENDER
    // =====================

    renderMathInElement(

      content,

      {

        delimiters: [

          {
            left: '$$',
            right: '$$',
            display: true
          },

          {
            left: '$',
            right: '$',
            display: false
          }

        ]

      }

    );

  }

  // =========================
  // CREATE AI MESSAGE
  // =========================

  createAIMessage() {

    const message =
      document.createElement(
        'div'
      );

    message.classList.add(
      'message',
      'ai-message'
    );

    // =====================
    // AVATAR
    // =====================

    const avatar =
      document.createElement(
        'img'
      );

    avatar.src =
      'assets/icons/motin-sir.png';

    avatar.classList.add(
      'avatar'
    );

    // =====================
    // BODY
    // =====================

    const body =
      document.createElement(
        'div'
      );

    body.classList.add(
      'ai-body'
    );

    // =====================
    // NAME
    // =====================

    const name =
      document.createElement(
        'div'
      );

    name.classList.add(
      'teacher-name'
    );

    name.innerText =
      'মতিন স্যার';

    // =====================
    // CONTENT
    // =====================

    const content =
      document.createElement(
        'div'
      );

    content.classList.add(
      'message-content'
    );

    // =====================
    // APPEND
    // =====================

    body.appendChild(name);

    body.appendChild(content);

    message.appendChild(avatar);

    message.appendChild(body);

    return {
      message,
      content
    };

  }

  // =========================
  // ADD MESSAGE
  // =========================

  addMessage(text, type) {

    // =====================
    // USER
    // =====================

    if (type === 'user') {

      const message =
        document.createElement(
          'div'
        );

      message.classList.add(
        'message',
        'user-message'
      );

      const content =
        document.createElement(
          'div'
        );

      content.classList.add(
        'message-content'
      );

      this.renderContent(
        content,
        text
      );

      message.appendChild(
        content
      );

      this.chatMessages.appendChild(
        message
      );

    }

    // =====================
    // AI
    // =====================

    else {

      const ai =
        this.createAIMessage();

      this.renderContent(
        ai.content,
        text
      );

      this.chatMessages.appendChild(
        ai.message
      );

    }

    // =====================
    // SCROLL
    // =====================

    this.scrollBottom();

  }

  // =========================
  // STREAM MESSAGE
  // =========================

  async streamMessage(text, type) {

    // =====================
    // USER
    // =====================

    if (type === 'user') {

      this.addMessage(
        text,
        type
      );

      return;

    }

    // =====================
    // AI
    // =====================

    const ai =
      this.createAIMessage();

    this.chatMessages.appendChild(
      ai.message
    );

    // =====================
    // STREAMING
    // =====================

    let currentText = '';

    for (

      let i = 0;

      i < text.length;

      i++

    ) {

      currentText += text[i];

      this.renderContent(

        ai.content,

        currentText

      );

      this.scrollBottom();

      await new Promise(

        resolve =>

          setTimeout(
            resolve,
            8
          )

      );

    }

  }

  // =========================
  // SHOW TYPING
  // =========================

  showTyping() {

    this.removeTyping();

    const ai =
      this.createAIMessage();

    ai.content.classList.add(
      'typing'
    );

    ai.content.innerHTML = `

      <span></span>
      <span></span>
      <span></span>

    `;

    this.chatMessages.appendChild(
      ai.message
    );

    this.typingElement =
      ai.message;

    this.scrollBottom();

  }

  // =========================
  // REMOVE TYPING
  // =========================

  removeTyping() {

    if (
      this.typingElement
    ) {

      this.typingElement.remove();

      this.typingElement =
        null;

    }

  }

  // =========================
  // SCROLL
  // =========================

  scrollBottom() {

    this.chatMessages.scrollTop =

      this.chatMessages.scrollHeight;

  }

}

export default ChatUI;