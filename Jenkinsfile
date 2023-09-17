pipeline {
    agent docker { image 'node:16-alpine' }
    environment {
        FRONTEND_ENV_FILE = credentials('frontend-env-file')
        BACKEND_ENV_FILE = credentials('backend-env-file')
    }
    stages {
        gitlabBuilds(builds: ["buildFrontend", "buildBackend", "test", "deploy"]) {
            stage('Build Frontend') {
                gitlabCommitStatus("buildFrontend") {
                    steps {
                        sh 'npm install -g serve pm2'
                        script {
                            def frontendEnv = readFile(FRONTEND_ENV_FILE)
                            def envVars = frontendEnv.readLines().collectEntries {
                                def (key, value) = it.split('=')
                                [(key.trim()): value.trim()]
                            }

                            withEnv(envVars) {
                                sh '''
                                    cd client
                                    npm install
                                    npm run build
                                '''
                            }
                        }
                    }
                }
            }
            stage('Build Backend') {
                gitlabCommitStatus("buildBackend") {
                    steps {
                        script {
                            def backendEnv = readFile(BACKEND_ENV_FILE)
                            def envVars = backendEnv.readLines().collectEntries {
                                def (key, value) = it.split('=')
                                [(key.trim()): value.trim()]
                            }

                            withEnv(envVars) {
                                sh '''
                                    cd server-nest
                                    npm install
                                    npm run build
                                '''
                            }
                        }
                    }
                }
            }
            stage('Test') {
                gitlabCommitStatus("test") {
                    steps {
                        sh 'echo "Testing"'
                    }
                }
            }
            stage('Deploy') {
                gitlabCommitStatus("deploy") {
                    steps {
                        sh '''
                            cd server-nest
                            pm2 start dist/main.js --name server
                            cd ../client
                            pm2 serve build 3000 --spa --name client
                        '''
                    }
                }
            }
        }
    }
}