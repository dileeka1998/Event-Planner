FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm i -g @nestjs/cli && npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build || npx nest build
EXPOSE 3000
CMD ["npm","run","start"]
