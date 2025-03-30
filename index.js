import dotenv from "dotenv";
import TelegramBot from 'node-telegram-bot-api';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import axios from 'axios';

dotenv.config();

// Настройка Telegram-бота
const TELEGRAM_BOT_API_KEY = process.env.TELEGRAM_BOT_API_KEY;
const telegramBot = new TelegramBot(TELEGRAM_BOT_API_KEY, { polling: true });

const commands = [
  {
    command: "get_currency_uan_to_ruble",
    description: "Получить курс Юаня к Рублю"
  },
];
telegramBot.setMyCommands(commands);

// Настройка Canvas для Chart.js
const width = 800; // Ширина изображения
const height = 600; // Высота изображения
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

// Пример данных для графика
const chartConfig = {
  type: 'bar', // Тип графика (столбчатый)
  data: {
    labels: ['Январь', 'Февраль', 'Март', 'Апрель'],
    datasets: [{
      label: 'Продажи',
      data: [12, 19, 3, 5],
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      borderColor: 'rgba(75, 192, 192, 1)',
      borderWidth: 1
    }]
  },
  options: {
    scales: {
      y: {
        beginAtZero: true
      }
    }
  }
};

// Функция для генерации изображения графика
async function generateChart() {
  const imageBuffer = await chartJSNodeCanvas.renderToBuffer(chartConfig);
  return imageBuffer;
}

// Обработка команды /chart в Telegram
telegramBot.onText(/\/chart/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const chartImage = await generateChart();
    telegramBot.sendPhoto(chatId, chartImage, { caption: 'Вот твой график!' });
  } catch (error) {
    console.error(error);
    telegramBot.sendMessage(chatId, 'Ошибка при генерации графика.');
  }
});

// Запуск бота
console.log('Бот запущен...');