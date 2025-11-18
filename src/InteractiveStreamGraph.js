import React, { Component } from "react";
import * as d3 from "d3";

class InteractiveStreamGraph extends Component {
  componentDidUpdate() {
    const chartData = this.props.csvData;
    console.log("Rendering chart with data:", chartData);
    // Don't render if data is empty
    if (!chartData || chartData.length === 0) {
      return;
    }

    // Define the LLM model names to visualize
    const llmModels = ["GPT-4", "Gemini", "PaLM-2", "Claude", "LLaMA-3.1"];

    // Give the colors for each model in the visualization
    const colors = {
      "GPT-4": "#e41a1c",
      Gemini: "#377eb8",
      "PaLM-2": "#4daf4a",
      Claude: "#984ea3",
      "LLaMA-3.1": "#ff7f00"
    };

    // Write the D3.js code to create the interactive streamgraph visualization here
    const svg = d3.select(".svg_parent");
    const width = 600;
    const height = 500;
    const margin = { top: 40, right: 160, bottom: 60, left: 50 };

    svg.attr("width", width).attr("height", height);
    svg.selectAll("*").remove();

    const parseDate1 = d3.timeParse("%b-%y");
    const parseDate2 = d3.timeParse("%b %Y");

    const data = chartData
      .map((d) => {
        let date = parseDate1(d.Date) || parseDate2(d.Date);
        if (!date) {
          date = new Date(d.Date);
        }
        const obj = { date };
        llmModels.forEach((m) => {
          obj[m] = +d[m];
        });
        return obj;
      })
      .filter((d) => d.date);

    const x = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => d.date))
      .range([margin.left, width - margin.right]);

    // Stack
    const stack = d3
      .stack()
      .keys(llmModels)
      .offset(d3.stackOffsetWiggle)

    const layers = stack(data);

    // Compute y from stacked vals
    const y = d3
      .scaleLinear()
      .domain([
        d3.min(layers, (layer) => d3.min(layer, (d) => d[0])),
        d3.max(layers, (layer) => d3.max(layer, (d) => d[1])),
      ])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const xAxis = d3
      .axisBottom(x)
      .ticks(d3.timeMonth.every(1))
      .tickFormat(d3.timeFormat("%b"));

    const yAxis = d3.axisLeft(y).ticks(5);

    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "middle");

    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(yAxis.tickFormat("").tickSize(0));

    // Tooltip
    let tooltip = d3.select("#stream-tooltip");
    if (tooltip.empty()) {
      tooltip = d3
        .select("body")
        .append("div")
        .attr("id", "stream-tooltip")
        .style("position", "absolute")
        .style("pointer-events", "none")
        .style("background", "white")
        .style("border", "1px solid #ccc")
        .style("padding", "8px")
        .style("border-radius", "4px")
        .style("box-shadow", "0 2px 6px rgba(0,0,0,0.2)")
        .style("opacity", 0);
    }

    let tooltipSvg = tooltip.select("svg");
    if (tooltipSvg.empty()) {
      tooltipSvg = tooltip.append("svg");
    }

    const updateMiniChart = (model) => {
      const modelData = data.map((d) => ({
        date: d.date,
        value: d[model],
      }));

      const miniWidth = 220;
      const miniHeight = 150;
      const miniMargin = { top: 24, right: 10, bottom: 40, left: 35 };

      tooltipSvg.attr("width", miniWidth).attr("height", miniHeight);
      tooltipSvg.selectAll("*").remove();

      const monthFormatter = d3.timeFormat("%b");

      const xMini = d3
        .scaleBand()
        .domain(modelData.map((d) => monthFormatter(d.date)))
        .range([miniMargin.left, miniWidth - miniMargin.right])
        .padding(0.1);

      const yMini = d3
        .scaleLinear()
        .domain([0, d3.max(modelData, (d) => d.value) || 1])
        .nice()
        .range([miniHeight - miniMargin.bottom, miniMargin.top]);

      const xAxisMini = d3
        .axisBottom(xMini)
        .tickSizeOuter(0)
        .tickValues(
          xMini.domain().filter((d, i) =>
            modelData.length > 8 ? i % 2 === 0 : true
          )
        );

      const yAxisMini = d3.axisLeft(yMini).ticks(4);

      // x axis
      tooltipSvg
        .append("g")
        .attr("transform", `translate(0,${miniHeight - miniMargin.bottom})`)
        .call(xAxisMini)
        .selectAll("text")
        .style("text-anchor", "middle")
        .attr("transform", null);

      // y axis
      tooltipSvg
        .append("g")
        .attr("transform", `translate(${miniMargin.left},0)`)
        .call(yAxisMini);

      // bars
      tooltipSvg
        .append("g")
        .selectAll("rect")
        .data(modelData)
        .join("rect")
        .attr("x", (d) => xMini(monthFormatter(d.date)))
        .attr("y", (d) => yMini(d.value))
        .attr("width", xMini.bandwidth())
        .attr("height", (d) => yMini(0) - yMini(d.value))
        .attr("fill", colors[model]);

      // title
      tooltipSvg
        .append("text")
        .attr("x", miniWidth / 2)
        .attr("y", miniMargin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .text(model);
    };

    const area = d3
      .area()
      .x((d) => x(d.data.date))
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]))
      .curve(d3.curveCatmullRom);

    const layerGroup = svg.append("g");

    layerGroup
      .selectAll("path")
      .data(layers)
      .join("path")
      .attr("class", "stream-layer")
      .attr("fill", (layer) => colors[layer.key])
      .attr("d", area)
      .attr("opacity", 0.9)
      .on("mousemove", (event, layer) => {
        const model = layer.key;

        // Update tooltip position
        tooltip
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 80 + "px")
          .style("opacity", 1);

        // Re-draw the mini bar chart for this model
        updateMiniChart(model);
      })
      .on("mouseleave", () => {
        tooltip.style("opacity", 0);
      });

    // Legend
    const legend = svg
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - margin.right + 10}, ${margin.top})`);

    [...llmModels].reverse().forEach((model, i) => {
      const g = legend
        .append("g")
        .attr("transform", `translate(0, ${i * 24})`);

      g.append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", colors[model]);

      g.append("text")
        .attr("x", 24)
        .attr("y", 9)
        .attr("dy", "0.35em")
        .style("font-size", "12px")
        .text(model);
    });
  }

  render() {
    return (
      <svg style={{ width: 600, height: 500 }} className="svg_parent">

      </svg>
    );
  }
}

export default InteractiveStreamGraph;
