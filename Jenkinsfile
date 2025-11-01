pipeline {
  agent any
  options { timestamps(); disableConcurrentBuilds() }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    // ★ 서버의 안전한 위치에 있는 .env.prod를 워크스페이스로 복사
    stage('Prepare .env') {
      steps {
        sh '''
          set -e
          SRC_ENV="/home/ubuntu/joying/.env.prod"
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
          docker compose up -d --no-deps backend nginx
        '''
      }
    }
  }

  post {
    success { echo '✅ Deploy completed' }
    failure { echo '❌ Deploy failed' }
  }
}
