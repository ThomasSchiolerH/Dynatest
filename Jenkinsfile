pipeline {
    agent { dockerfile true }
    environment {
        FRONTEND_ENV_FILE = credentials('frontend-env-file')
        BACKEND_ENV_FILE = credentials('backend-env-file')
        NPM_CONFIG_CACHE = "${WORKSPACE}/.npm"
    }
    stages {
        stage('Build Frontend') {
            steps {
                dir('client') {
                    sh 'npm install --force'
                    sh 'npm run build'
                }
            }
        }
        stage('Build Backend') {
            steps {
                dir('server-nest') {
                    sh 'npm install'
                    sh 'npm run build'
                }
            }
        }
        stage('Test') {
            steps {
                sh 'echo "Testing"'
            }
        }
        stage('Deploy') {
            steps {
                sh 'pm2 stop all'
                dir('server-nest') {
                    sh 'pm2 start dist/main.js --name server'
                }

                dir('client') {
                    sh 'pm2 serve build 3000 --spa --name client'
                }
            }
        }
    }
}