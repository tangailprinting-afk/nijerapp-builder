// ================================
// MEMORY SYSTEM
// ================================

class Memory {

  constructor() {

    // =========================
    // CHAT HISTORY
    // =========================

    this.messages = [];

    // =========================
    // MAX MEMORY
    // =========================

    this.maxMessages = 20;

    console.log(
      'Memory System Ready'
    );

  }

  // =========================
  // ADD MESSAGE
  // =========================

  addMessage(role, text) {

    this.messages.push({

      role,
      text

    });

    // =====================
    // LIMIT MEMORY
    // =====================

    if (

      this.messages.length >

      this.maxMessages

    ) {

      this.messages.shift();

    }

  }

  // =========================
  // GET CONTEXT
  // =========================

  getContext() {

    return this.messages

      .map(

        message =>

`
${message.role}:

${message.text}
`

      )

      .join('\n');

  }

  // =========================
  // CLEAR MEMORY
  // =========================

  clear() {

    this.messages = [];

  }

}

export default Memory;