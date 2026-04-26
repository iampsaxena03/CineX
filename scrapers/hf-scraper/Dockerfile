FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm install

COPY . .

RUN npx tsc

EXPOSE 7860

CMD ["node", "dist/index.js"]
