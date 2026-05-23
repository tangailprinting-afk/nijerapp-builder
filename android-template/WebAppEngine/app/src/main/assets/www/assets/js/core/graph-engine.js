// ================================
// GRAPH ENGINE
// ================================

class GraphEngine {

  constructor() {

    // =========================
    // CANVAS
    // =========================

    this.canvas =

      document.getElementById(
        'graphCanvas'
      );

    // =========================
    // GRAPH SECTION
    // =========================

    this.graphSection =

      document.getElementById(
        'graphSection'
      );

    // =========================
    // CHART
    // =========================

    this.chart = null;

    console.log(
      'Graph Engine Ready'
    );

  }

  // =========================
  // DETECT GRAPH
  // =========================

  isGraphExpression(text) {

    return (

      text.includes('y=')

      ||

      text.includes('y =')

    );

  }

  // =========================
  // SHOW GRAPH
  // =========================

  showGraph() {

    this.graphSection.style.display =
      'block';

  }

  // =========================
  // HIDE GRAPH
  // =========================

  hideGraph() {

    this.graphSection.style.display =
      'none';

  }

  // =========================
  // PLOT GRAPH
  // =========================

  plot(expression) {

    try {

      // =====================
      // SHOW GRAPH
      // =====================

      this.showGraph();

      // =====================
      // CLEAN EXPRESSION
      // =====================

      const eq =

        expression

          .replace('y=', '')

          .replace('y =', '')

          .trim();

      // =====================
      // DATA
      // =====================

      const labels = [];

      const values = [];

      // =====================
      // GENERATE POINTS
      // =====================

      for (

        let x = -10;

        x <= 10;

        x++

      ) {

        labels.push(x);

        const y =

          math.evaluate(

            eq,

            { x }

          );

        values.push(y);

      }

      // =====================
      // DESTROY OLD CHART
      // =====================

      if (this.chart) {

        this.chart.destroy();

      }

      // =====================
      // CREATE NEW CHART
      // =====================

      this.chart =

        new Chart(

          this.canvas,

          {

            type: 'line',

            data: {

              labels,

              datasets: [

                {

                  label:
                    expression,

                  data:
                    values,

                  borderColor:
                    '#3b82f6',

                  backgroundColor:
                    'rgba(59,130,246,0.15)',

                  borderWidth:
                    3,

                  pointRadius:
                    4,

                  pointBackgroundColor:
                    '#3b82f6',

                  tension:
                    0.3,

                  fill: true

                }

              ]

            },

            options: {

              responsive: true,

              maintainAspectRatio:
                false,

              animation: {

                duration:
                  1000

              },

              plugins: {

                legend: {

                  labels: {

                    color:
                      'white',

                    font: {

                      size:
                        14

                    }

                  }

                }

              },

              scales: {

                x: {

                  grid: {

                    color:
                      'rgba(255,255,255,0.08)'

                  },

                  ticks: {

                    color:
                      'white'

                  }

                },

                y: {

                  grid: {

                    color:
                      'rgba(255,255,255,0.08)'

                  },

                  ticks: {

                    color:
                      'white'

                  }

                }

              }

            }

          }

        );

    }

    // =========================
    // ERROR
    // =========================

    catch (error) {

      console.error(
        error
      );

      this.hideGraph();

    }

  }

}

export default GraphEngine;