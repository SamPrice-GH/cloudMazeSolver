# Use an official Node.js runtime as a parent image
FROM node:18

# Set the working directory in the container
WORKDIR /app

# Copy the package.json and package-lock.json files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code (including .env)
COPY . .

# build react app
ENV PORT=3000

RUN npm run build
RUN npm install -g serve

EXPOSE ${PORT}

# Set the command to serve the app
CMD ["sh", "-c", "serve -s build -l ${PORT:-3000}"]
