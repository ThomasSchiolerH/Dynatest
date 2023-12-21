# LiRA-Map

## Development
#### Client
To start the client, type the following:
 - cd project_dyna
 - npm i
 - npm start

#### Server
To start the server, type the following:
 - cd server-nest
 - npm i
 - npm start
 
## Production
 - see DEPLOY.md or the handbook

## Env files
The frontend and backend run with the following information in the .env file.

#### Frontend:
    REACT_APP_BACKEND_URL_DEV = http://localhost:3002
    REACT_APP_BACKEND_URL_PROD = http://se2-x.compute.dtu.dk:3002

#### Backend:
    DB_LIRAMAP_HOST = se2-e.compute.dtu.dk
    DB_LIRAMAP_PORT = 5432
    DB_LIRAMAP_NAME = lira_map
    DB_LIRAMAP_USER = postgres
    DB_LIRAMAP_PASSWORD = hardpassword
    
    
    MINIO_ENDPOINT = se2-e.compute.dtu.dk
    MINIO_PORT = 9000
    MINIO_ACCESS_KEY = QegFTsmIIQj0dG7E1Hnz
    MINIO_SECRET_KEY = 25Wp3lOziIeX66kYPi6HmwWDHCMZj8KLB5itEBZm
    MINIO_BUCKET_NAME = 'road-pictures'