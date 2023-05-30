FROM node:18 AS build
WORKDIR /usr/src/app
RUN apt update && apt install -y apt-transport-https ca-certificates sqlite3
COPY . .
RUN npm install
RUN npm run build
RUN npm rebuild better-sqlite3 --build-from-source

FROM node:18
ENV PORT=8889
ENV SQLITE_DB=/usr/src/app/db.sqlite
ENV PINECONE_INDEX=
ENV OPENAI_API_KEY=
ENV OPENAI_API_ORG=
ENV PINECONE_API_KEY=
ENV PINECONE_ENVIRONMENT=
ENV PICOVOICE_ACCESS_KEY=
ENV SERPAPI_API_KEY=
ENV SERPER_API_KEY=
ENV GOOGLE_API_KEY=
ENV GOOGLE_CSE_ID=
ENV WOLFRAM_ALPHA_APPID=
ENV RESEMBLE_API_KEY=
WORKDIR /usr/src/app
RUN apt update && apt install -y apt-transport-https ca-certificates sqlite3
COPY --from=build /usr/src/app .
EXPOSE 8889

CMD [ "node", "./lib/server.js" ]
