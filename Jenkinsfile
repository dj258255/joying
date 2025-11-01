pipeline {
  agent any
  options { timestamps(); disableConcurrentBuilds() }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Prepare .env') {
      steps {
        sh '''
          set -e
          SRC_ENV="/run/secrets/env.prod"
          if [ ! -f "$SRC_ENV" ]; then
            echo "[ERROR] $SRC_ENV 가 없습니다."; exit 1
          fi
          cp "$SRC_ENV" .env.prod
          echo "[INFO] .env.prod 준비 완료 (workspace=$(pwd))"
        '''
      }
    }

    stage('Docker Build') {
      steps {
        sh '''
          docker compose build backend nginx
        '''
      }
    }

    stage('Deploy (Compose Up)') {
      steps {
        sh '''
          set -e
          PROJ=/home/ubuntu/joying
          echo "[INFO] Deploying with compose at $PROJ"
          docker compose -f "$PROJ/docker-compose.yml" \
                         --project-directory "$PROJ" \
                         up -d --no-deps backend nginx
        '''
      }
    }
  } // <-- stages 블록 닫기!

  post {
    success { echo '✅ Deploy completed' }
    failure { echo '❌ Deploy failed' }
  }
} // <-- pipeline 블록 닫기!
