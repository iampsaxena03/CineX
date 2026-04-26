# Use an official Node.js runtime as a parent image
FROM node:22-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the TypeScript code
RUN npm run build

# Hugging Face Spaces route traffic to port 7860 by default for Docker Spaces
EXPOSE 7860

# Define environment variables
ENV PORT=7860

# Command to run the app
CMD ["npm", "start"]
