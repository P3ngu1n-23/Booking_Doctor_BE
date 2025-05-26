FROM python:3.9-slim
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --omit=dev
COPY ai/requirements.txt ./ai/
RUN pip install --no-cache-dir -r ai/requirements.txt
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]