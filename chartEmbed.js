    var vlSpec = {
      $schema: "https://vega.github.io/schema/vega-lite/v5.json",
      description: "A simple bar chart with embedded data.",
      data: {
        values: [
          { category: "A", value: 28 },
          { category: "B", value: 55 },
          { category: "C", value: 43 },
          { category: "D", value: 91 },
          { category: "E", value: 81 },
          { category: "F", value: 53 },
          { category: "G", value: 19 },
          { category: "H", value: 87 },
        ],
      },
      mark: "bar",
      encoding: {
        x: { field: "category", type: "ordinal" },
        y: { field: "value", type: "quantitative" },
      },
    };

    vegaEmbed("#vis", vlSpec).then(function (result) {
      // Access the Vega View instance and parsed Vega spec if needed
      // var view = result.view;
    });