OP=op run --env-file .env --

install:
	npm install

dev:
	${OP} npm run dev

start:
	${OP} npm run start

ui:
	${OP} npm run ui

test:
	${OP} npm run test

build:
	${OP} npm run build

docker-up-build:
	${OP} docker compose up --build -d

docker-build:
	${OP} docker compose build

docker-up:
	${OP} docker compose up -d

docker-down:
	${OP} docker compose down

docker-mimic:
	${OP} docker compose up -d mimic3
