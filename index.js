import dotenv from "dotenv";
import TelegramBot from 'node-telegram-bot-api';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import moment from "moment";
import axios from 'axios';
import { parseStringPromise } from "xml2js";

dotenv.config();

const TELEGRAM_BOT_API_KEY = process.env.TELEGRAM_BOT_API_KEY;
const telegramBot = new TelegramBot(TELEGRAM_BOT_API_KEY, { polling: true });

telegramBot.setMyCommands([
  { command: "get_currency_uan_to_ruble", description: "Получить курс Юаня к Рублю" }
]);

const width = 800;
const height = 600;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

async function getCurrencyData() {
  let endDate = moment();
  let startDate = moment().subtract(5, 'days');
  let url = `https://cbr.ru/scripts/XML_dynamic.asp?date_req1=${startDate.format('DD/MM/YYYY')}&date_req2=${endDate.format('DD/MM/YYYY')}&VAL_NM_RQ=R01375`;
  
  try {
    const response = await axios.get(url, { responseType: "text" });
    const parsedData = await parseStringPromise(response.data);
    return parsedData.ValCurs.Record.map(record => ({
      date: moment(record.$.Date, "DD.MM.YYYY").format("DD.MM.YYYY (dddd)"),
      value: parseFloat(record.Value[0].replace(",", "."))
    }));
  } catch (error) {
    console.error("Ошибка при получении данных:", error);
    return null;
  }
}

async function generateChart(data) {
  const labels = data.map(entry => entry.date);
  const values = data.map(entry => entry.value);
  
  const chartConfig = {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Курс Юаня к Рублю',
        data: values,
        borderColor: '#003366',
        backgroundColor: 'rgba(0, 51, 102, 0.2)',
        borderWidth: 3,
        pointRadius: 5,
        pointBackgroundColor: '#003366',
        fill: true,
        tension: 0.4,
        datalabels: {
          align: 'top',
          anchor: 'end',
          font: {
            weight: 'bold',
            size: 14
          },
          color: '#003366',
          formatter: function(value) {
            return value.toFixed(4) + ' ₽';
          }
        }
      }]
    },
    options: {
      responsive: false,
      plugins: {
        legend: {
          labels: {
            font: {
              size: 14,
              weight: 'bold'
            },
            color: '#333'
          }
        }
      },
      scales: {
        x: {
          ticks: {
            font: {
              size: 12,
              weight: 'bold'
            },
            color: '#333'
          }
        },
        y: {
          ticks: {
            font: {
              size: 12,
              weight: 'bold'
            },
            color: '#333'
          }
        }
      }
    }
  };
  
  return await chartJSNodeCanvas.renderToBuffer(chartConfig);
}

async function generateSummary(data) {
  const first = data[0].value;
  const last = data[data.length - 1].value;
  const prevDay = data[data.length - 2].value;
  
  const difference5d = (last - first).toFixed(4);
  const difference1d = (last - prevDay).toFixed(4);
  
  const trend5d = difference5d > 0 ? "📈 вырос" : "📉 упал";
  const trend1d = difference1d > 0 ? "📈 вырос" : "📉 упал";
  
  const dailyChange = (difference5d / 5).toFixed(4);
  
  const forecast = (last + parseFloat(dailyChange)).toFixed(4);
  
  let summaryDescription = `\nКурс ${trend5d} за 5 дней на **${Math.abs(difference5d)} ₽**`;
  summaryDescription += `\nКурс ${trend1d} за 1 день на **${Math.abs(difference1d)} ₽**\n`;
  summaryDescription += `\nКурс на сегодня: **${last} ₽**\n`;
  summaryDescription += `\nПрогноз на завтра: **${forecast} ₽**`;
  
  return summaryDescription;
}

telegramBot.onText(/\/get_currency_uan_to_ruble/, async (msg) => {
  const chatId = msg.chat.id;
  const data = await getCurrencyData();
  
  if (!data) {
    telegramBot.sendMessage(chatId, "Ошибка при получении данных о курсе валют.");
    return;
  }
  
  const chartImage = await generateChart(data);
  const summaryText = await generateSummary(data);
  
  await telegramBot.sendPhoto(chatId, chartImage, {
    caption: `Взято с API https://cbr.ru/development/SXML/\n\nКурс Юаня\n\n${summaryText}`,
    parse_mode: "Markdown"
  });
});

console.log('Бот запущен...');
