#!/usr/bin/env node

import cors from 'cors';
import express from 'express';

export async function createHttpServer() {

    const server = express();

    server.use(cors());
    server.use(express.json());

    return server;
}

export default {
    createHttpServer
};
