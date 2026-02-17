// src/service_helper/chart_generator.ts
import { createCanvas } from 'canvas';
import { Chart, registerables } from 'chart.js';
import fs from 'fs/promises';
import path from 'path';

// Register Chart.js components
Chart.register(...registerables);

export interface ChartData {
  labels: string[];
  data: number[];
  backgroundColor?: string[];
  label?: string;
}

export class ChartGenerator {
  private outputDir: string;

  constructor(outputDir: string = './public/charts') {
    this.outputDir = outputDir;
  }

  /**
   * Generate a pie chart
   */
  async generatePieChart(
    data: ChartData,
    title: string,
    filename: string
  ): Promise<string> {
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');

    new Chart(ctx as any, {
      type: 'pie',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.data,
          backgroundColor: data.backgroundColor || [
            '#28a745', // Green
            '#ffc107', // Yellow
            '#dc3545', // Red
            '#007bff', // Blue
            '#6c757d', // Gray
          ],
          borderWidth: 2,
          borderColor: '#fff',
        }]
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: title,
            font: { size: 20, weight: 'bold' },
            padding: { top: 10, bottom: 20 }
          },
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: { size: 12 }
            }
          }
        }
      }
    });

    return await this.saveChart(canvas, filename);
  }

  /**
   * Generate a bar chart
   */
  async generateBarChart(
    data: ChartData,
    title: string,
    filename: string,
    horizontal: boolean = false
  ): Promise<string> {
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');

    new Chart(ctx as any, {
      type: horizontal ? 'bar' : 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          label: data.label || 'Count',
          data: data.data,
          backgroundColor: data.backgroundColor || [
            '#667eea',
            '#764ba2',
            '#f093fb',
            '#4facfe',
          ],
          borderWidth: 2,
          borderColor: '#fff',
        }]
      },
      options: {
        indexAxis: horizontal ? 'y' : 'x',
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: title,
            font: { size: 20, weight: 'bold' },
            padding: { top: 10, bottom: 20 }
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              font: { size: 12 }
            }
          },
          x: {
            ticks: {
              font: { size: 12 }
            }
          }
        }
      }
    });

    return await this.saveChart(canvas, filename);
  }

  /**
   * Generate a line chart
   */
  async generateLineChart(
    data: ChartData,
    title: string,
    filename: string
  ): Promise<string> {
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');

    new Chart(ctx as any, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: data.label || 'Value',
          data: data.data,
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: '#667eea',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        }]
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: title,
            font: { size: 20, weight: 'bold' },
            padding: { top: 10, bottom: 20 }
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              font: { size: 12 }
            }
          },
          x: {
            ticks: {
              font: { size: 12 }
            }
          }
        }
      }
    });

    return await this.saveChart(canvas, filename);
  }

  /**
   * Generate a doughnut chart
   */
  async generateDoughnutChart(
    data: ChartData,
    title: string,
    filename: string
  ): Promise<string> {
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');

    new Chart(ctx as any, {
      type: 'doughnut',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.data,
          backgroundColor: data.backgroundColor || [
            '#28a745',
            '#ffc107',
            '#dc3545',
            '#007bff',
            '#6c757d',
          ],
          borderWidth: 2,
          borderColor: '#fff',
        }]
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: title,
            font: { size: 20, weight: 'bold' },
            padding: { top: 10, bottom: 20 }
          },
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: { size: 12 }
            }
          }
        }
      }
    });

    return await this.saveChart(canvas, filename);
  }

  /**
   * Save chart to file and return URL
   */
  private async saveChart(canvas: any, filename: string): Promise<string> {
    // Ensure output directory exists
    await fs.mkdir(this.outputDir, { recursive: true });

    const filepath = path.join(this.outputDir, filename);
    const buffer = canvas.toBuffer('image/png');
    
    await fs.writeFile(filepath, buffer);

    // Return URL path (relative to public folder)
    return `/charts/${filename}`;
  }

  /**
   * Generate base64 encoded chart (for embedding in HTML)
   */
  async generateChartBase64(
    type: 'pie' | 'bar' | 'line' | 'doughnut',
    data: ChartData,
    title: string
  ): Promise<string> {
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');

    const chartConfig: any = {
      type,
      data: {
        labels: data.labels,
        datasets: [{
          label: data.label,
          data: data.data,
          backgroundColor: data.backgroundColor,
        }]
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: title,
            font: { size: 20, weight: 'bold' }
          }
        }
      }
    };

    new Chart(ctx as any, chartConfig);

    return canvas.toDataURL('image/png').split(',')[1];
  }
}