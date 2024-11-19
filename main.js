const { AgCharts } = agCharts;

const options = {
  container: document.getElementById("myChart"),
  data: [
    { os: "Windows", share: 88.07 },
    { os: "macOS", share: 9.44 },
    { os: "Linux", share: 1.87 },
  ],
  series: [
    {
      type: "bar",
      xKey: "os",
      yKey: "share",
    },
  ],
  axes: [
    {
      type: "category",
      position: "bottom",
      title: {
        text: "Operating System",
      },
    },
    {
      type: "number",
      position: "left",
      title: {
        text: "Market Share (%)",
      },
      interval: { step: 20 },
    },
  ],
};

const chart = AgCharts.create(options);

function setStep(step) {
  const axis = options.axes?.[1];
  axis.interval = { step: step };
  chart.update(options);
}

function resetInterval() {
  const axis = options.axes?.[1];
  axis.interval = {};
  chart.update(options);
}