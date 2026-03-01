--- 
name: start-video-meet-dev
description: Start Video Meet project for development environment
license: MIT
metadata:
  category: development
  source:
    repository: 'local'
    path: start-video-meet-dev
---

# Video Meet Development Setup

This skill helps start the Video Meet project for development purposes.

## About

Provides commands to setup and run the Video Meet project locally.

## Usage

Use this skill when you want to start developing on the Video Meet project .

### Steps

1. Check if api is running in docker containes
2. If api is not running, start the api with relevant docker compose command
3. Run the database migrations using api's container (docker compose exec api npm run migration:run)
4. Check if openvidu server is running in docker containes
5. If openvidu server is not running, start the openvidu server with relevant docker compose command
