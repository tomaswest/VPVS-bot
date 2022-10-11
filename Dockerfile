FROM zenika/alpine-chrome:101-with-node-16

COPY package*.json ./

USER root
RUN npm install

COPY . .

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD='true'
ENV PUPPETEER_EXECUTABLE_PATH='/usr/bin/chromium-browser'

EXPOSE 8080
ENV PORT 8080

CMD ["node", "index.js"]