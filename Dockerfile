FROM node:18 AS build

ARG BASEURL=
ARG PICOVOICE_ACCESS_KEY=

WORKDIR /usr/src/app

RUN apt update && apt install -y apt-transport-https ca-certificates sqlite3

COPY ./package*.json ./
COPY ./ui/package*.json ./ui/

RUN npm install
RUN npm rebuild better-sqlite3 --build-from-source

COPY . .
RUN npm run build

FROM node:18 AS runtime

ENV PORT=80
ENV SQLITE_DB=/usr/src/data/db.sqlite
ENV OPENAI_API_KEY=
ENV OPENAI_API_ORG=
ENV PINECONE_API_KEY=
ENV PINECONE_ENVIRONMENT=
ENV PINECONE_INDEX=
ENV PICOVOICE_ACCESS_KEY=
ENV SERPAPI_API_KEY=
ENV GOOGLE_API_KEY=

WORKDIR /usr/src/app
RUN apt update && apt install -y apt-transport-https ca-certificates sqlite3
COPY --from=build /usr/src/app .
EXPOSE 80

CMD [ "node", "./lib/server.js" ]
