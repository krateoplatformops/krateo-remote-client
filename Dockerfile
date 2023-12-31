FROM bitnami/node
LABEL maintainer "Krateo <contact@krateoplatformops.io>"

ARG VERSION

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN yarn global add husky

# RUN npm install
# If you are building your code for production
RUN npm ci --only=production

# Bundle app source
COPY . .

RUN sed -i "s/VERSION/$VERSION/g" ./package.json

CMD [ "node", "index.js" ]