// ================================
// MATH ENGINE
// ================================

class MathEngine {

  constructor() {

    console.log(
      'Math Engine Ready'
    );

  }

  // =========================
  // SOLVE
  // =========================

  solve(expression) {

    try {

      // =====================
      // CLEAN
      // =====================

      const cleaned =

        expression

          .replace(/×/g, '*')

          .replace(/÷/g, '/')

          .replace(/\^/g, '^')

          .trim();

      // =====================
      // EVALUATE
      // =====================

      const result =

        math.evaluate(
          cleaned
        );

      // =====================
      // RETURN
      // =====================

      return {

        success: true,

        expression:
          cleaned,

        result

      };

    }

    catch (error) {

      return {

        success: false,

        error:
          'এই গণিতটি সমাধান করা যায়নি'

      };

    }

  }

}

export default MathEngine;